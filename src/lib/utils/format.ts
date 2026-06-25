export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value == null || Number.isNaN(value)) return 'n/d';
  return `${value.toLocaleString('es-ES', { maximumFractionDigits: digits, minimumFractionDigits: digits })}%`;
}

export function formatNumber(value: number | null | undefined, digits = 0): string {
  if (value == null || Number.isNaN(value)) return 'n/d';
  return value.toLocaleString('es-ES', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  });
}

export function formatSeats(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return 'n/d';
  return Math.round(value).toLocaleString('es-ES');
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(`${value}T00:00:00`));
}

export function formatMonthYear(value: string | null | undefined): string {
  if (!value) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-ES', {
    month: 'long',
    year: 'numeric'
  }).format(new Date(`${value}T00:00:00`));
}
