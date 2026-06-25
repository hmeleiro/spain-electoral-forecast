import { getAvailablePartiesFromRows, getPartyConfig, isElectoralParty } from '$lib/config/parties';
import { getProvinceName } from '$lib/data/provinces';
import type {
  ModelMetadata,
  NationalEstimate,
  NationalTrendPoint,
  PartyEstimate,
  FirstForceProbability,
  PreviousProvinceResult,
  PreviousResult,
  NationalScenarioSummary,
  ProvinceEstimate,
  ProvinceMapCollection,
  ProvinceMapFeature,
  RawFirstForceProbabilityRow,
  RawNationalEstimateRow,
  RawNationalScenarioRow,
  RawNationalSimulationRow,
  RawPreviousProvinceResultRow,
  RawPreviousResultRow,
  RawProvinceEstimateRow,
  ScenarioSummary,
  SeatDistribution,
  SimulationResult
} from '$lib/data/schema';
import { winnerVoteShareColor } from '$lib/utils/colors';
import { extent, integerHistogram, mean } from '$lib/utils/stats';

export const SOURCE_FILES = {
  nationalEstimates: 'estimaciones_nacionales.parquet',
  provinceEstimates: 'estimaciones_provinciales.parquet',
  nationalScenarios: 'escenarios_nacionales.parquet',
  firstForceProbabilities: 'first_force_probability.parquet',
  nationalSimulations: 'simulaciones_nacionales.parquet',
  previousNationalResults: 'results_prev.parquet',
  previousProvinceResults: 'results_prev_prov.parquet'
};

const SCENARIO_DEFINITIONS = [
  { id: 'right', sourceIds: ['Derecha', 'right'], label: 'PP + VOX + UPN + SALF', parties: ['PP', 'VOX', 'UPN', 'SALF'] },
  {
    id: 'incumbent',
    sourceIds: ['Izquierda', 'incumbent'],
    label: 'PSOE + Sumar + aliados investidura',
    parties: ['PSOE', 'SUMAR', 'Podemos', 'ERC', 'Junts', 'EH Bildu', 'BNG', 'PNV']
  }
];

export function dateToString(value: unknown): string {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString().slice(0, 10);
  if (value && typeof value === 'object') {
    const maybeObject = value as Record<string, unknown>;
    if (typeof maybeObject.toString === 'function') {
      const text = maybeObject.toString();
      if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
    }
  }
  if (typeof value === 'number') {
    const epoch = new Date(Date.UTC(1970, 0, 1));
    epoch.setUTCDate(epoch.getUTCDate() + value);
    return epoch.toISOString().slice(0, 10);
  }
  return `${value ?? ''}`.slice(0, 10);
}

function numberOrNull(value: unknown): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizePartyEstimate(row: RawNationalEstimateRow): PartyEstimate {
  const config = getPartyConfig(row.partido);

  return {
    party: config.id,
    label: config.label,
    color: config.color,
    votesMean: numberOrNull(row.votos_m),
    voteShareMean: numberOrNull(row.pct_m),
    seatsMean: numberOrNull(row.seats_m),
    votesInterval: {
      lower: numberOrNull(row.votos_lwr),
      upper: numberOrNull(row.votos_upr)
    },
    voteShareInterval: {
      lower: numberOrNull(row.pct_lwr),
      upper: numberOrNull(row.pct_upr)
    },
    seatsInterval: {
      lower: numberOrNull(row.seats_lwr),
      upper: numberOrNull(row.seats_upr)
    },
    isElectoral: isElectoralParty(row.partido)
  };
}

export function normalizeNationalEstimate(rows: RawNationalEstimateRow[], date?: string): NationalEstimate {
  const parties = rows
    .map(normalizePartyEstimate)
    .sort((a, b) => (b.voteShareMean ?? -1) - (a.voteShareMean ?? -1) || (b.seatsMean ?? -1) - (a.seatsMean ?? -1));

  return {
    date: date ?? dateToString(rows[0]?.fecha),
    parties
  };
}

