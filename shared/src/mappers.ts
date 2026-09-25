import { aqiCategory } from './aqi';
import type { RawAirQualityResponse, RawForecastResponse, RawGeocodingResponse } from './openMeteo';
import type { AirQuality, DailyPoint, Forecast, GeoLocation, HourlyPoint } from './types';
import { describeWeatherCode } from './weatherCodes';

/** Thrown when an upstream payload is missing fields we depend on. */
export class MalformedUpstreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MalformedUpstreamError';
  }
}

type Bag = Record<string, unknown> | undefined;

function num(bag: Bag, key: string): number | null {
  const v = bag?.[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function req(bag: Bag, key: string, context: string): number {
  const v = num(bag, key);
  if (v === null) throw new MalformedUpstreamError(`Missing ${context}.${key}`);
  return v;
}

function at(series: unknown, i: number): number | null {
  if (!Array.isArray(series)) return null;
  const v: unknown = series[i];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function str(series: unknown, i: number): string | null {
  if (!Array.isArray(series)) return null;
  const v: unknown = series[i];
  return typeof v === 'string' ? v : null;
}

export function mapGeocoding(raw: RawGeocodingResponse): GeoLocation[] {
  return (raw.results ?? [])
    .filter(
      (r) =>
        typeof r.name === 'string' &&
        typeof r.latitude === 'number' &&
        typeof r.longitude === 'number',
    )
    .map((r) => ({
      id: typeof r.id === 'number' ? r.id : null,
      name: r.name!,
      latitude: r.latitude!,
      longitude: r.longitude!,
      country: r.country ?? null,
      countryCode: r.country_code ?? null,
      admin1: r.admin1 ?? null,
      timezone: r.timezone ?? null,
      population: typeof r.population === 'number' ? r.population : null,
    }));
}

export function mapForecast(raw: RawForecastResponse): Forecast {
  const c = raw.current as Bag;
  if (!c || typeof c.time !== 'string') throw new MalformedUpstreamError('Missing current block');

  const hourlyTimes = raw.hourly?.time ?? [];
  const h = raw.hourly as Bag;
  const hourly: HourlyPoint[] = hourlyTimes.map((time, i) => ({
    time,
    temperature: at(h?.temperature_2m, i) ?? 0,
    precipitationProbability: at(h?.precipitation_probability, i),
    precipitation: at(h?.precipitation, i) ?? 0,
    humidity: at(h?.relative_humidity_2m, i) ?? 0,
    windSpeed: at(h?.wind_speed_10m, i) ?? 0,
    isDay: at(h?.is_day, i) === 1,
    condition: describeWeatherCode(at(h?.weather_code, i)),
  }));

  const dailyTimes = raw.daily?.time ?? [];
  const d = raw.daily as Bag;
  const daily: DailyPoint[] = dailyTimes.map((date, i) => ({
    date,
    temperatureMax: at(d?.temperature_2m_max, i) ?? 0,
    temperatureMin: at(d?.temperature_2m_min, i) ?? 0,
    precipitationSum: at(d?.precipitation_sum, i) ?? 0,
    precipitationProbabilityMax: at(d?.precipitation_probability_max, i),
    windSpeedMax: at(d?.wind_speed_10m_max, i) ?? 0,
    windGustsMax: at(d?.wind_gusts_10m_max, i) ?? 0,
    windDirectionDominant: at(d?.wind_direction_10m_dominant, i),
    uvIndexMax: at(d?.uv_index_max, i),
    sunrise: str(d?.sunrise, i) ?? `${date}T06:00`,
    sunset: str(d?.sunset, i) ?? `${date}T18:00`,
    daylightDuration: at(d?.daylight_duration, i) ?? 0,
    condition: describeWeatherCode(at(d?.weather_code, i)),
  }));

  return {
    latitude: raw.latitude,
    longitude: raw.longitude,
    elevation: typeof raw.elevation === 'number' ? raw.elevation : null,
    timezone: raw.timezone ?? 'GMT',
    timezoneAbbreviation: raw.timezone_abbreviation ?? 'GMT',
    utcOffsetSeconds: raw.utc_offset_seconds ?? 0,
    current: {
      time: c.time,
      temperature: req(c, 'temperature_2m', 'current'),
      apparentTemperature: num(c, 'apparent_temperature') ?? req(c, 'temperature_2m', 'current'),
      humidity: num(c, 'relative_humidity_2m') ?? 0,
      dewPoint: num(c, 'dew_point_2m'),
      precipitation: num(c, 'precipitation') ?? 0,
      cloudCover: num(c, 'cloud_cover') ?? 0,
      pressure: num(c, 'pressure_msl') ?? 0,
      windSpeed: num(c, 'wind_speed_10m') ?? 0,
      windDirection: num(c, 'wind_direction_10m') ?? 0,
      windGusts: num(c, 'wind_gusts_10m') ?? 0,
      uvIndex: num(c, 'uv_index'),
      visibility: num(c, 'visibility'),
      isDay: num(c, 'is_day') === 1,
      condition: describeWeatherCode(num(c, 'weather_code')),
    },
    hourly,
    daily,
  };
}

export function mapAirQuality(raw: RawAirQualityResponse): AirQuality {
  const c = raw.current as Bag;
  const h = raw.hourly as Bag;
  const usAqi = num(c, 'us_aqi');
  return {
    latitude: raw.latitude,
    longitude: raw.longitude,
    time: typeof c?.time === 'string' ? c.time : '',
    usAqi,
    europeanAqi: num(c, 'european_aqi'),
    pm2_5: num(c, 'pm2_5'),
    pm10: num(c, 'pm10'),
    carbonMonoxide: num(c, 'carbon_monoxide'),
    nitrogenDioxide: num(c, 'nitrogen_dioxide'),
    ozone: num(c, 'ozone'),
    sulphurDioxide: num(c, 'sulphur_dioxide'),
    category: aqiCategory(usAqi),
    hourly: (raw.hourly?.time ?? []).map((time, i) => ({
      time,
      usAqi: at(h?.us_aqi, i),
      pm2_5: at(h?.pm2_5, i),
    })),
  };
}
