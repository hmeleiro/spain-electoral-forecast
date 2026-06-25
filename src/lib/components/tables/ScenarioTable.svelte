<script lang="ts">
  import type { PreviousProvinceResult, ProvinceEstimate } from '$lib/data/schema';
  import { formatPercent, formatSeats } from '$lib/utils/format';

  export let estimates: ProvinceEstimate[] = [];
  export let previousResults: PreviousProvinceResult[] = [];
  export let limit = 52;

  $: previousByProvinceParty = new Map(
    previousResults.map((result) => [`${result.provinceCode}:${result.party}`, result])
  );

  $: rows = Object.values(
    estimates
      .filter((estimate) => estimate.isElectoral)
      .reduce<Record<string, ProvinceEstimate[]>>((acc, estimate) => {
        acc[estimate.provinceCode] ??= [];
        acc[estimate.provinceCode].push(estimate);
        return acc;
      }, {})
  )
    .map((provinceRows) => {
      const sorted = provinceRows
        .slice()
        .sort(
          (a, b) =>
            (b.voteShareMean ?? -1) - (a.voteShareMean ?? -1) ||
            (b.seatsMean ?? -1) - (a.seatsMean ?? -1)
        );
      const winner = sorted[0];
      const runnerUp = sorted[1];

      return {
        provinceCode: winner?.provinceCode ?? '',
        provinceName: winner?.provinceName ?? '',
        winner,
        previousWinner: winner ? previousByProvinceParty.get(`${winner.provinceCode}:${winner.party}`) : undefined,
        runnerUp,
        previousRunnerUp: runnerUp ? previousByProvinceParty.get(`${runnerUp.provinceCode}:${runnerUp.party}`) : undefined
      };
    })
    .sort((a, b) => a.provinceCode.localeCompare(b.provinceCode))
    .slice(0, limit);

  function seatDelta(current: number | null | undefined, previous: number | null | undefined): string {
    if (current == null || previous == null) return '';
    const delta = Math.round(current) - Math.round(previous);
    if (delta === 0) return '=';
    return delta > 0 ? `+${delta}` : `${delta}`;
  }

  function deltaTone(delta: string): string {
    if (delta.startsWith('+')) return 'text-[#2166ac]';
    if (delta.startsWith('-')) return 'text-[#b2182b]';
    return 'text-[#6f6860]';
  }

  function seatTitle(previous: number | null | undefined, delta: string): string {
    return `23J: ${formatSeats(previous)}; diferencia: ${delta ? `${delta} esc.` : 'n/d'}`;
  }
</script>

<div class="overflow-x-auto">
  <table class="w-full border-collapse text-sm">
    <thead>
      <tr class="border-b border-[#c9c0b3] text-left text-xs uppercase tracking-wide text-[#6f6860]">
        <th class="py-2 pr-4">Provincia</th>
        <th class="py-2 pr-4">Primera fuerza</th>
        <th class="py-2 pr-4 text-right">Voto</th>
        <th class="py-2 pr-4 text-right">Esc.</th>
        <th class="py-2 pr-4">Segundo</th>
        <th class="py-2 text-right">Esc. segundo</th>
      </tr>
    </thead>
    <tbody>
      {#each rows as row}
        {@const winnerDelta = seatDelta(row.winner?.seatsMean, row.previousWinner?.seats)}
        {@const runnerUpDelta = seatDelta(row.runnerUp?.seatsMean, row.previousRunnerUp?.seats)}
        <tr class="border-b border-[#e6ded2]">
          <td class="py-2.5 pr-4 font-semibold text-[#171717]">{row.provinceName}</td>
          <td class="py-2.5 pr-4">
            <span class="inline-flex items-center gap-2">
              <span class="h-2.5 w-2.5 rounded-full" style={`background:${row.winner?.color}`}></span>
              {row.winner?.label}
            </span>
          </td>
          <td
            class="py-2.5 pr-4 text-right tabular-nums"
            title={`23J: ${formatPercent(row.previousWinner?.voteShare)}`}
          >
            {formatPercent(row.winner?.voteShareMean)}
          </td>
          <td class="py-2.5 pr-4 text-right tabular-nums" title={seatTitle(row.previousWinner?.seats, winnerDelta)}>
            {formatSeats(row.winner?.seatsMean)}
            {#if winnerDelta}
              (<span class={`ml-1 text-xs font-bold ${deltaTone(winnerDelta)}`}>{winnerDelta}</span>)
            {/if}
          </td>
          <td class="py-2.5 pr-4 text-[#5e5a54]">
            {#if row.runnerUp}
              <span class="inline-flex items-center gap-2">
                <span class="h-2.5 w-2.5 rounded-full" style={`background:${row.runnerUp.color}`}></span>
                {row.runnerUp.label}
              </span>
            {:else}
              n/d
            {/if}
          </td>
          <td class="py-2.5 text-right tabular-nums" title={seatTitle(row.previousRunnerUp?.seats, runnerUpDelta)}>
            {formatSeats(row.runnerUp?.seatsMean)}
            {#if runnerUpDelta}
              (<span class={`ml-1 text-xs font-bold ${deltaTone(runnerUpDelta)}`}>{runnerUpDelta}</span>)
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
