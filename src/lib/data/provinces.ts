export const PROVINCES: Record<string, string> = {
  '01': 'Araba/Alava',
  '02': 'Albacete',
  '03': 'Alicante/Alacant',
  '04': 'Almeria',
  '05': 'Avila',
  '06': 'Badajoz',
  '07': 'Illes Balears',
  '08': 'Barcelona',
  '09': 'Burgos',
  '10': 'Caceres',
  '11': 'Cadiz',
  '12': 'Castellon/Castello',
  '13': 'Ciudad Real',
  '14': 'Cordoba',
  '15': 'A Coruna',
  '16': 'Cuenca',
  '17': 'Girona',
  '18': 'Granada',
  '19': 'Guadalajara',
  '20': 'Gipuzkoa',
  '21': 'Huelva',
  '22': 'Huesca',
  '23': 'Jaen',
  '24': 'Leon',
  '25': 'Lleida',
  '26': 'La Rioja',
  '27': 'Lugo',
  '28': 'Madrid',
  '29': 'Malaga',
  '30': 'Murcia',
  '31': 'Navarra',
  '32': 'Ourense',
  '33': 'Asturias',
  '34': 'Palencia',
  '35': 'Las Palmas',
  '36': 'Pontevedra',
  '37': 'Salamanca',
  '38': 'Santa Cruz de Tenerife',
  '39': 'Cantabria',
  '40': 'Segovia',
  '41': 'Sevilla',
  '42': 'Soria',
  '43': 'Tarragona',
  '44': 'Teruel',
  '45': 'Toledo',
  '46': 'Valencia/Valencia',
  '47': 'Valladolid',
  '48': 'Bizkaia',
  '49': 'Zamora',
  '50': 'Zaragoza',
  '51': 'Ceuta',
  '52': 'Melilla'
};

const PROVINCE_COMMUNITIES: Record<string, { name: string; order: number }> = {
  '01': { name: 'Pais Vasco', order: 16 },
  '02': { name: 'Castilla-La Mancha', order: 8 },
  '03': { name: 'Comunitat Valenciana', order: 10 },
  '04': { name: 'Andalucia', order: 1 },
  '05': { name: 'Castilla y Leon', order: 7 },
  '06': { name: 'Extremadura', order: 11 },
  '07': { name: 'Illes Balears', order: 4 },
  '08': { name: 'Catalunya', order: 9 },
  '09': { name: 'Castilla y Leon', order: 7 },
  '10': { name: 'Extremadura', order: 11 },
  '11': { name: 'Andalucia', order: 1 },
  '12': { name: 'Comunitat Valenciana', order: 10 },
  '13': { name: 'Castilla-La Mancha', order: 8 },
  '14': { name: 'Andalucia', order: 1 },
  '15': { name: 'Galicia', order: 12 },
  '16': { name: 'Castilla-La Mancha', order: 8 },
  '17': { name: 'Catalunya', order: 9 },
  '18': { name: 'Andalucia', order: 1 },
  '19': { name: 'Castilla-La Mancha', order: 8 },
  '20': { name: 'Pais Vasco', order: 16 },
  '21': { name: 'Andalucia', order: 1 },
  '22': { name: 'Aragon', order: 2 },
  '23': { name: 'Andalucia', order: 1 },
  '24': { name: 'Castilla y Leon', order: 7 },
  '25': { name: 'Catalunya', order: 9 },
  '26': { name: 'La Rioja', order: 17 },
  '27': { name: 'Galicia', order: 12 },
  '28': { name: 'Comunidad de Madrid', order: 13 },
  '29': { name: 'Andalucia', order: 1 },
  '30': { name: 'Region de Murcia', order: 14 },
  '31': { name: 'Comunidad Foral de Navarra', order: 15 },
  '32': { name: 'Galicia', order: 12 },
  '33': { name: 'Asturias', order: 3 },
  '34': { name: 'Castilla y Leon', order: 7 },
  '35': { name: 'Canarias', order: 5 },
  '36': { name: 'Galicia', order: 12 },
  '37': { name: 'Castilla y Leon', order: 7 },
  '38': { name: 'Canarias', order: 5 },
  '39': { name: 'Cantabria', order: 6 },
  '40': { name: 'Castilla y Leon', order: 7 },
  '41': { name: 'Andalucia', order: 1 },
  '42': { name: 'Castilla y Leon', order: 7 },
  '43': { name: 'Catalunya', order: 9 },
  '44': { name: 'Aragon', order: 2 },
  '45': { name: 'Castilla-La Mancha', order: 8 },
  '46': { name: 'Comunitat Valenciana', order: 10 },
  '47': { name: 'Castilla y Leon', order: 7 },
  '48': { name: 'Pais Vasco', order: 16 },
  '49': { name: 'Castilla y Leon', order: 7 },
  '50': { name: 'Aragon', order: 2 },
  '51': { name: 'Ceuta', order: 18 },
  '52': { name: 'Melilla', order: 19 }
};

function normalizeProvinceCode(code: string | number | null | undefined): string {
  return `${code ?? ''}`.padStart(2, '0');
}

export function getProvinceName(code: string | number | null | undefined): string {
  const normalized = normalizeProvinceCode(code);
  return PROVINCES[normalized] ?? `Provincia ${normalized}`;
}

export function getProvinceCommunityName(code: string | number | null | undefined): string {
  const normalized = normalizeProvinceCode(code);
  return PROVINCE_COMMUNITIES[normalized]?.name ?? 'n/d';
}

export function compareProvinceCodesByCommunity(a: string, b: string): number {
  const codeA = normalizeProvinceCode(a);
  const codeB = normalizeProvinceCode(b);
  const communityA = PROVINCE_COMMUNITIES[codeA];
  const communityB = PROVINCE_COMMUNITIES[codeB];

  return (
    (communityA?.order ?? Number.MAX_SAFE_INTEGER) - (communityB?.order ?? Number.MAX_SAFE_INTEGER) ||
    getProvinceName(codeA).localeCompare(getProvinceName(codeB), 'es') ||
    codeA.localeCompare(codeB)
  );
}

export function getAvailableProvinces() {
  return Object.entries(PROVINCES).map(([code, name]) => ({ code, name }));
}
