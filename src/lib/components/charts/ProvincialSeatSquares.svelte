<script lang="ts">
  import { getPartyConfig } from '$lib/config/parties';
  import type { PreviousProvinceResult, ProvinceEstimate } from '$lib/data/schema';

  export let estimates: ProvinceEstimate[] = [];
  export let previousResults: PreviousProvinceResult[] = [];
  export let variant: 'summary' | 'matrix' = 'summary';

  type SeatStatus = 'held' | 'gained' | 'down';

  type SeatSquare = {
    key: string;
    party: string;
    label: string;
    color: string;
    provinceCode: string;
    provinceName: string;
    index: number;
    currentSeats: number;
    previousSeats: number | null;
    status: SeatStatus;
  };

  type SeatGroup = {
    id: string;
    label: string;
    color: string;
    textColor: string;
    parties: string[];
    total: number;
    squares: SeatSquare[];
  };

  type ProvinceRow = {
    code: string;
    name: string;
    total: number;
    groups: SeatGroup[];
  };

  const CORE_PARTIES = ['SUMAR', 'PSOE', 'PP', 'VOX'];
  const OTHER_GROUP = {
    id: 'OTROS',
    label: 'OTROS',
    color: '#c3c7cc',
    textColor: '#ffffff'
  };

  $: previousByProvinceParty = new Map(
    previousResults.map((result) => [`${result.provinceCode}:${result.party}`, result])
  );
  $: normalizedRows = estimates.filter((estimate) => estimate.isElectoral);
  $: groupDefinitions = buildGroupDefinitions(normalizedRows);
  $: groups = buildGroups(normalizedRows, previousByProvinceParty);
  $: provinceRows = buildProvinceRows(normalizedRows, previousByProvinceParty);
  $: gridTemplate = `minmax(112px, 0.9fr) repeat(${groupDefinitions.length}, minmax(116px, 1fr))`;

  function buildGroupDefinitions(rows: ProvinceEstimate[]) {
    const seenParties = new Set(rows.map((row) => row.party));
    const coreGroups = CORE_PARTIES.map((party) => {
      const config = getPartyConfig(party);
      return {
        id: config.id,
        label: config.label.toUpperCase(),
        color: config.color,
        textColor: config.textColor ?? '#ffffff',
        parties: [config.id]
      };
    });

    const otherParties = [...seenParties]
      .filter((party) => !CORE_PARTIES.includes(party))
      .sort((a, b) => a.localeCompare(b));

    return [...coreGroups, { ...OTHER_GROUP, parties: otherParties }];
  }

  function buildGroups(rows: ProvinceEstimate[], previousLookup: Map<string, PreviousProvinceResult>) {
    return groupDefinitions.map((definition) => {
      const squares = rows
        .filter((row) => definition.parties.includes(row.party))
        .sort(sortProvincePartyRows)
        .flatMap((row) => makeSeatSquares(row, previousLookup));
      const total = currentSeatTotal(rows.filter((row) => definition.parties.includes(row.party)));

      return {
        ...definition,
        total,
        squares
      };
    });
  }

  function buildProvinceRows(rows: ProvinceEstimate[], previousLookup: Map<string, PreviousProvinceResult>): ProvinceRow[] {
    const byProvince = rows.reduce<Record<string, ProvinceEstimate[]>>((acc, row) => {
      acc[row.provinceCode] ??= [];
      acc[row.provinceCode].push(row);
      return acc;
    }, {});

    return Object.entries(byProvince)
      .map(([code, provinceRows]) => {
        const groups = groupDefinitions.map((definition) => {
          const squares = provinceRows
            .filter((row) => definition.parties.includes(row.party))
            .sort(sortPartyRows)
            .flatMap((row) => makeSeatSquares(row, previousLookup));
          const total = currentSeatTotal(provinceRows.filter((row) => definition.parties.includes(row.party)));

          return {
            ...definition,
            total,
            squares
          };
        });

        return {
          code,
          name: provinceRows[0]?.provinceName ?? code,
          total: groups.reduce((sum, group) => sum + group.total, 0),
          groups
        };
      })
      .sort((a, b) => a.code.localeCompare(b.code));
  }

  function makeSeatSquares(row: ProvinceEstimate, previousLookup: Map<string, PreviousProvinceResult>): SeatSquare[] {
    const currentSeats = Math.max(0, Math.round(row.seatsMean ?? 0));
    const previousSeats = previousLookup.get(`${row.provinceCode}:${row.party}`)?.seats ?? null;
    const roundedPrevious = previousSeats == null ? null : Math.max(0, Math.round(previousSeats));
    const displaySeats = roundedPrevious == null ? currentSeats : Math.max(currentSeats, roundedPrevious);

    return Array.from({ length: displaySeats }, (_, index) => {
      const status: SeatStatus =
        index >= currentSeats ? 'down' : roundedPrevious != null && index >= roundedPrevious ? 'gained' : 'held';

      return {
        key: `${row.provinceCode}:${row.party}:${index}`,
        party: row.party,
        label: row.label,
        color: row.color,
        provinceCode: row.provinceCode,
        provinceName: row.provinceName,
        index: index + 1,
        currentSeats,
        previousSeats: roundedPrevious,
        status
      };
    });
  }

  function currentSeatTotal(rows: ProvinceEstimate[]): number {
    return rows.reduce((sum, row) => sum + Math.max(0, Math.round(row.seatsMean ?? 0)), 0);
  }

  function sortProvincePartyRows(a: ProvinceEstimate, b: ProvinceEstimate) {
    return a.provinceCode.localeCompare(b.provinceCode) || sortPartyRows(a, b);
  }

  function sortPartyRows(a: ProvinceEstimate, b: ProvinceEstimate) {
    return (
      (b.seatsMean ?? -1) - (a.seatsMean ?? -1) ||
      (b.voteShareMean ?? -1) - (a.voteShareMean ?? -1) ||
      a.party.localeCompare(b.party)
    );
  }

  function squareTitle(square: SeatSquare): string {
    const previousText = square.previousSeats == null ? 'n/d' : `${square.previousSeats}`;
    const delta =
      square.previousSeats == null
        ? 'n/d'
        : `${square.currentSeats - square.previousSeats > 0 ? '+' : ''}${square.currentSeats - square.previousSeats}`;

    const seatText =
      square.status === 'down'
        ? `escano perdido ${square.index - square.currentSeats}/${Math.max(0, (square.previousSeats ?? 0) - square.currentSeats)}`
        : `escano ${square.index}/${square.currentSeats}`;

    return `${square.provinceName}: ${square.label}, ${seatText}. 23J: ${previousText}; diferencia: ${delta}`;
  }
