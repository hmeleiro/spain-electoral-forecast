import type {
  FirstForceProbability,
  ModelMetadata,
  NationalEstimate,
  NationalScenarioSummary,
  NationalTrendPoint,
  PreviousProvinceResult,
  PreviousResult,
  ProvinceEstimate,
  RawFirstForceProbabilityRow,
  RawNationalEstimateRow,
  RawNationalScenarioRow,
  RawNationalSimulationRow,
  RawPreviousProvinceResultRow,
  RawPreviousResultRow,
  RawProvinceEstimateRow,
  SimulationResult
} from '$lib/data/schema';
import { derivedDataFileUrl } from '$lib/config/data';
import {
  buildModelMetadata,
  normalizeFirstForceProbabilityRows,
  normalizeNationalEstimate,
  normalizeNationalScenarioRows,
  normalizeNationalSimulation,
  normalizeNationalTrendRows,
  normalizePreviousProvinceResults,
  normalizePreviousResults,
  normalizeProvinceEstimates
} from '$lib/data/transforms';

async function loadJson<T>(fileName: string): Promise<T[]> {
  const response = await fetch(await derivedDataFileUrl(fileName));
  if (!response.ok) {
    throw new Error(`No se pudo cargar fallback JSON ${fileName}: ${response.status}`);
  }
  return (await response.json()) as T[];
}

function latestDate(rows: Array<{ fecha: unknown }>): string {
  return [...new Set(rows.map((row) => `${row.fecha}`))].sort().at(-1) ?? '2026-04-05';
}

export async function loadMetadataFromJson(): Promise<ModelMetadata> {
  const rows = await loadJson<RawNationalEstimateRow>('estimaciones_nacionales.json');
  const dates = [...new Set(rows.map((row) => `${row.fecha}`))].sort();
  const latest = dates.at(-1);
  return buildModelMetadata(
    dates,
    rows.filter((row) => `${row.fecha}` === latest)
  );
}

export async function loadNationalEstimatesFromJson(date?: string): Promise<NationalEstimate> {
  const rows = await loadJson<RawNationalEstimateRow>('estimaciones_nacionales.json');
  const selectedDate = date ?? latestDate(rows);
  return normalizeNationalEstimate(
    rows.filter((row) => `${row.fecha}` === selectedDate),
    selectedDate
  );
}

export async function loadNationalTrendFromJson(): Promise<NationalTrendPoint[]> {
  const rows = await loadJson<RawNationalEstimateRow>('estimaciones_nacionales.json');
  return normalizeNationalTrendRows(rows);
}

export async function loadProvinceEstimatesFromJson(date?: string): Promise<ProvinceEstimate[]> {
  const rows = await loadJson<RawProvinceEstimateRow>('estimaciones_provinciales.json');
  const selectedDate = date ?? latestDate(rows);
  return normalizeProvinceEstimates(rows.filter((row) => `${row.fecha}` === selectedDate));
}

export async function loadNationalSimulationsFromJson(): Promise<SimulationResult[]> {
  const rows = await loadJson<RawNationalSimulationRow>('simulaciones_nacionales_latest.json');
  return rows.map(normalizeNationalSimulation);
}

export async function loadNationalScenarioSeriesFromJson(): Promise<NationalScenarioSummary[]> {
  const rows = await loadJson<RawNationalScenarioRow>('escenarios_nacionales.json');
  return normalizeNationalScenarioRows(rows);
}

export async function loadFirstForceProbabilitySeriesFromJson(): Promise<FirstForceProbability[]> {
  const rows = await loadJson<RawFirstForceProbabilityRow>('first_force_probability.json');
  return normalizeFirstForceProbabilityRows(rows);
}

export async function loadPreviousNationalResultsFromJson(): Promise<PreviousResult[]> {
  const rows = await loadJson<RawPreviousResultRow>('results_prev.json');
  return normalizePreviousResults(rows);
}

export async function loadPreviousProvinceResultsFromJson(): Promise<PreviousProvinceResult[]> {
  const rows = await loadJson<RawPreviousProvinceResultRow>('results_prev_prov.json');
  return normalizePreviousProvinceResults(rows);
}
