import {
  MalformedUpstreamError,
  buildAirQualityUrl,
  buildForecastUrl,
  buildGeocodingUrl,
  isRawError,
  mapAirQuality,
  mapForecast,
  mapGeocoding,
  roundCoord,
  type RawAirQualityResponse,
  type RawForecastResponse,
  type RawGeocodingResponse,
  type WeatherEnvelope,
} from '@weatherwiz/shared';
import { ApiError } from '../api/errors';
import type { WeatherService } from './types';

/**
 * Demo mode: the browser calls Open-Meteo directly (it supports CORS) and runs
 * the same normalisers the API uses, so components receive identical DTOs.
 */
async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { signal });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new ApiError('Cannot reach Open-Meteo. Check your connection.', 0, 'NETWORK_ERROR');
  }
  const body = (await res.json().catch(() => null)) as unknown;
  if (!res.ok || isRawError(body)) {
    const reason = isRawError(body) ? body.reason : undefined;
    throw new ApiError(
      reason ?? `Weather provider error (HTTP ${res.status})`,
      res.status,
      res.status >= 500 ? 'UPSTREAM_ERROR' : 'UPSTREAM_BAD_REQUEST',
    );
  }
  return body as T;
}

function envelope<T>(data: T): WeatherEnvelope<T> {
  return {
    data,
    meta: { cache: 'MISS', fetchedAt: new Date().toISOString(), source: 'open-meteo' },
  };
}

function normalise<T>(fn: () => T): T {
  try {
    return fn();
  } catch (err) {
    if (err instanceof MalformedUpstreamError) {
      throw new ApiError('Unexpected response from the weather provider', 502, 'UPSTREAM_ERROR');
    }
    throw err;
  }
}

export const demoWeatherService: WeatherService = {
  async geocode(query, signal) {
    const raw = await getJson<RawGeocodingResponse>(buildGeocodingUrl(query.trim()), signal);
    return mapGeocoding(raw);
  },
  async forecast(lat, lon, signal) {
    const raw = await getJson<RawForecastResponse>(
      buildForecastUrl(roundCoord(lat), roundCoord(lon)),
      signal,
    );
    return envelope(normalise(() => mapForecast(raw)));
  },
  async airQuality(lat, lon, signal) {
    const raw = await getJson<RawAirQualityResponse>(
      buildAirQualityUrl(roundCoord(lat), roundCoord(lon)),
      signal,
    );
    return envelope(normalise(() => mapAirQuality(raw)));
  },
};