export function normalizeNationalTrendRows(rows: RawNationalEstimateRow[]): NationalTrendPoint[] {
  return rows
    .map((row) => {
      const estimate = normalizePartyEstimate(row);
      return {
        date: dateToString(row.fecha),
        party: estimate.party,
        label: estimate.label,
        color: estimate.color,
        voteShareMean: estimate.voteShareMean,
        voteShareLower: estimate.voteShareInterval.lower,
        voteShareUpper: estimate.voteShareInterval.upper,
        seatsMean: estimate.seatsMean,
        seatsLower: estimate.seatsInterval.lower,
        seatsUpper: estimate.seatsInterval.upper,
        isElectoral: estimate.isElectoral
      };
    })
    .filter((row) => row.isElectoral)
    .sort((a, b) => a.date.localeCompare(b.date) || a.party.localeCompare(b.party));
}

export function normalizeNationalScenarioRows(rows: RawNationalScenarioRow[]): NationalScenarioSummary[] {
  return rows
    .map((row) => {
      const definition = getScenarioDefinition(row.scenario_id);
      return {
        date: dateToString(row.fecha),
        id: definition.id,
        label: definition.label,
        parties: definition.parties,
        seatsMean: numberOrNull(row.seats_median),
        seatsMin: numberOrNull(row.seats_min),
        seatsMax: numberOrNull(row.seats_max),
        majorityProbability: numberOrNull(row.majority_probability)
      };
    })
    .sort((a, b) => scenarioSortOrder(a.id) - scenarioSortOrder(b.id));
}

export function normalizeFirstForceProbabilityRows(rows: RawFirstForceProbabilityRow[]): FirstForceProbability[] {
  return rows
    .map((row) => {
      const config = getPartyConfig(row.partido);
      return {
        date: dateToString(row.fecha),
        party: config.id,
        label: config.label,
        color: config.color,
        probability: numberOrNull(row.first_force_probability)
      };
    })
    .filter((row) => isElectoralParty(row.party))
    .sort((a, b) => a.date.localeCompare(b.date) || a.party.localeCompare(b.party));
}

export function normalizeProvinceEstimate(row: RawProvinceEstimateRow): ProvinceEstimate {
  const code = `${row.codigo_provincia}`.padStart(2, '0');

  return {
    ...normalizePartyEstimate(row),
    date: dateToString(row.fecha),
    provinceCode: code,
    provinceName: getProvinceName(code)
  };
}

export function normalizeProvinceEstimates(rows: RawProvinceEstimateRow[]): ProvinceEstimate[] {
  return rows
    .map(normalizeProvinceEstimate)
    .sort(
      (a, b) =>
        a.provinceCode.localeCompare(b.provinceCode) ||
        (b.voteShareMean ?? -1) - (a.voteShareMean ?? -1) ||
        (b.seatsMean ?? -1) - (a.seatsMean ?? -1)
    );
}

export function normalizePreviousResults(rows: RawPreviousResultRow[]): PreviousResult[] {
  const totalVotes = rows
    .filter((row) => getPartyConfig(row.partido).id !== 'ABNL')
    .reduce((sum, row) => sum + (numberOrNull(row.votos) ?? 0), 0);

  return rows
    .map((row) => {
      const config = getPartyConfig(row.partido);
      const votes = numberOrNull(row.votos);
      const pct = numberOrNull(row.pct);
      return {
        party: config.id,
        label: config.label,
        color: config.color,
        votes,
        voteShare: pct ?? (votes != null && totalVotes > 0 ? (votes / totalVotes) * 100 : null),
        seats: numberOrNull(row.diputados),
        isElectoral: isElectoralParty(row.partido)
      };
    })
    .sort((a, b) => (b.voteShare ?? -1) - (a.voteShare ?? -1) || (b.seats ?? -1) - (a.seats ?? -1));
}

export function normalizePreviousProvinceResults(rows: RawPreviousProvinceResultRow[]): PreviousProvinceResult[] {
  const byProvince = groupBy(rows, (row) => `${row.codigo_provincia}`.padStart(2, '0'));

  return [...byProvince.entries()]
    .flatMap(([code, provinceRows]) => {
      const totalVotes = provinceRows
        .filter((row) => getPartyConfig(row.partido).id !== 'ABNL')
        .reduce((sum, row) => sum + (numberOrNull(row.votos) ?? 0), 0);

      return provinceRows.map((row) => {
        const config = getPartyConfig(row.partido);
        const votes = numberOrNull(row.votos);
        const pct = numberOrNull(row.pct);
        return {
          party: config.id,
          label: config.label,
          color: config.color,
          votes,
          voteShare: pct ?? (votes != null && totalVotes > 0 ? (votes / totalVotes) * 100 : null),
          seats: numberOrNull(row.diputados),
          isElectoral: isElectoralParty(row.partido),
          provinceCode: code,
          provinceName: getProvinceName(code)
        };
      });
    })
    .sort(
      (a, b) =>
        a.provinceCode.localeCompare(b.provinceCode) ||
        (b.voteShare ?? -1) - (a.voteShare ?? -1) ||
        (b.seats ?? -1) - (a.seats ?? -1)
    );
}

