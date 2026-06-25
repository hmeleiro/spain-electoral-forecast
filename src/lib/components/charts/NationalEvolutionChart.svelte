<script lang="ts">
  import { NATIONAL_LEVEL_PARTIES } from '$lib/config/parties';
  import type { NationalTrendPoint } from '$lib/data/schema';
  import { formatNumber, formatPercent } from '$lib/utils/format';
  import { onMount } from 'svelte';

  export let points: NationalTrendPoint[] = [];
  export let parties: string[] = NATIONAL_LEVEL_PARTIES;

  let voteContainer: HTMLDivElement;
  let seatContainer: HTMLDivElement;
  let mounted = false;
  let renderVersion = 0;
  let mode: 'parties' | 'blocks' = 'parties';

  const blockDefinitions = [
    { id: 'right', label: 'Derecha', color: '#2878b8', parties: ['PP', 'VOX', 'UPN'] },
    { id: 'left', label: 'Izquierda', color: '#d73027', parties: ['PSOE', 'SUMAR', 'Podemos'] },
    // { id: 'regional', label: 'Territoriales', color: '#0d9488', parties: ['ERC', 'Junts', 'PNV', 'EH Bildu', 'BNG', 'CC'] }
  ];

  $: partyPoints = points
    .filter((point) => parties.includes(point.party))
    .map((point) => ({ ...point, dateValue: new Date(`${point.date}T00:00:00`) }));
  $: blockPoints = buildBlockPoints(points).map((point) => ({
    ...point,
    dateValue: new Date(`${point.date}T00:00:00`)
  }));
  $: chartPoints = mode === 'parties' ? partyPoints : blockPoints;
  $: activeSeries = mode === 'parties' ? parties : blockDefinitions.map((block) => block.id);
  $: voteEndLabels = repelEndLabels(chartPoints, activeSeries, 'voteShareMean', 2.5);
  $: seatEndLabels = repelEndLabels(chartPoints, activeSeries, 'seatsMean', mode === 'blocks' ? 15 : 14);
  $: renderToken = `${mode}:${chartPoints
    .map((point) => `${point.party}-${point.date}-${point.voteShareMean ?? ''}-${point.seatsMean ?? ''}`)
    .join('|')}`;

  async function render() {
    if (!mounted || !voteContainer || !seatContainer) return;
    const version = ++renderVersion;
    const Plot = await import('@observablehq/plot');
    if (version !== renderVersion) return;
    const width = Math.max(320, voteContainer.clientWidth);
    const common = {
      width,
      marginLeft: 42,
      marginRight: 96,
      marginTop: 18,
      marginBottom: 34,
      x: {
        type: 'time' as const,
        grid: true,
        label: null,
        tickFormat: (value: Date) => formatMonthYear(value.toISOString().slice(0, 10))
      },
      color: {
        domain: activeSeries,
        range: activeSeries.map((series) => chartPoints.find((point) => point.party === series)?.color ?? '#8f8b85')
      }
    };

    const voteChart = Plot.plot({
      ...common,
      height: 310,
      y: { grid: true, label: 'Voto estimado (%)' },
      marks: [
        Plot.ruleY([0]),
        Plot.areaY(chartPoints.filter((point) => point.voteShareLower != null && point.voteShareUpper != null), {
          x: 'dateValue',
          y1: 'voteShareLower',
          y2: 'voteShareUpper',
          z: 'party',
          fill: (d) => d.color,
          fillOpacity: 0.12
        }),
        Plot.lineY(chartPoints.filter((point) => point.voteShareMean != null), {
          x: 'dateValue',
          y: 'voteShareMean',
          z: 'party',
          stroke: (d) => d.color,
          strokeWidth: 2.4
        }),
        Plot.dot(chartPoints.filter((point) => point.voteShareMean != null), {
          x: 'dateValue',
          y: 'voteShareMean',
          stroke: (d) => d.color,
          fill: 'white',
          r: 2.6,
          title: voteTooltip,
          tip: true
        }),
        Plot.text(voteEndLabels, {
          x: 'dateValue',
          y: 'labelY',
          text: 'label',
          dx: 8,
          fill: (d) => d.color,
          fontWeight: 700,
          fontSize: 14,
          textAnchor: 'start'
        })
      ]
    });

    const seatChart = Plot.plot({
      ...common,
      height: 260,
      y: { grid: true, label: 'Escaños medios', tickFormat: (value: number) => formatNumber(value, 0) },
      marks: [
        Plot.ruleY([176], { stroke: '#2d5bff', strokeDasharray: '4 4' }),
        Plot.areaY(chartPoints.filter((point) => point.seatsLower != null && point.seatsUpper != null), {
          x: 'dateValue',
          y1: 'seatsLower',
          y2: 'seatsUpper',
          z: 'party',
          fill: (d) => d.color,
          fillOpacity: 0.12
        }),
        Plot.lineY(chartPoints.filter((point) => point.seatsMean != null), {
          x: 'dateValue',
          y: 'seatsMean',
          z: 'party',
          stroke: (d) => d.color,
          strokeWidth: 2.4
        }),
        Plot.dot(chartPoints.filter((point) => point.seatsMean != null), {
          x: 'dateValue',
          y: 'seatsMean',
          stroke: (d) => d.color,
          fill: 'white',
          r: 2.6,
          title: seatsTooltip,
          tip: true
        }),
        Plot.text(seatEndLabels, {
          x: 'dateValue',
          y: 'labelY',
          text: 'label',
          dx: 8,
          fill: (d) => d.color,
          fontWeight: 700,
          fontSize: 14,
          textAnchor: 'start'
        })
      ]
    });

    if (version !== renderVersion) return;
    voteContainer.replaceChildren(voteChart);
    seatContainer.replaceChildren(seatChart);
  }

  function latestDate(party: string): string {
    return chartPoints
      .filter((point) => point.party === party)
      .map((point) => point.date)
      .sort()
      .at(-1) ?? '';
  }

  function formatMonthYear(value: string): string {
    return new Intl.DateTimeFormat('es-ES', {
      month: 'short',
      year: 'numeric'
    }).format(new Date(`${value}T00:00:00`));
  }

  function intervalText(lower: number | null, upper: number | null, formatter: (value: number | null) => string): string {
    return lower == null || upper == null ? 'Intervalo: n/d' : `Intervalo: ${formatter(lower)} - ${formatter(upper)}`;
  }

  function voteTooltip(point: NationalTrendPoint): string {
    return `${point.label}
${formatMonthYear(point.date)}
Voto medio: ${formatPercent(point.voteShareMean, 1)}
${intervalText(point.voteShareLower, point.voteShareUpper, (value) => formatPercent(value, 1))}`;
  }

  function seatsTooltip(point: NationalTrendPoint): string {
    return `${point.label}
${formatMonthYear(point.date)}
Escaños medios: ${formatNumber(point.seatsMean, 0)}
${intervalText(point.seatsLower, point.seatsUpper, (value) => formatNumber(value, 0))}`;
  }

  function repelEndLabels(
    sourcePoints: Array<NationalTrendPoint & { dateValue: Date }>,
    seriesIds: string[],
    metric: 'voteShareMean' | 'seatsMean',
    minimumGap: number
  ): Array<NationalTrendPoint & { dateValue: Date; labelY: number }> {
    const values = sourcePoints
      .map((point) => point[metric])
      .filter((value): value is number => value != null && Number.isFinite(value));
    if (!values.length) return [];

    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const labels = seriesIds
      .map((series) =>
        sourcePoints
          .filter((point) => point.party === series && point[metric] != null)
          .sort((a, b) => a.date.localeCompare(b.date))
          .at(-1)
      )
      .filter((point): point is NationalTrendPoint & { dateValue: Date } => Boolean(point))
      .map((point) => ({ ...point, labelY: point[metric] ?? 0 }))
      .sort((a, b) => a.labelY - b.labelY);

    for (let index = 1; index < labels.length; index += 1) {
      if (labels[index].labelY - labels[index - 1].labelY < minimumGap) {
        labels[index].labelY = labels[index - 1].labelY + minimumGap;
      }
    }

    const overflow = labels.at(-1) ? labels.at(-1)!.labelY - maxValue : 0;
    if (overflow > 0) {
      labels.forEach((label) => {
        label.labelY -= overflow;
      });
    }

    for (let index = labels.length - 2; index >= 0; index -= 1) {
      if (labels[index + 1].labelY - labels[index].labelY < minimumGap) {
        labels[index].labelY = labels[index + 1].labelY - minimumGap;
      }
    }

    const underflow = labels[0] ? minValue - labels[0].labelY : 0;
    if (underflow > 0) {
      labels.forEach((label) => {
        label.labelY += underflow;
      });
    }

    return labels;
  }

  function buildBlockPoints(source: NationalTrendPoint[]): NationalTrendPoint[] {
    const grouped = new Map<string, NationalTrendPoint[]>();
    for (const point of source) {
      const rows = grouped.get(point.date) ?? [];
      rows.push(point);
      grouped.set(point.date, rows);
    }

    return [...grouped.entries()].flatMap(([date, rows]) =>
      blockDefinitions.map((block) => {
        const blockRows = rows.filter((row) => block.parties.includes(row.party));
        // The block mean is the sum of party-level means available in the trend file for that date.
        // It can differ slightly from simulation-derived block totals if upstream party means are rounded.
        return {
          date,
          party: block.id,
          label: block.label,
          color: block.color,
          voteShareMean: sumNullable(blockRows.map((row) => row.voteShareMean)),
          voteShareLower: sumNullable(blockRows.map((row) => row.voteShareLower)),
          voteShareUpper: sumNullable(blockRows.map((row) => row.voteShareUpper)),
          seatsMean: sumNullable(blockRows.map((row) => row.seatsMean)),
          seatsLower: sumNullable(blockRows.map((row) => row.seatsLower)),
          seatsUpper: sumNullable(blockRows.map((row) => row.seatsUpper)),
          isElectoral: true
        };
      })
    );
  }

  function sumNullable(values: Array<number | null>): number | null {
    const finite = values.filter((value): value is number => value != null && Number.isFinite(value));
    return finite.length ? finite.reduce((sum, value) => sum + value, 0) : null;
  }

  onMount(() => {
    mounted = true;
    render();
    const observer = new ResizeObserver(render);
    observer.observe(voteContainer);
    observer.observe(seatContainer);
    return () => observer.disconnect();
  });

  $: if (mounted && renderToken && voteEndLabels && seatEndLabels) render();
