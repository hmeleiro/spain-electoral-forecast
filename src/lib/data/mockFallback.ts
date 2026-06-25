import { getPartyConfig } from '$lib/config/parties';
import { getAvailableProvinces } from '$lib/data/provinces';
import type {
  ModelMetadata,
  NationalEstimate,
  ProvinceEstimate,
  ProvinceMapCollection,
  SimulationResult
} from '$lib/data/schema';
import { buildProvinceMapCollection } from '$lib/data/transforms';

const MOCK_DATE = '2026-04-05';

const mockParties = [
  { party: 'PSOE', voteShareMean: 30.4, seatsMean: 124 },
  { party: 'PP', voteShareMean: 30.3, seatsMean: 123 },
  { party: 'VOX', voteShareMean: 17.3, seatsMean: 61 },
  { party: 'SUMAR', voteShareMean: 7.6, seatsMean: 15 },
  { party: 'ERC', voteShareMean: 2.8, seatsMean: 11 },
  { party: 'EH Bildu', voteShareMean: 1.4, seatsMean: 7 }
];

export const mockNationalEstimate: NationalEstimate = {
  date: MOCK_DATE,
  parties: mockParties.map((row) => {
    const config = getPartyConfig(row.party);

    return {
      party: config.id,
      label: config.label,
      color: config.color,
      votesMean: null,
      voteShareMean: row.voteShareMean,
      seatsMean: row.seatsMean,
      votesInterval: { lower: null, upper: null },
      voteShareInterval: { lower: row.voteShareMean - 1, upper: row.voteShareMean + 1 },
      seatsInterval: { lower: Math.max(0, row.seatsMean - 6), upper: row.seatsMean + 6 },
      isElectoral: true
    };
  })
};

export const mockProvinceEstimates: ProvinceEstimate[] = getAvailableProvinces().flatMap((province, index) =>
  mockParties.slice(0, 4).map((row, partyIndex) => {
    const config = getPartyConfig(row.party);
    const provinceSwing = ((index + partyIndex) % 5) - 2;

    return {
      date: MOCK_DATE,
      provinceCode: province.code,
      provinceName: province.name,
      party: config.id,
      label: config.label,
      color: config.color,
      votesMean: null,
      voteShareMean: Math.max(1, row.voteShareMean + provinceSwing),
      seatsMean: partyIndex === index % 4 ? 2 : partyIndex === 0 ? 1 : 0,
      votesInterval: { lower: null, upper: null },
      voteShareInterval: { lower: null, upper: null },
      seatsInterval: { lower: null, upper: null },
      isElectoral: true
    };
  })
);

export const mockNationalSimulations: SimulationResult[] = Array.from({ length: 160 }, (_, simulationId) =>
  mockParties.slice(0, 4).map((row, partyIndex) => {
    const config = getPartyConfig(row.party);
    const movement = ((simulationId + partyIndex * 7) % 13) - 6;

    return {
      date: MOCK_DATE,
      simulationId,
      party: config.id,
      label: config.label,
      color: config.color,
      votes: null,
      seats: Math.max(0, row.seatsMean + movement),
      isElectoral: true
    };
  })
).flat();

export const mockMetadata: ModelMetadata = {
  dates: [MOCK_DATE],
  latestDate: MOCK_DATE,
  sourceFiles: {
    nationalEstimates: 'mock',
    provinceEstimates: 'mock',
    nationalSimulations: 'mock',
    provinceSimulations: 'mock'
  },
  partyConfig: mockNationalEstimate.parties.map((party) => getPartyConfig(party.party))
};

export const mockProvinceMap: ProvinceMapCollection = buildProvinceMapCollection(mockProvinceEstimates);
