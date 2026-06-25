import { describe, expect, it } from 'vitest';
import { getPartyConfig, isElectoralParty } from '$lib/config/parties';
import type { RawNationalEstimateRow, RawProvinceEstimateRow } from '$lib/data/schema';
import {
  buildProvinceMapFeatures,
  normalizeNationalEstimate,
  normalizePreviousProvinceResults,
  normalizePreviousResults,
  normalizeProvinceEstimates
} from '$lib/data/transforms';

const baseRow: RawNationalEstimateRow = {
  fecha: '2026-04-05',
  partido: 'Vox',
  votos_m: 100,
  pct_m: 17.2,
  seats_m: 60,
  votos_lwr: 90,
  votos_upr: 110,
  pct_lwr: 16,
  pct_upr: 18,
  seats_lwr: 55,
  seats_upr: 65
};

describe('party normalization', () => {
  it('normalizes known aliases', () => {
    expect(getPartyConfig('Vox').id).toBe('VOX');
    expect(getPartyConfig('Sumar').id).toBe('SUMAR');
    expect(getPartyConfig('CCa').id).toBe('CC');
    expect(getPartyConfig('OTBL').id).toBe('Otros');
  });

  it('marks ABNL as non-electoral', () => {
    expect(isElectoralParty('ABNL')).toBe(false);
    expect(isElectoralParty('PP')).toBe(true);
  });
});

describe('estimate transforms', () => {
  it('maps raw national columns into the internal estimate model', () => {
    const estimate = normalizeNationalEstimate([baseRow]);
    expect(estimate.date).toBe('2026-04-05');
    expect(estimate.parties[0]).toMatchObject({
      party: 'VOX',
      voteShareMean: 17.2,
      seatsMean: 60,
      isElectoral: true
    });
    expect(estimate.parties[0].voteShareInterval).toEqual({ lower: 16, upper: 18 });
  });

  it('excludes ABNL from province winner features', () => {
    const rows: RawProvinceEstimateRow[] = [
      { ...baseRow, codigo_provincia: '28', partido: 'ABNL', pct_m: 45, seats_m: 0 },
      { ...baseRow, codigo_provincia: '28', partido: 'PP', pct_m: 31, seats_m: 15 },
      { ...baseRow, codigo_provincia: '28', partido: 'PSOE', pct_m: 30, seats_m: 14 }
    ];

    const provinces = normalizeProvinceEstimates(rows);
    const features = buildProvinceMapFeatures(provinces);

    expect(features[0].properties.winnerParty).toBe('PP');
    expect(features[0].properties.name).toBe('Madrid');
  });

  it('uses vote share, not seats sorting quirks, for provincial first force', () => {
    const rows: RawProvinceEstimateRow[] = [
      { ...baseRow, codigo_provincia: '01', partido: 'ABNL', pct_m: 33.4, seats_m: 0 },
      { ...baseRow, codigo_provincia: '01', partido: 'PSOE', pct_m: 19.2, seats_m: 2 },
      { ...baseRow, codigo_provincia: '01', partido: 'EH Bildu', pct_m: 13.5, seats_m: 1 },
      { ...baseRow, codigo_provincia: '01', partido: 'Sumar', pct_m: 5.7, seats_m: 2 }
    ];

    const provinces = normalizeProvinceEstimates(rows);
    const features = buildProvinceMapFeatures(provinces);

    expect(features[0].properties.winnerParty).toBe('PSOE');
    expect(features[0].properties.voteShare).toBe(19.2);
    expect(features[0].properties.winnerVoteShareColor).not.toBe(features[0].properties.winnerColor);
  });

  it('uses pct from previous results before recalculating from votes', () => {
    const national = normalizePreviousResults([
      { partido: 'PP', votos: 60, pct: 33.3, diputados: 137 },
      { partido: 'PSOE', votos: 40, pct: 31.7, diputados: 121 }
    ]);
    const provincial = normalizePreviousProvinceResults([
      { codigo_provincia: '28', partido: 'PP', votos: 60, pct: 35.2, diputados: 7 },
      { codigo_provincia: '28', partido: 'PSOE', votos: 40, pct: 28.8, diputados: 5 }
    ]);

    expect(national.find((row) => row.party === 'PP')?.voteShare).toBe(33.3);
    expect(provincial.find((row) => row.party === 'PP')?.voteShare).toBe(35.2);
  });
});
