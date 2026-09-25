import type { Condition, ConditionIcon } from './types';

const CODES: Record<number, [string, ConditionIcon]> = {
  0: ['Clear sky', 'clear'],
  1: ['Mainly clear', 'clear'],
  2: ['Partly cloudy', 'partly-cloudy'],
  3: ['Overcast', 'cloudy'],
  45: ['Fog', 'fog'],
  48: ['Depositing rime fog', 'fog'],
  51: ['Light drizzle', 'drizzle'],
  53: ['Drizzle', 'drizzle'],
  55: ['Dense drizzle', 'drizzle'],
  56: ['Light freezing drizzle', 'freezing-rain'],
  57: ['Freezing drizzle', 'freezing-rain'],
  61: ['Light rain', 'rain'],
  63: ['Rain', 'rain'],
  65: ['Heavy rain', 'rain'],
  66: ['Light freezing rain', 'freezing-rain'],
  67: ['Freezing rain', 'freezing-rain'],
  71: ['Light snow', 'snow'],
  73: ['Snow', 'snow'],
  75: ['Heavy snow', 'snow'],
  77: ['Snow grains', 'snow'],
  80: ['Light showers', 'showers'],
  81: ['Showers', 'showers'],
  82: ['Violent showers', 'showers'],
  85: ['Snow showers', 'snow-showers'],
  86: ['Heavy snow showers', 'snow-showers'],
  95: ['Thunderstorm', 'thunderstorm'],
  96: ['Thunderstorm with hail', 'thunderstorm'],
  99: ['Severe thunderstorm with hail', 'thunderstorm'],
};

/** Maps a WMO weather interpretation code to a human label and icon key. */
export function describeWeatherCode(code: number | null | undefined): Condition {
  const safe = typeof code === 'number' ? code : -1;
  const entry = CODES[safe];
  if (!entry) return { code: safe, label: 'Unknown', icon: 'cloudy' };
  return { code: safe, label: entry[0], icon: entry[1] };
}