</script>

{#if variant === 'summary'}
  <div class="seat-summary" role="img" aria-label="Escanos por partido en cuadrados">
    {#each groups as group}
      <article class="seat-party">
        <div
          class="seat-party__header"
          style={`background:${group.color};color:${group.textColor}`}
          title={`${group.label}: ${group.total} escanos`}
        >
          <span>{group.label}: {group.total}</span>
        </div>
        <div class="seat-squares">
          {#each group.squares as square (square.key)}
            <span
              class:seat-square--gained={square.status === 'gained'}
              class:seat-square--down={square.status === 'down'}
              class="seat-square"
              style={`--seat-color:${square.color}`}
              title={squareTitle(square)}
            ></span>
          {/each}
        </div>
      </article>
    {/each}
  </div>
{:else}
  <div class="seat-matrix-wrap" role="img" aria-label="Escanos por provincia y partido en cuadrados">
    <div class="seat-matrix" style={`--seat-grid:${gridTemplate}`}>
      <div class="seat-matrix__head seat-matrix__province">Provincia</div>
      {#each groups as group}
        <div
          class="seat-matrix__head"
          style={`background:${group.color};color:${group.textColor}`}
          title={`${group.label}: ${group.total} escanos`}
        >
          {group.label}: {group.total}
        </div>
      {/each}

      {#each provinceRows as province}
        <div class="seat-matrix__province">
          <span>{province.name}</span>
          <strong>{province.total}</strong>
        </div>
        {#each province.groups as group}
          <div class="seat-matrix__cell" title={`${province.name}: ${group.total} escanos para ${group.label}`}>
            {#each group.squares as square (square.key)}
              <span
                class:seat-square--gained={square.status === 'gained'}
                class:seat-square--down={square.status === 'down'}
                class="seat-square"
                style={`--seat-color:${square.color}`}
                title={squareTitle(square)}
              ></span>
            {/each}
          </div>
        {/each}
      {/each}
    </div>
  </div>
{/if}

<style>
  .seat-summary {
    display: grid;
    grid-template-columns: repeat(5, minmax(112px, 1fr));
    gap: 10px;
  }

  .seat-party {
    min-width: 0;
  }

  .seat-party__header,
  .seat-matrix__head {
    min-height: 28px;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    padding: 4px 8px;
    font-size: 0.95rem;
    font-weight: 800;
    line-height: 1.15;
    text-align: left;
    white-space: nowrap;
  }

  .seat-squares {
    display: grid;
    grid-template-columns: repeat(10, minmax(0, 1fr));
    justify-content: start;
    align-content: flex-start;
    gap: 4px;
    min-height: 28px;
    padding: 10px 0 0;
  }

  .seat-square {
    width: 100%;
    aspect-ratio: 1;
    background: var(--seat-color);
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
  }

  .seat-square--gained {
    box-shadow:
      inset 0 0 0 2px rgba(0, 0, 0, 0.58),
      0 0 0 1px rgba(255, 255, 255, 0.75);
  }

  .seat-square--down {
    opacity: 0.42;
  }

  .seat-matrix-wrap {
    overflow-x: auto;
  }

  .seat-matrix {
    display: grid;
    grid-template-columns: var(--seat-grid);
    min-width: 900px;
    gap: 1px;
    background: var(--color-border);
    border: 1px solid var(--color-border);
  }

  .seat-matrix__head,
  .seat-matrix__province,
  .seat-matrix__cell {
    background-clip: padding-box;
  }

  .seat-matrix__province {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 32px;
    padding: 5px 8px;
    background: #ffffff;
    color: var(--color-text);
    font-size: 0.78rem;
    font-weight: 700;
    line-height: 1.15;
  }

  .seat-matrix__province strong {
    color: var(--color-text-secondary);
    font-size: 0.72rem;
  }

  .seat-matrix__cell {
    display: grid;
    grid-template-columns: repeat(10, minmax(0, 1fr));
    justify-content: start;
    align-content: center;
    gap: 3px;
    min-height: 32px;
    padding: 5px 6px;
    background: #ffffff;
  }

  @media (max-width: 760px) {
    .seat-summary {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .seat-party:last-child {
      grid-column: 1 / -1;
    }
  }
</style>
