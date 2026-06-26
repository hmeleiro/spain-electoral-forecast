<script lang="ts">
  import { getPartyConfig } from '$lib/config/parties';
  import type { ScenarioSummary } from '$lib/data/schema';
  import { formatNumber, formatPercent } from '$lib/utils/format';

  export let scenarios: ScenarioSummary[] = [];

  type TitlePiece = {
    text: string;
    color?: string;
  };

  function titlePieces(scenario: ScenarioSummary): TitlePiece[] {
    if (scenario.id === 'incumbent') {
      const psoe = getPartyConfig('PSOE');
      const sumar = getPartyConfig('SUMAR');
      return [
        { text: psoe.label, color: psoe.color }, {text: ' + '},
        { text: sumar.label, color: sumar.color },
        { text: ' + aliados investidura' }
      ];
    }

    return scenario.parties.flatMap((party, index) => {
      const config = getPartyConfig(party);
      const pieces: TitlePiece[] = [];
      if (index > 0) pieces.push({ text: ' + ' });
      pieces.push({ text: config.label, color: config.color });
      return pieces;
    });
  }

  function percentOrDash(value: number | null | undefined): string {
    return value == null ? '-' : formatPercent(value * 100, 0);
  }

  function numberOrDash(value: number | null | undefined): string {
    return value == null ? '-' : formatNumber(value, 0);
  }
</script>

<div class="grid h-full gap-4 md:grid-cols-2">
  {#each scenarios as scenario}
    <article class="panel flex h-full flex-col justify-between p-5">
      <div>
        <p class="text-sm font-bold text-[var(--color-text)]">
          {#each titlePieces(scenario) as piece}
            <span style={piece.color ? `color: ${piece.color};` : undefined}>{piece.text}</span>
          {/each}
        </p>

        <p class="mt-2 text-5xl font-bold tracking-tight text-[var(--color-text)]">
          {percentOrDash(scenario.majorityProbability)}
        </p>
                  <p class="mt-2 text-xs text-[var(--color-text-secondary)]">
            Prob. mayoría absoluta
          </p>
      </div>

      <p class="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">
        {numberOrDash(scenario.seatsMean)} escaños
        [{numberOrDash(scenario.seatsMin)}-{numberOrDash(scenario.seatsMax)}]
      </p>
    </article>
  {/each}
</div>
