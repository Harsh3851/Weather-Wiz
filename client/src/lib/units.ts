import type { TemperatureUnit, WindUnit } from '@weatherwiz/shared';

export function convertTemp(celsius: number, unit: TemperatureUnit): number {
  return unit === 'fahrenheit' ? (celsius * 9) / 5 + 32 : celsius;
}

export function formatTemp(celsius: number, unit: TemperatureUnit, withUnit = false): string {
  const value = Math.round(convertTemp(celsius, unit));
  return withUnit ? `${value}°${unit === 'fahrenheit' ? 'F' : 'C'}` : `${value}°`;
}

export function tempUnitLabel(unit: TemperatureUnit): string {
  return unit === 'fahrenheit' ? '°F' : '°C';
}

export function convertWind(kmh: number, unit: WindUnit): number {
  return unit === 'ms' ? kmh / 3.6 : kmh;
}

export function formatWind(kmh: number, unit: WindUnit): string {
  const v = convertWind(kmh, unit);
  return unit === 'ms' ? `${v.toFixed(1)} m/s` : `${Math.round(v)} km/h`;
}

export function windUnitLabel(unit: WindUnit): string {
  return unit === 'ms' ? 'm/s' : 'km/h';
}

const COMPASS = [
  'N',
  'NNE',
  'NE',
  'ENE',
  'E',
  'ESE',
  'SE',
  'SSE',
  'S',
  'SSW',
  'SW',
  'WSW',
  'W',
  'WNW',
  'NW',
  'NNW',
];

export function compass(degrees: number): string {
  return COMPASS[Math.round((((degrees % 360) + 360) % 360) / 22.5) % 16]!;
}

export function uvLevel(uv: number | null): { label: string; tone: 'ok' | 'warn' | 'danger' } {
  if (uv === null) return { label: 'Not available', tone: 'ok' };
  if (uv < 3) return { label: 'Low', tone: 'ok' };
  if (uv < 6) return { label: 'Moderate', tone: 'warn' };
  if (uv < 8) return { label: 'High', tone: 'warn' };
  if (uv < 11) return { label: 'Very high', tone: 'danger' };
  return { label: 'Extreme', tone: 'danger' };
}

export function formatVisibility(metres: number | null): string {
  if (metres === null) return 'Not available';
  return metres >= 1000
    ? `${(metres / 1000).toFixed(metres >= 10_000 ? 0 : 1)} km`
    : `${Math.round(metres)} m`;
}
