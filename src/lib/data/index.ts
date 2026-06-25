import { getPartyConfig } from '$lib/config/parties';
import { dataFileUrl } from '$lib/config/data';
import { getAvailableProvinces as listAllProvinces } from '$lib/data/provinces';
import { queryRows } from '$lib/data/parquetClient';
import {
  loadFirstForceProbabilitySeriesFromJson,
  loadMetadataFromJson,
  loadNationalEstimatesFromJson,
  loadNationalScenarioSeriesFromJson,
  loadNationalSimulationsFromJson,
  loadNationalTrendFromJson,
  loadPreviousNationalResultsFromJson,
  loadPreviousProvinceResultsFromJson,
  loadProvinceEstimatesFromJson
} from '$lib/data/jsonFallback';
import {
  mockMetadata,
  mockNationalEstimate,
  mockNationalSimulations,
  mockProvinceEstimates
} from '$lib/data/mockFallback';
import type {
  ModelMetadata,
  NationalEstimate,
  FirstForceProbability,
  NationalScenarioSummary,
  NationalTrendPoint,
  PreviousProvinceResult,
  PreviousResult,
  ProvinceMapCollection,
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
import {
  buildModelMetadata,
  buildProvinceMapCollection,
  enrichProvinceGeoJson,
  normalizeNationalEstimate,
  normalizeFirstForceProbabilityRows,
  normalizeNationalScenarioRows,
  normalizeNationalTrendRows,
  normalizeNationalSimulation,
  normalizePreviousProvinceResults,
  normalizePreviousResults,
  normalizeProvinceEstimates,
  SOURCE_FILES
} from '$lib/data/transforms';

function dateClause(date?: string): string {
  return date ? `DATE '${date}'` : `(select max(fecha) from '${SOURCE_FILES.nationalEstimates}')`;
}

function provinceDateClause(date?: string): string {
  return date ? `DATE '${date}'` : `(select max(fecha) from '${SOURCE_FILES.provinceEstimates}')`;
}

export async function loadModelMetadata(): Promise<ModelMetadata> {
  try {
    const dates = await queryRows<{ date: string }>(
      `select distinct cast(fecha as varchar) as date from '${SOURCE_FILES.nationalEstimates}' order by date`
    );
    const rows = await queryRows<RawNationalEstimateRow>(
      `select cast(fecha as varchar) as fecha, * exclude(fecha) from '${SOURCE_FILES.nationalEstimates}'
       where fecha = (select max(fecha) from '${SOURCE_FILES.nationalEstimates}')`
    );

    return buildModelMetadata(
      dates.map((row) => row.date),
      rows
    );
  } catch (error) {
    console.warn('Usando metadata JSON derivada por error al leer Parquet', error);
    return loadMetadataFromJson().catch(() => mockMetadata);
  }
}

export async function loadNationalEstimates(date?: string): Promise<NationalEstimate> {
  try {
    const rows = await queryRows<RawNationalEstimateRow>(
      `select cast(fecha as varchar) as fecha, * exclude(fecha) from '${SOURCE_FILES.nationalEstimates}'
       where fecha = ${dateClause(date)}
       order by pct_m desc nulls last, seats_m desc nulls last`
    );
    return normalizeNationalEstimate(rows, date);
  } catch (error) {
    console.warn('Usando estimaciones nacionales JSON derivadas por error al leer Parquet', error);
    return loadNationalEstimatesFromJson(date).catch(() => mockNationalEstimate);
  }
}

export async function loadNationalEstimateSeries(): Promise<NationalTrendPoint[]> {
  try {
    const rows = await queryRows<RawNationalEstimateRow>(
      `select cast(fecha as varchar) as fecha, * exclude(fecha) from '${SOURCE_FILES.nationalEstimates}'
       order by fecha, partido`
    );
    return normalizeNationalTrendRows(rows);
  } catch (error) {
    console.warn('Usando serie nacional JSON derivada por error al leer Parquet', error);
    return loadNationalTrendFromJson().catch(() => mockNationalEstimate.parties.map((party) => ({
      date: mockNationalEstimate.date,
      party: party.party,
      label: party.label,
      color: party.color,
      voteShareMean: party.voteShareMean,
      voteShareLower: party.voteShareInterval.lower,
      voteShareUpper: party.voteShareInterval.upper,
      seatsMean: party.seatsMean,
      seatsLower: party.seatsInterval.lower,
      seatsUpper: party.seatsInterval.upper,
      isElectoral: party.isElectoral
    })));
  }
}

export async function loadNationalScenarioSeries(): Promise<NationalScenarioSummary[]> {
  try {
    const rows = await queryRows<RawNationalScenarioRow>(
      `select cast(fecha as varchar) as fecha, * exclude(fecha) from '${SOURCE_FILES.nationalScenarios}'
       order by fecha, scenario_id`
    );
    return normalizeNationalScenarioRows(rows);
  } catch (error) {
    console.warn('Escenarios nacionales agregados no disponibles', error);
    return loadNationalScenarioSeriesFromJson().catch(() => []);
  }
}

export async function loadFirstForceProbabilitySeries(): Promise<FirstForceProbability[]> {
  try {
    const rows = await queryRows<RawFirstForceProbabilityRow>(
      `select cast(fecha as varchar) as fecha, * exclude(fecha) from '${SOURCE_FILES.firstForceProbabilities}'
       order by fecha, partido`
    );
    return normalizeFirstForceProbabilityRows(rows);
  } catch (error) {
    console.warn('Probabilidades de primera fuerza no disponibles', error);
    return loadFirstForceProbabilitySeriesFromJson().catch(() => []);
  }
}

export async function loadProvinceEstimates(date?: string): Promise<ProvinceEstimate[]> {
  try {
    const rows = await queryRows<RawProvinceEstimateRow>(
      `select cast(fecha as varchar) as fecha, * exclude(fecha) from '${SOURCE_FILES.provinceEstimates}'
       where fecha = ${provinceDateClause(date)}
       order by codigo_provincia, pct_m desc nulls last, seats_m desc nulls last`
    );
    return normalizeProvinceEstimates(rows);
  } catch (error) {
    console.warn('Usando estimaciones provinciales JSON derivadas por error al leer Parquet', error);
    return loadProvinceEstimatesFromJson(date).catch(() => mockProvinceEstimates);
  }
}

export async function loadPreviousNationalResults(): Promise<PreviousResult[]> {
  try {
    const rows = await queryRows<RawPreviousResultRow>(
      `select partido, votos, pct, diputados from '${SOURCE_FILES.previousNationalResults}'
       order by votos desc nulls last, diputados desc nulls last`
    );
    return normalizePreviousResults(rows);
  } catch (error) {
    console.warn('Resultados nacionales anteriores no disponibles', error);
    return loadPreviousNationalResultsFromJson().catch(() => []);
  }
}

export async function loadPreviousProvinceResults(): Promise<PreviousProvinceResult[]> {
  try {
    const rows = await queryRows<RawPreviousProvinceResultRow>(
      `select codigo_provincia, partido, votos, pct, diputados from '${SOURCE_FILES.previousProvinceResults}'
       order by codigo_provincia, votos desc nulls last, diputados desc nulls last`
    );
    return normalizePreviousProvinceResults(rows);
  } catch (error) {
    console.warn('Resultados provinciales anteriores no disponibles', error);
    return loadPreviousProvinceResultsFromJson().catch(() => []);
  }
}

export async function loadNationalSimulations(date?: string): Promise<SimulationResult[]> {
  try {
    const rows = await queryRows<RawNationalSimulationRow>(
      `select cast(fecha as varchar) as fecha, * exclude(fecha) from '${SOURCE_FILES.nationalSimulations}'
       where fecha = ${date ? `DATE '${date}'` : `(select max(fecha) from '${SOURCE_FILES.nationalSimulations}')`}`
    );
    return rows.map(normalizeNationalSimulation);
  } catch (error) {
    console.warn('Usando simulaciones nacionales JSON derivadas por error al leer Parquet', error);
    return loadNationalSimulationsFromJson().catch(() => mockNationalSimulations);
  }
}

export async function getAvailableParties(): Promise<string[]> {
  const estimate = await loadNationalEstimates();
  return estimate.parties.filter((party) => party.isElectoral).map((party) => party.party);
}

export function getAvailableProvinces() {
  return listAllProvinces();
}

export async function loadProvinceMapCollection(
  estimates: ProvinceEstimate[],
  baselineEstimates: ProvinceEstimate[] = []
): Promise<ProvinceMapCollection> {
  try {
    const response = await fetch(dataFileUrl('provincias_spain.geojson'));
    if (!response.ok) throw new Error(`GeoJSON no disponible: ${response.status}`);
    const geoJson = (await response.json()) as GeoJSON.FeatureCollection;
    return enrichProvinceGeoJson(geoJson, estimates, baselineEstimates);
  } catch (error) {
    console.warn('Usando geometria mock de provincias por error al cargar GeoJSON', error);
    return buildProvinceMapCollection(estimates);
  }
}

export { getPartyConfig };
