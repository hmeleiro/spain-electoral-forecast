import { getPartyConfig, NEUTRAL_PARTY_COLOR } from '$lib/config/parties';

export function partyColor(party: string | null | undefined): string {
  return getPartyConfig(party).color ?? NEUTRAL_PARTY_COLOR;
}

export function voteShareRamp(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '#ded7cc';
  if (value >= 35) return '#6b211b';
  if (value >= 30) return '#94372d';
  if (value >= 25) return '#bf5546';
  if (value >= 20) return '#d98172';
  if (value >= 15) return '#e6aaa0';
  return '#ead8d2';
}

export function winnerVoteShareColor(
  winnerColor: string | null | undefined,
  value: number | null | undefined
): string {
  if (!winnerColor || value == null || Number.isNaN(value)) return '#ded7cc';

  const normalized = clamp((value - 12) / 28, 0, 1);
  const partyWeight = 0.22 + normalized * 0.78;
  return mixHexColors('#ffffff', winnerColor, partyWeight);
}

function mixHexColors(baseColor: string, overlayColor: string, overlayWeight: number): string {
  const base = hexToRgb(baseColor);
  const overlay = hexToRgb(overlayColor);
  if (!base || !overlay) return overlayColor;

  const weight = clamp(overlayWeight, 0, 1);
  const red = Math.round(base.red * (1 - weight) + overlay.red * weight);
  const green = Math.round(base.green * (1 - weight) + overlay.green * weight);
  const blue = Math.round(base.blue * (1 - weight) + overlay.blue * weight);

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

function hexToRgb(hex: string): { red: number; green: number; blue: number } | null {
  const normalized = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;

  return {
    red: Number.parseInt(normalized.slice(0, 2), 16),
    green: Number.parseInt(normalized.slice(2, 4), 16),
    blue: Number.parseInt(normalized.slice(4, 6), 16)
  };
}

function toHex(value: number): string {
  return value.toString(16).padStart(2, '0');
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
