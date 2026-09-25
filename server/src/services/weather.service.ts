import type { Logger } from 'pino';
import {
  DEFAULT_FORECAST_DAYS,
  MalformedUpstreamError,
  buildAirQualityUrl,
  buildForecastUrl,
  buildGeocodingUrl,
  isRawError,
  mapAirQuality,
  mapForecast,
  mapGeocoding,
  roundCoord,
  type AirQuality,
  type Forecast,
  type GeoLocation,
  type RawAirQualityResponse,
  type RawForecastResponse,
  type RawGeocodingResponse,
} from '@weatherwiz/shared';
import type { AppConfig } from '../config/env';
import { AppError } from '../lib/errors';
import { fetchJson } from '../lib/upstream';
import type { CacheResult, CacheService } from './cache.service';

export interface WeatherService {
  geocode(query: string, count?: number): Promise<CacheResult<GeoLocation[]>>;
  forecast(lat: number, lon: number, days?: number): Promise<CacheResult<Forecast>>;
  airQuality(lat: number, lon: number): Promise<CacheResult<AirQuality>>;
}

export function createWeatherService(deps: {
  config: AppConfig;
  cache: CacheService;
  logger: Logger;
}): WeatherService {
  const { config, cache, logger } = deps;
  const { baseUrls, ...fetchOpts } = config.upstream;

  async function get<T>(url: string, label: string): Promise<T> {
    const body = await fetchJson<T>(url, { ...fetchOpts, label, logger });
    if (isRawError(body)) {
      throw new AppError(400, 'UPSTREAM_BAD_REQUEST', body.reason ?? 'Rejected by Open-Meteo');
    }
    return body;
  }

  function normalise<T>(fn: () => T): T {
    try {
      return fn();
    } catch (err) {
      if (err instanceof MalformedUpstreamError) {
        throw new AppError(
          502,
          'UPSTREAM_ERROR',
          `Unexpected response from Open-Meteo: ${err.message}`,
        );
      }
      throw err;
    }
  }

  return {
    geocode(query, count = 8) {
      const normalised = query.trim().toLowerCase();
      return cache.getOrFetch(
        `geocode:${normalised}:${count}`,
        'geocode',
        config.cache.geocodeSeconds,
        async () => {
          const raw = await get<RawGeocodingResponse>(
            buildGeocodingUrl(normalised, { count, baseUrl: baseUrls.geocoding }),
            'geocoding',
          );
          return mapGeocoding(raw);
        },
      );
    },

    forecast(lat, lon, days = DEFAULT_FORECAST_DAYS) {
      const rlat = roundCoord(lat);
      const rlon = roundCoord(lon);
      return cache.getOrFetch(
        `forecast:${rlat},${rlon}:${days}`,
        'forecast',
        config.cache.forecastSeconds,
        async () => {
          const raw = await get<RawForecastResponse>(
            buildForecastUrl(rlat, rlon, { days, baseUrl: baseUrls.forecast }),
            'forecast',
          );
          return normalise(() => mapForecast(raw));
        },
      );
    },

    airQuality(lat, lon) {
      const rlat = roundCoord(lat);
      const rlon = roundCoord(lon);
      return cache.getOrFetch(
        `air-quality:${rlat},${rlon}`,
        'air-quality',
        config.cache.airQualitySeconds,
        async () => {
          const raw = await get<RawAirQualityResponse>(
            buildAirQualityUrl(rlat, rlon, { baseUrl: baseUrls.airQuality }),
            'air-quality',
          );
          return normalise(() => mapAirQuality(raw));
        },
      );
    },
  };
}
