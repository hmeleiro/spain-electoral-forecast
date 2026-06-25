<script lang="ts">
  import type { PartyEstimate, PreviousResult } from '$lib/data/schema';

  export let parties: PartyEstimate[] = [];
  export let previousResults: PreviousResult[] = [];

  const leftPad = 86;
  const rightPad = 84;
  const topPad = 18;
  const bottomPad = 34;
  const rowHeight = 39;
  const chartWidth = 720;

  $: data = parties
    .filter((party) => party.isElectoral && party.voteShareMean != null)
    .slice()
    .sort((a, b) => (b.voteShareMean ?? 0) - (a.voteShareMean ?? 0));
  $: previousByParty = new Map(previousResults.map((result) => [result.party, result]));
  $: chartHeight = Math.max(280, data.length * rowHeight + topPad + bottomPad);
  $: plotWidth = chartWidth - leftPad - rightPad;
  $: maxValue =
    Math.max(
      1,
      ...data.map((party) => party.voteShareInterval.upper ?? party.voteShareMean ?? 0),
      ...previousResults.map((result) => result.voteShare ?? 0)
    ) * 1.12;
  $: x = (value: number | null | undefined) => leftPad + ((value ?? 0) / maxValue) * plotWidth;
  $: ticks = Array.from({ length: 6 }, (_, index) => (maxValue / 5) * index);

  function valueLabelX(value: number): number {
    return Math.min(chartWidth - 8, x(value) + 8);
  }

  function valueLabelAnchor(value: number): 'start' | 'end' {
    return x(value) + 8 > chartWidth - 8 ? 'end' : 'start';
  }
</script>

<div class="chart-frame overflow-x-auto">
  <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Intencion de voto por partido">
    {#each ticks as tick}
      <line x1={x(tick)} x2={x(tick)} y1={topPad - 6} y2={chartHeight - bottomPad} stroke="#e5e7eb" />
      <text x={x(tick)} y={chartHeight - 10} text-anchor="middle" font-size="15">{tick.toFixed(0)}</text>
    {/each}

    <line x1={leftPad} x2={chartWidth - rightPad} y1={chartHeight - bottomPad} y2={chartHeight - bottomPad} stroke="#1a1a2e" />

    {#each data as party, index}
      {@const y = topPad + index * rowHeight + rowHeight / 2}
      {@const lower = party.voteShareInterval.lower ?? party.voteShareMean}
      {@const upper = party.voteShareInterval.upper ?? party.voteShareMean}
      {@const labelValue = Math.max(party.voteShareMean ?? 0, upper ?? 0)}
      {@const intervalY = y}
      <text x={leftPad - 8} y={y + 4} text-anchor="end" font-size="18">{party.label}</text>
      <rect x={leftPad} y={y - 15} width={Math.max(1, x(party.voteShareMean) - leftPad)} height="30" rx="2" fill={party.color} />
      <line x1={x(lower)} x2={x(upper)} y1={intervalY} y2={intervalY} stroke="#1a1a2e" stroke-opacity="0.55" stroke-width="1.6" />
      <line x1={x(lower)} x2={x(lower)} y1={intervalY - 4} y2={intervalY + 4} stroke="#1a1a2e" stroke-opacity="0.65" />
      <line x1={x(upper)} x2={x(upper)} y1={intervalY - 4} y2={intervalY + 4} stroke="#1a1a2e" stroke-opacity="0.65" />
      {#if previousByParty.get(party.party)?.voteShare != null}
        <line
          x1={x(previousByParty.get(party.party)?.voteShare)}
          x2={x(previousByParty.get(party.party)?.voteShare)}
          y1={y - 14.5}
          y2={y + 14.5}
          stroke="#171717"
          stroke-width="2.2"
          stroke-linecap="round" opacity="0.6"
        >
          <title>23J: {previousByParty.get(party.party)?.voteShare?.toFixed(1)}%</title>
        </line>
      {/if}
      <text x={valueLabelX(labelValue)} y={y + 5} text-anchor={valueLabelAnchor(labelValue)} font-size="15" font-weight="700">
        {party.voteShareMean?.toFixed(1)}%
      </text>
    {/each}

    <text x={chartWidth - rightPad-5} y={chartHeight - -20} text-anchor="end" font-size="12">Voto estimado (%)</text>
  </svg>
  
</div>
