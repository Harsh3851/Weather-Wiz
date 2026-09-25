import type { Request, Response } from 'express';
import {
  forecastQuerySchema,
  coordinatesQuerySchema,
  geocodeQuerySchema,
  type WeatherEnvelope,
} from '@weatherwiz/shared';
import { parseInput } from '../lib/validate';
import type { CacheResult } from '../services/cache.service';
import type { WeatherService } from '../services/weather.service';

function send<T>(res: Response, result: CacheResult<T>, maxAgeSeconds: number) {
  const body: WeatherEnvelope<T> = {
    data: result.value,
    meta: { cache: result.status, fetchedAt: result.fetchedAt.toISOString(), source: 'open-meteo' },
  };
  res.set('X-Cache', result.status);
  res.set('Cache-Control', `public, max-age=${maxAgeSeconds}`);
  res.json(body);
}

export function createWeatherController(weather: WeatherService) {
  return {
    async geocode(req: Request, res: Response) {
      const { q, count } = parseInput(geocodeQuerySchema, req.query);
      send(res, await weather.geocode(q, count), 3600);
    },
    async forecast(req: Request, res: Response) {
      const { lat, lon, days } = parseInput(forecastQuerySchema, req.query);
      send(res, await weather.forecast(lat, lon, days), 60);
    },
    async airQuality(req: Request, res: Response) {
      const { lat, lon } = parseInput(coordinatesQuerySchema, req.query);
      send(res, await weather.airQuality(lat, lon), 300);
    },
  };
}