export function normalizeNationalSimulation(row: RawNationalSimulationRow): SimulationResult {
  const config = getPartyConfig(row.partido);

  return {
    date: dateToString(row.fecha),
    simulationId: Number(row.sim),
    party: config.id,
    label: config.label,
    color: config.color,
    votes: numberOrNull(row.votos),
    seats: numberOrNull(row.seats),
    isElectoral: isElectoralParty(row.partido)
  };
}

export function buildModelMetadata(dates: string[], rows: RawNationalEstimateRow[]): ModelMetadata {
  const sortedDates = [...new Set(dates)].sort();

  return {
    dates: sortedDates,
    latestDate: sortedDates.at(-1) ?? '2026-04-05',
    sourceFiles: SOURCE_FILES,
    partyConfig: getAvailablePartiesFromRows(rows.map((row) => ({ party: getPartyConfig(row.partido).id })))
  };
}

export function electoralParties<T extends { isElectoral: boolean }>(rows: T[]): T[] {
  return rows.filter((row) => row.isElectoral);
}

export function buildProvinceMapFeatures(estimates: ProvinceEstimate[]): ProvinceMapFeature[] {
  const byProvince = groupBy(electoralParties(estimates), (estimate) => estimate.provinceCode);

  return [...byProvince.entries()].map(([code, provinceRows]) => {
    const winner = getProvinceVoteWinner(provinceRows);

    return {
      type: 'Feature',
      properties: {
        code,
        name: getProvinceName(code),
        winnerParty: winner?.party,
        winnerLabel: winner?.label,
        winnerColor: winner?.color,
        winnerVoteShareColor: winnerVoteShareColor(winner?.color, winner?.voteShareMean),
        voteShare: winner?.voteShareMean ?? null,
        change: null
      },
      geometry: makeMockProvinceGeometry(code)
    };
  });
}

export function enrichProvinceGeoJson(
  geoJson: GeoJSON.FeatureCollection,
  estimates: ProvinceEstimate[],
  baselineEstimates: ProvinceEstimate[] = []
): ProvinceMapCollection {
  const byProvince = groupBy(electoralParties(estimates), (estimate) => estimate.provinceCode);
  const baselineByProvince = groupBy(electoralParties(baselineEstimates), (estimate) => estimate.provinceCode);

  return {
    type: 'FeatureCollection',
    features: geoJson.features.map((feature) => {
      const rawProps = feature.properties ?? {};
      const code = normalizeProvinceCode(
        rawProps.Codigo ?? rawProps.codigo ?? rawProps.code ?? rawProps.COD_PROV ?? rawProps.cod_prov
      );
      const provinceRows = byProvince.get(code) ?? [];
      const baselineRows = baselineByProvince.get(code) ?? [];
      const winner = getProvinceVoteWinner(provinceRows);
      const baselineWinnerParty = baselineRows.find((row) => row.party === winner?.party);

      return {
        type: 'Feature',
        geometry: feature.geometry,
        properties: {
          code,
          name: `${rawProps.Texto ?? rawProps.name ?? rawProps.NAMEUNIT ?? getProvinceName(code)}`,
          winnerParty: winner?.party,
          winnerLabel: winner?.label,
          winnerColor: winner?.color,
          winnerVoteShareColor: winnerVoteShareColor(winner?.color, winner?.voteShareMean),
          voteShare: winner?.voteShareMean ?? null,
          change:
            winner?.voteShareMean != null && baselineWinnerParty?.voteShareMean != null
              ? winner.voteShareMean - baselineWinnerParty.voteShareMean
              : null
        }
      };
    })
  };
}

export function buildProvinceMapCollection(estimates: ProvinceEstimate[]): ProvinceMapCollection {
  return {
    type: 'FeatureCollection',
    features: buildProvinceMapFeatures(estimates)
  };
}

