<script lang="ts">
  import type { PartyEstimate, PreviousResult } from '$lib/data/schema';

  export let parties: PartyEstimate[] = [];
  export let showMajorityLine = true;
  export let previousResults: PreviousResult[] = [];

  const majority = 176;
  const leftPad = 86;
  const rightPad = 84;
  const topPad = 18;
  const bottomPad = 46;
  const rowHeight = 39;
  const chartWidth = 720;

  $: data = parties
    .filter((party) => party.isElectoral && party.seatsMean != null)
    .slice()
    .sort((a, b) => (b.seatsMean ?? 0) - (a.seatsMean ?? 0));
  $: previousByParty = new Map(previousResults.map((result) => [result.party, result]));
  $: chartHeight = Math.max(280, data.length * rowHeight + topPad + bottomPad);
  $: plotWidth = chartWidth - leftPad - rightPad;
  $: observedMax = Math.max(
    showMajorityLine ? majority : 1,
    ...data.map((party) => party.seatsInterval.upper ?? party.seatsMean ?? 0),
    ...previousResults.map((result) => result.seats ?? 0)
  );
  $: domainMax = showMajorityLine ? observedMax * 1.08 : Math.max(1, Math.ceil(observedMax));
  $: maxValue = showMajorityLine ? domainMax : domainMax + Math.max(0.25, domainMax * 0.05);
  $: x = (value: number | null | undefined) => leftPad + ((value ?? 0) / maxValue) * plotWidth;
  $: ticks = buildTicks(domainMax, showMajorityLine);

  function valueLabelX(value: number): number {
    return Math.min(chartWidth - 8, x(value) + 8);
  }

  function valueLabelAnchor(value: number): 'start' | 'end' {
    return x(value) + 8 > chartWidth - 8 ? 'end' : 'start';
  }

  function buildTicks(max: number, includeMajorityScale: boolean): number[] {
    if (includeMajorityScale) return [0, 50, 100, 150, majority].filter((tick) => tick <= max);

    const integerMax = Math.max(1, Math.ceil(max));
    if (integerMax <= 12) {
      return Array.from({ length: integerMax + 1 }, (_, index) => index);
    }

    const step = integerMax <= 40 ? 5 : 10;
    const ticks = Array.from({ length: Math.floor(integerMax / step) + 1 }, (_, index) => index * step);
    if (!ticks.includes(integerMax)) ticks.push(integerMax);
    return ticks;
  }
</script>

<div class="chart-frame overflow-x-auto">
  <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Proyeccion de escanos por partido">
    {#each ticks as tick}
      <line x1={x(tick)} x2={x(tick)} y1={topPad - 6} y2={chartHeight - bottomPad} stroke="#e5e7eb" />
      <text x={x(tick)} y={chartHeight - 24} text-anchor="middle" font-size="15">{tick.toFixed(0)}</text>
    {/each}

    {#if showMajorityLine}
      <line x1={x(majority)} x2={x(majority)} y1={topPad - 6} y2={chartHeight - bottomPad} stroke="#000000" stroke-dasharray="4 4" />
    {/if}

    <line x1={leftPad} x2={chartWidth - rightPad} y1={chartHeight - bottomPad} y2={chartHeight - bottomPad} stroke="#1a1a2e" />

    {#each data as party, index}
      {@const y = topPad + index * rowHeight + rowHeight / 2}
      {@const lower = party.seatsInterval.lower ?? party.seatsMean}
      {@const upper = party.seatsInterval.upper ?? party.seatsMean}
      {@const labelValue = Math.max(party.seatsMean ?? 0, upper ?? 0)}
      <text x={leftPad - 8} y={y + 4} text-anchor="end" font-size="18">{party.label}</text>
      <rect x={leftPad} y={y - 15} width={Math.max(1, x(party.seatsMean) - leftPad)} height="30" rx="2" fill={party.color} />
      <line x1={x(lower)} x2={x(upper)} y1={y} y2={y} stroke="#1a1a2e" stroke-opacity="0.55" stroke-width="1.6" />
      <line x1={x(lower)} x2={x(lower)} y1={y - 4} y2={y + 4} stroke="#1a1a2e" stroke-opacity="0.65" />
      <line x1={x(upper)} x2={x(upper)} y1={y - 4} y2={y + 4} stroke="#1a1a2e" stroke-opacity="0.65" />
      {#if previousByParty.get(party.party)?.seats != null}
        <line
          x1={x(previousByParty.get(party.party)?.seats)}
          x2={x(previousByParty.get(party.party)?.seats)}
          y1={y - 14.5}
          y2={y + 14.5}
          stroke="#171717"
          stroke-width="2.2"
          stroke-linecap="round" opacity="0.6"
        >
          <title>23J: {Math.round(previousByParty.get(party.party)?.seats ?? 0)} esc.</title>
        </line>
      {/if}
      <text x={valueLabelX(labelValue)} y={y + 5} text-anchor={valueLabelAnchor(labelValue)} font-size="15" font-weight="700">
        {Math.round(party.seatsMean ?? 0)}
      </text>
    {/each}

    <text x={chartWidth - rightPad - 5} y={chartHeight - -10} text-anchor="end" font-size="12">Escanos</text>
  </svg>
</div>
