export type PartyConfig = {
  id: string;
  label: string;
  color: string;
  textColor?: string;
  isElectoral?: boolean;
};

export const NEUTRAL_PARTY_COLOR = '#8f8b85';

export const PARTY_ALIASES: Record<string, string> = {
  Vox: 'VOX',
  Sumar: 'SUMAR',
  CCa: 'CC',
  OTBL: 'Otros'
};

export const NATIONAL_LEVEL_PARTIES = ['PP', 'PSOE', 'VOX', 'SUMAR', 'Podemos', 'SALF'];

export const PARTY_CONFIG: Record<string, PartyConfig> = {
  PSOE: { id: 'PSOE', label: 'PSOE', color: '#d73027' },
  PP: { id: 'PP', label: 'PP', color: '#2878b8' },
  VOX: { id: 'VOX', label: 'Vox', color: '#58a55c' },
  SUMAR: { id: 'SUMAR', label: 'Sumar', color: '#c85aa6' },
  Podemos: { id: 'Podemos', label: 'Podemos', color: '#7b3294' },
  ERC: { id: 'ERC', label: 'ERC', color: '#f3b21a', textColor: '#171717' },
  Junts: { id: 'Junts', label: 'Junts', color: '#01C2AB' },
  PNV: { id: 'PNV', label: 'PNV', color: '#1b8a5a' },
  'EH Bildu': { id: 'EH Bildu', label: 'EH Bildu', color: '#97bd3d', textColor: '#171717' },
  BNG: { id: 'BNG', label: 'BNG', color: '#76aadb' },
  CC: { id: 'CC', label: 'CC', color: '#f0c541', textColor: '#171717' },
  UPN: { id: 'UPN', label: 'UPN', color: '#d9682e' },
  PACMA: { id: 'PACMA', label: 'PACMA', color: '#70a060' },
  SALF: { id: 'SALF', label: 'SALF', color: '#5d6470' },
  Otros: { id: 'Otros', label: 'Otros', color: '#aaa39a', isElectoral: false },
  ABNL: { id: 'ABNL', label: 'Abst./blanco/nulo', color: '#d7d0c5', textColor: '#171717', isElectoral: false }
};

export function normalizePartyId(rawParty: string | null | undefined): string {
  const trimmed = `${rawParty ?? 'Otros'}`.trim();
  return PARTY_ALIASES[trimmed] ?? trimmed;
}

export function getPartyConfig(rawParty: string | null | undefined): PartyConfig {
  const id = normalizePartyId(rawParty);
  return PARTY_CONFIG[id] ?? { id, label: id, color: NEUTRAL_PARTY_COLOR };
}

export function isElectoralParty(rawParty: string | null | undefined): boolean {
  return getPartyConfig(rawParty).isElectoral !== false;
}

export function getAvailablePartiesFromRows(rows: Array<{ party: string }>): PartyConfig[] {
  const seen = new Map<string, PartyConfig>();
  for (const row of rows) {
    const config = getPartyConfig(row.party);
    if (!seen.has(config.id) && config.isElectoral !== false) {
      seen.set(config.id, config);
    }
  }
  return [...seen.values()];
}
