import type {
  ModelMetadata,
  NationalEstimate,
  NationalTrendPoint,
  ProvinceEstimate,
  RawNationalEstimateRow,
  RawNationalSimulationRow,
  RawProvinceEstimateRow,
  SimulationResult
} from '$lib/data/schema';
import {
  buildModelMetadata,
  normalizeNationalEstimate,
  normalizeNationalSimulation,
  normalizeNationalTrendRows,
  normalizeProvinceEstimates
} from '$lib/data/transforms';

const DERIVED_BASE = '/data/derived';

async function loadJson<T>(fileName: string): Promise<T[]> {
  const response = await fetch(`${DERIVED_BASE}/${fileName}`);
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
