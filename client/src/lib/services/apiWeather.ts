import type { AirQuality, Forecast, GeoLocation, WeatherEnvelope } from '@weatherwiz/shared';
import { request } from '../api/http';
import type { WeatherService } from './types';

export const apiWeatherService: WeatherService = {
  async geocode(query, signal) {
    const res = await request<WeatherEnvelope<GeoLocation[]>>(
      `/geocode?q=${encodeURIComponent(query)}`,
      { signal },
    );
    return res.data;
  },
  forecast(lat, lon, signal) {
    return request<WeatherEnvelope<Forecast>>(`/weather/forecast?lat=${lat}&lon=${lon}`, {
      signal,
    });
  },
  airQuality(lat, lon, signal) {
    return request<WeatherEnvelope<AirQuality>>(`/weather/air-quality?lat=${lat}&lon=${lon}`, {
      signal,
    });
  },
};