</script>

<div class="grid gap-6">
  <div class="flex justify-end">
    <div class="inline-flex rounded-md border border-[var(--color-border)] bg-white p-1 text-sm font-semibold">
      <button
        type="button"
        class:active={mode === 'parties'}
        on:click={() => (mode = 'parties')}
      >
        Partidos
      </button>
      <button
        type="button"
        class:active={mode === 'blocks'}
        on:click={() => (mode = 'blocks')}
      >
        Bloques
      </button>
    </div>
  </div>

  <div>
    <div class="mb-2 flex items-baseline justify-between gap-3">
      <h3 class="text-base font-semibold text-[var(--color-text)]">Evolucion de voto</h3>
    </div>
    <div bind:this={voteContainer} class="chart-frame min-h-80"></div>
  </div>

  <div>
    <div class="mb-2 flex items-baseline justify-between gap-3">
      <h3 class="text-base font-semibold text-[var(--color-text)]">Evolucion de escaños</h3>
      <p class="text-xs text-[var(--color-text-secondary)]">Linea discontinua: mayoria absoluta</p>
    </div>
    <div bind:this={seatContainer} class="chart-frame min-h-64"></div>
  </div>
</div>

<style>
  button {
    border-radius: 0.375rem;
    color: var(--color-text-secondary);
    padding: 0.35rem 0.75rem;
  }

  button.active {
    background: var(--color-accent);
    color: white;
  }
</style>
