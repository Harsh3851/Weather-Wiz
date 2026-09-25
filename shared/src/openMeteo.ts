/**
 * Open-Meteo request builders and raw response types.
 * Data by Open-Meteo.com, licensed under CC BY 4.0 (https://open-meteo.com/en/license).
 */

export const OPEN_METEO_DEFAULT_BASE_URLS = {
  geocoding: 'https://geocoding-api.open-meteo.com',
  forecast: 'https://api.open-meteo.com',
  airQuality: 'https://air-quality-api.open-meteo.com',
} as const;

export type OpenMeteoBaseUrls = { [K in keyof typeof OPEN_METEO_DEFAULT_BASE_URLS]: string };

export const FORECAST_CURRENT_VARS = [
  'temperature_2m',
  'relative_humidity_2m',
  'apparent_temperature',
  'dew_point_2m',
  'is_day',
  'precipitation',
  'weather_code',
  'cloud_cover',
  'pressure_msl',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
  'uv_index',
  'visibility',
] as const;

export const FORECAST_HOURLY_VARS = [
  'temperature_2m',
  'precipitation_probability',
  'precipitation',
  'relative_humidity_2m',
  'weather_code',
  'is_day',
  'wind_speed_10m',
] as const;

export const FORECAST_DAILY_VARS = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'sunrise',
  'sunset',
  'daylight_duration',
  'uv_index_max',
  'precipitation_sum',
  'precipitation_probability_max',
  'wind_speed_10m_max',
  'wind_gusts_10m_max',
  'wind_direction_10m_dominant',
] as const;

export const AIR_QUALITY_CURRENT_VARS = [
  'us_aqi',
  'european_aqi',
  'pm2_5',
  'pm10',
  'carbon_monoxide',
  'nitrogen_dioxide',
  'ozone',
  'sulphur_dioxide',
] as const;

export const HOURLY_FORECAST_HOURS = 48;
export const MIN_FORECAST_DAYS = 1;
export const MAX_FORECAST_DAYS = 16;
export const DEFAULT_FORECAST_DAYS = 14;

/** Rounds coordinates to ~1.1 km so nearby requests share a cache entry. */
export function roundCoord(value: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

export function buildGeocodingUrl(
  query: string,
  opts: { count?: number; language?: string; baseUrl?: string } = {},
): string {
  const url = new URL('/v1/search', opts.baseUrl ?? OPEN_METEO_DEFAULT_BASE_URLS.geocoding);
  url.searchParams.set('name', query);
  url.searchParams.set('count', String(opts.count ?? 8));
  url.searchParams.set('language', opts.language ?? 'en');
  url.searchParams.set('format', 'json');
  return url.toString();
}

export function buildForecastUrl(
  latitude: number,
  longitude: number,
  opts: { days?: number; baseUrl?: string } = {},
): string {
  const url = new URL('/v1/forecast', opts.baseUrl ?? OPEN_METEO_DEFAULT_BASE_URLS.forecast);
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('current', FORECAST_CURRENT_VARS.join(','));
  url.searchParams.set('hourly', FORECAST_HOURLY_VARS.join(','));
  url.searchParams.set('daily', FORECAST_DAILY_VARS.join(','));
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', String(opts.days ?? DEFAULT_FORECAST_DAYS));
  url.searchParams.set('forecast_hours', String(HOURLY_FORECAST_HOURS));
  url.searchParams.set('wind_speed_unit', 'kmh');
  return url.toString();
}

export function buildAirQualityUrl(
  latitude: number,
  longitude: number,
  opts: { baseUrl?: string } = {},
): string {
  const url = new URL('/v1/air-quality', opts.baseUrl ?? OPEN_METEO_DEFAULT_BASE_URLS.airQuality);
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('current', AIR_QUALITY_CURRENT_VARS.join(','));
  url.searchParams.set('hourly', 'us_aqi,pm2_5');
  url.searchParams.set('forecast_hours', '24');
  url.searchParams.set('timezone', 'auto');
  return url.toString();
}

// ---------------------------------------------------------------------------
// Raw response shapes (only the fields we read).
// ---------------------------------------------------------------------------

type Nullable<T> = T | null | undefined;
type Series<T = number> = Nullable<Nullable<T>[]>;

export interface RawGeocodingResult {
  id?: number;
  name?: string;
  latitude?: number;
  longitude?: number;
  country?: string;
  country_code?: string;
  admin1?: string;
  timezone?: string;
  population?: number;
}

export interface RawGeocodingResponse {
  results?: RawGeocodingResult[];
}

export interface RawForecastResponse {
  latitude: number;
  longitude: number;
  elevation?: number;
  timezone?: string;
  timezone_abbreviation?: string;
  utc_offset_seconds?: number;
  current?: Record<string, Nullable<number | string>>;
  hourly?: { time?: string[] } & Record<string, Series<number | string>>;
  daily?: { time?: string[] } & Record<string, Series<number | string>>;
}

export interface RawAirQualityResponse {
  latitude: number;
  longitude: number;
  current?: Record<string, Nullable<number | string>>;
  hourly?: { time?: string[] } & Record<string, Series<number | string>>;
}

export interface RawErrorResponse {
  error: true;
  reason?: string;
}

export function isRawError(body: unknown): body is RawErrorResponse {
  return typeof body === 'object' && body !== null && (body as RawErrorResponse).error === true;
}
