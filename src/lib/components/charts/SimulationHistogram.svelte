<script lang="ts">
  import { onMount } from 'svelte';
  import type { SeatDistribution } from '$lib/data/schema';
  import { formatPercent } from '$lib/utils/format';

  export let distributions: SeatDistribution[] = [];
  export let selectedParty = '';

  let container: HTMLDivElement;
  let mounted = false;
  let renderVersion = 0;
  let selected = selectedParty;

  $: if (distributions.length && !distributions.some((distribution) => distribution.party === selected)) {
    selected = selectedParty || distributions[0].party;
  }
  $: active = distributions.find((distribution) => distribution.party === selected) ?? distributions[0];
  $: renderToken = active
    ? `${selected}:${active.party}:${active.mean}:${active.buckets.map((bucket) => `${bucket.x0}-${bucket.x1}-${bucket.count}`).join('|')}`
    : '';

  async function render() {
    if (!mounted || !container || !active) return;
    const version = ++renderVersion;
    const Plot = await import('@observablehq/plot');
    if (version !== renderVersion) return;
    const width = Math.max(320, container.clientWidth);
    const total = active.buckets.reduce((sum, bucket) => sum + bucket.count, 0);
    const probabilityBuckets = active.buckets.map((bucket) => ({
      ...bucket,
      probability: total ? bucket.count / total : 0
    }));
    const xTicks = buildIntegerTicks(probabilityBuckets.map((bucket) => bucket.x0), probabilityBuckets.at(-1)?.x1);

    const chart = Plot.plot({
      width,
      height: 260,
      marginLeft: 46,
      marginRight: 18,
      marginTop: 12,
      marginBottom: 36,
      style: {
        fontFamily: 'var(--font-sans)'
      },
      x: {
        label: 'Escaños',
        grid: false,
        ticks: xTicks,
        tickFormat: (value: number) => value.toFixed(0)
      },
      y: {
        label: 'Probabilidad',
        grid: true,
        percent: true,
        tickFormat: (value: number) => formatPercent(value, 0)
      },
      marks: [
        Plot.rectY(probabilityBuckets, {
          x1: 'x0',
          x2: 'x1',
          y: 'probability',
          fill: active.color,
          inset: 1,
          title: (d) => `${d.x0} escanos: ${formatPercent(d.probability * 100, 1)}`
        }),
        Plot.ruleX([active.mean], { stroke: '#171717', strokeWidth: 2 })
      ]
    });

    if (version !== renderVersion) return;
    container.replaceChildren(chart);
  }

  function buildIntegerTicks(starts: number[], lastEnd: number | undefined): number[] {
    if (!starts.length) return [];
    const min = Math.min(...starts);
    const max = Math.max(...starts, (lastEnd ?? min) - 1);
    return Array.from({ length: Math.max(0, Math.round(max - min)) + 1 }, (_, index) => min + index);
  }

  onMount(() => {
    mounted = true;
    render();
    const observer = new ResizeObserver(render);
    observer.observe(container);
    return () => observer.disconnect();
  });

  $: if (mounted && renderToken) render();
</script>

<div class="mb-3 flex items-center justify-between gap-3">
  <div>
    <p class="text-sm font-bold text-[#171717]">{active?.label ?? 'Simulaciones'}</p>
    <p class="text-xs text-[#6f6860]">Linea vertical: media de escanos.</p>
  </div>
  {#if distributions.length > 1}
    <select bind:value={selected} class="rounded border border-[#c9c0b3] bg-white px-2 py-1 text-sm">
      {#each distributions as distribution}
        <option value={distribution.party}>{distribution.label}</option>
      {/each}
    </select>
  {/if}
</div>
<div bind:this={container} class="chart-frame min-h-64"></div>
