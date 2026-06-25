import type { PartyConfig } from '$lib/config/parties';

export type Interval = {
  lower: number | null;
  upper: number | null;
};

export type PartyEstimate = {
  party: string;
  label: string;
  color: string;
  votesMean: number | null;
  voteShareMean: number | null;
  seatsMean: number | null;
  votesInterval: Interval;
  voteShareInterval: Interval;
  seatsInterval: Interval;
  isElectoral: boolean;
};

export type NationalEstimate = {
  date: string;
  parties: PartyEstimate[];
};

export type ProvinceEstimate = PartyEstimate & {
  date: string;
  provinceCode: string;
  provinceName: string;
};

export type PreviousResult = {
  party: string;
  label: string;
  color: string;
  votes: number | null;
  voteShare: number | null;
  seats: number | null;
  isElectoral: boolean;
};

export type PreviousProvinceResult = PreviousResult & {
  provinceCode: string;
  provinceName: string;
};

export type SimulationResult = {
  date: string;
  simulationId: number;
  party: string;
  label: string;
  color: string;
  provinceCode?: string;
  provinceName?: string;
  votes: number | null;
  seats: number | null;
  isElectoral: boolean;
};

export type HistogramBucket = {
  x0: number;
  x1: number;
  count: number;
};

export type SeatDistribution = {
  party: string;
  label: string;
  color: string;
  mean: number;
  min: number;
  max: number;
  majorityProbability?: number;
  buckets: HistogramBucket[];
};

export type ProvinceMapMetric = 'winner' | 'voteShare' | 'change';

export type ProvinceMapProperties = {
  code: string;
  name: string;
  winnerParty?: string;
  winnerLabel?: string;
  winnerColor?: string;
  winnerVoteShareColor?: string;
  voteShare?: number | null;
  change?: number | null;
};

export type ProvinceMapFeature = {
  type: 'Feature';
  properties: ProvinceMapProperties;
  geometry: GeoJSON.Geometry | null;
};

export type ProvinceMapCollection = {
  type: 'FeatureCollection';
  features: ProvinceMapFeature[];
};

export type ModelMetadata = {
  dates: string[];
  latestDate: string;
  sourceFiles: Record<string, string>;
  version?: string;
  partyConfig: PartyConfig[];
};

export type ScenarioSummary = {
  id: string;
  label: string;
  parties: string[];
  seatsMean: number | null;
  seatsMin: number | null;
  seatsMax: number | null;
  majorityProbability: number | null;
};

export type NationalScenarioSummary = ScenarioSummary & {
  date: string;
};

export type NationalTrendPoint = {
  date: string;
  party: string;
  label: string;
  color: string;
  voteShareMean: number | null;
  voteShareLower: number | null;
  voteShareUpper: number | null;
  seatsMean: number | null;
  seatsLower: number | null;
  seatsUpper: number | null;
  isElectoral: boolean;
};

export type FirstForceProbability = {
  date: string;
  party: string;
  label: string;
  color: string;
  probability: number | null;
};

export type RawNationalScenarioRow = {
  fecha: unknown;
  scenario_id: string;
  seats_median: number | null;
  seats_min: number | null;
  seats_max: number | null;
  majority_probability: number | null;
};

export type RawFirstForceProbabilityRow = {
  rank: number | null;
  fecha: unknown;
  partido: string;
  first_force_probability: number | null;
};

export type RawNationalEstimateRow = {
  fecha: unknown;
  partido: string;
  votos_m: number | null;
  pct_m: number | null;
  seats_m: number | null;
  votos_lwr: number | null;
  votos_upr: number | null;
  pct_lwr: number | null;
  pct_upr: number | null;
  seats_lwr: number | null;
  seats_upr: number | null;
};

export type RawProvinceEstimateRow = RawNationalEstimateRow & {
  codigo_provincia: string;
};

export type RawPreviousResultRow = {
  partido: string;
  votos: number | null;
  pct?: number | null;
  diputados: number | null;
};

export type RawPreviousProvinceResultRow = RawPreviousResultRow & {
  codigo_provincia: string;
};

export type RawNationalSimulationRow = {
  fecha: unknown;
  sim: number;
  partido: string;
  votos: number | null;
  seats: number | null;
};

export type RawProvinceSimulationRow = {
  fecha: unknown;
  sim: number;
  codigo_provincia: string;
  partido: string;
  votos_salida: number | null;
  seats: number | null;
};