export function buildSeatDistributions(simulations: SimulationResult[], parties: string[] = []): SeatDistribution[] {
  const usable = simulations.filter((simulation) => simulation.isElectoral && simulation.seats != null);
  const grouped = groupBy(usable, (simulation) => simulation.party);
  const selectedParties = parties.length
    ? parties
    : [...grouped.entries()]
        .map(([party, rows]) => ({ party, seats: mean(rows.map((row) => row.seats ?? 0)) }))
        .sort((a, b) => b.seats - a.seats)
        .slice(0, 8)
        .map((row) => row.party);

  return selectedParties
    .map((party) => {
      const rows = grouped.get(party) ?? [];
      const values = rows.map((row) => row.seats ?? 0);
      const [min, max] = extent(values);
      const config = getPartyConfig(party);

      return {
        party: config.id,
        label: config.label,
        color: config.color,
        mean: mean(values),
        min,
        max,
        majorityProbability: values.length
          ? values.filter((value) => value >= 176).length / values.length
          : 0,
        buckets: integerHistogram(values)
      };
    })
    .filter((distribution) => distribution.buckets.length > 0);
}

export function buildScenarioSummaries(simulations: SimulationResult[]): ScenarioSummary[] {
  const bySimulation = groupBy(
    simulations.filter((simulation) => simulation.isElectoral),
    (simulation) => simulation.simulationId
  );

  return SCENARIO_DEFINITIONS.map((scenario) => {
    const totals = [...bySimulation.values()].map((rows) =>
      rows
        .filter((row) => scenario.parties.includes(row.party))
        .reduce((sum, row) => sum + (row.seats ?? 0), 0)
    );
    const [seatsMin, seatsMax] = extent(totals);

    return {
      id: scenario.id,
      label: scenario.label,
      parties: scenario.parties,
      seatsMean: mean(totals),
      seatsMin,
      seatsMax,
      majorityProbability: totals.length
        ? totals.filter((total) => total >= 176).length / totals.length
        : 0
    };
  });
}

export function emptyScenarioSummaries(): ScenarioSummary[] {
  return SCENARIO_DEFINITIONS.map((scenario) => ({
    id: scenario.id,
    label: scenario.label,
    parties: scenario.parties,
    seatsMean: null,
    seatsMin: null,
    seatsMax: null,
    majorityProbability: null
  }));
}

function getScenarioDefinition(sourceId: string) {
  return (
    SCENARIO_DEFINITIONS.find((scenario) => scenario.sourceIds.includes(sourceId)) ?? {
      id: sourceId,
      sourceIds: [sourceId],
      label: sourceId,
      parties: []
    }
  );
}

function scenarioSortOrder(id: string): number {
  const index = SCENARIO_DEFINITIONS.findIndex((scenario) => scenario.id === id);
  return index === -1 ? SCENARIO_DEFINITIONS.length : index;
}

function groupBy<T, K extends string | number>(rows: T[], key: (row: T) => K): Map<K, T[]> {
  const grouped = new Map<K, T[]>();
  for (const row of rows) {
    const groupKey = key(row);
    const group = grouped.get(groupKey) ?? [];
    group.push(row);
    grouped.set(groupKey, group);
  }
  return grouped;
}

// Temporary schematic geometry: one small rectangle per province code.
// Replace with real INE/IGN GeoJSON while keeping ProvinceMapFeature properties intact.
export function makeMockProvinceGeometry(code: string): ProvinceMapFeature['geometry'] {
  const index = Math.max(0, Number(code) - 1);
  const col = index % 10;
  const row = Math.floor(index / 10);
  const x = -9.7 + col * 1.7;
  const y = 43.6 - row * 1.25;
  const width = code === '51' || code === '52' ? 0.55 : 1.25;
  const height = code === '51' || code === '52' ? 0.42 : 0.85;

  return {
    type: 'Polygon',
    coordinates: [
      [
        [x, y],
        [x + width, y],
        [x + width, y - height],
        [x, y - height],
        [x, y]
      ]
    ]
  };
}

function getProvinceVoteWinner(rows: ProvinceEstimate[]): ProvinceEstimate | undefined {
  return [...rows].sort(
    (a, b) =>
      (b.voteShareMean ?? -1) - (a.voteShareMean ?? -1) ||
      (b.seatsMean ?? -1) - (a.seatsMean ?? -1)
  )[0];
}

function normalizeProvinceCode(value: unknown): string {
  return `${value ?? ''}`.padStart(2, '0');
}
