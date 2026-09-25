/**
 * Normalised data transfer objects returned by the Weather Wiz API (and produced
 * in-browser in demo mode). All values are metric: °C, km/h, mm, hPa, metres.
 * Unit conversion is a presentation concern and happens in the client.
 */

export interface GeoLocation {
  /** Open-Meteo / GeoNames id, or null for ad-hoc coordinates (e.g. "use my location"). */
  id: number | null;
  name: string;
  latitude: number;
  longitude: number;
  country: string | null;
  countryCode: string | null;
  /** First-level administrative area, e.g. state or province. */
  admin1: string | null;
  timezone: string | null;
  population: number | null;
}

export type ConditionIcon =
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'freezing-rain'
  | 'snow'
  | 'showers'
  | 'snow-showers'
  | 'thunderstorm';

export interface Condition {
  /** WMO weather interpretation code. */
  code: number;
  label: string;
  icon: ConditionIcon;
}

export interface CurrentWeather {
  time: string;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  dewPoint: number | null;
  precipitation: number;
  cloudCover: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  windGusts: number;
  uvIndex: number | null;
  visibility: number | null;
  isDay: boolean;
  condition: Condition;
}

export interface HourlyPoint {
  time: string;
  temperature: number;
  precipitationProbability: number | null;
  precipitation: number;
  humidity: number;
  windSpeed: number;
  isDay: boolean;
  condition: Condition;
}

export interface DailyPoint {
  date: string;
  temperatureMax: number;
  temperatureMin: number;
  precipitationSum: number;
  precipitationProbabilityMax: number | null;
  windSpeedMax: number;
  windGustsMax: number;
  windDirectionDominant: number | null;
  uvIndexMax: number | null;
  sunrise: string;
  sunset: string;
  daylightDuration: number;
  condition: Condition;
}

export interface Forecast {
  latitude: number;
  longitude: number;
  elevation: number | null;
  timezone: string;
  timezoneAbbreviation: string;
  utcOffsetSeconds: number;
  current: CurrentWeather;
  /** Next 48 hours starting at the current hour (local time of the location). */
  hourly: HourlyPoint[];
  daily: DailyPoint[];
}

export type AqiCategoryKey =
  'good' | 'moderate' | 'sensitive' | 'unhealthy' | 'very-unhealthy' | 'hazardous';

export interface AqiCategory {
  key: AqiCategoryKey;
  label: string;
  advice: string;
}

export interface AirQuality {
  latitude: number;
  longitude: number;
  time: string;
  usAqi: number | null;
  europeanAqi: number | null;
  pm2_5: number | null;
  pm10: number | null;
  carbonMonoxide: number | null;
  nitrogenDioxide: number | null;
  ozone: number | null;
  sulphurDioxide: number | null;
  category: AqiCategory | null;
  hourly: { time: string; usAqi: number | null; pm2_5: number | null }[];
}

export type CacheStatus = 'HIT' | 'MISS' | 'STALE';

/** Envelope for weather payloads so clients can surface freshness. */
export interface WeatherEnvelope<T> {
  data: T;
  meta: {
    cache: CacheStatus;
    fetchedAt: string;
    source: 'open-meteo';
  };
}

export type TemperatureUnit = 'celsius' | 'fahrenheit';
export type WindUnit = 'kmh' | 'ms';
export type TimeFormat = '12h' | '24h';
export type ThemePreference = 'system' | 'light' | 'dark';

export interface Preferences {
  temperatureUnit: TemperatureUnit;
  windUnit: WindUnit;
  timeFormat: TimeFormat;
  theme: ThemePreference;
}

export interface SavedLocation {
  id: string;
  name: string;
  country: string | null;
  countryCode: string | null;
  admin1: string | null;
  latitude: number;
  longitude: number;
  timezone: string | null;
  isDefault: boolean;
  order: number;
  createdAt: string;
}

export interface RecentSearch {
  id: string;
  name: string;
  country: string | null;
  countryCode: string | null;
  admin1: string | null;
  latitude: number;
  longitude: number;
  searchedAt: string;
}

export type AlertMetric =
  | 'precipitationProbability'
  | 'precipitationSum'
  | 'temperatureMax'
  | 'temperatureMin'
  | 'windSpeedMax'
  | 'uvIndexMax';

export type AlertOperator = 'gt' | 'lt';
export type AlertDay = 'today' | 'tomorrow';

export interface AlertRule {
  id: string;
  locationName: string;
  latitude: number;
  longitude: number;
  metric: AlertMetric;
  operator: AlertOperator;
  threshold: number;
  day: AlertDay;
  enabled: boolean;
  createdAt: string;
}

export interface TriggeredAlert {
  ruleId: string;
  locationName: string;
  metric: AlertMetric;
  operator: AlertOperator;
  threshold: number;
  day: AlertDay;
  date: string;
  actual: number;
  message: string;
}

export interface AlertEvaluation {
  evaluatedAt: string;
  triggered: TriggeredAlert[];
  /** Rules that could not be evaluated (e.g. upstream unavailable). */
  errors: { ruleId: string; message: string }[];
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  isDemo: boolean;
  preferences: Preferences;
  createdAt: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}
