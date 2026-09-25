import { describe, expect, it } from 'vitest';
import forecastRaw from './fixtures/forecast-noida.json';
import airRaw from './fixtures/air-quality-noida.json';
import geoRaw from './fixtures/geocoding-noida.json';
import {
  MalformedUpstreamError,
  aqiCategory,
  buildForecastUrl,
  describeWeatherCode,
  evaluateAlertRule,
  mapAirQuality,
  mapForecast,
  mapGeocoding,
  roundCoord,
  type AlertRule,
  type RawForecastResponse,
} from '../src';

describe('mapGeocoding', () => {
  it('normalises Open-Meteo results', () => {
    const results = mapGeocoding(geoRaw);
    expect(results[0]).toMatchObject({
      name: 'Noida',
      country: 'India',
      countryCode: 'IN',
      admin1: 'Uttar Pradesh',
      timezone: 'Asia/Kolkata',
    });
  });

  it('returns an empty list when there are no results', () => {
    expect(mapGeocoding({})).toEqual([]);
  });
});

describe('mapForecast', () => {
  const forecast = mapForecast(forecastRaw as RawForecastResponse);

  it('maps current conditions with a described weather code', () => {
    expect(forecast.timezone).toBe('Asia/Kolkata');
    expect(typeof forecast.current.temperature).toBe('number');
    expect(forecast.current.condition.label).toBeTruthy();
  });

  it('maps 48 hourly points and 14 daily points', () => {
    expect(forecast.hourly).toHaveLength(48);
    expect(forecast.daily).toHaveLength(14);
    expect(forecast.daily[0]!.sunrise).toMatch(/T\d{2}:\d{2}$/);
  });

  it('rejects payloads without a current block', () => {
    expect(() => mapForecast({ latitude: 0, longitude: 0 })).toThrow(MalformedUpstreamError);
  });
});

describe('mapAirQuality', () => {
  it('derives an AQI category', () => {
    const aq = mapAirQuality(airRaw);
    expect(aq.usAqi).toBe(119);
    expect(aq.category?.key).toBe('sensitive');
    expect(aq.hourly.length).toBe(24);
  });
});

describe('helpers', () => {
  it('describes unknown weather codes safely', () => {
    expect(describeWeatherCode(1234).label).toBe('Unknown');
    expect(describeWeatherCode(95).icon).toBe('thunderstorm');
  });

  it('categorises AQI boundaries', () => {
    expect(aqiCategory(50)?.key).toBe('good');
    expect(aqiCategory(51)?.key).toBe('moderate');
    expect(aqiCategory(null)).toBeNull();
  });

  it('rounds coordinates for cache keys', () => {
    expect(roundCoord(28.57645)).toBe(28.58);
  });

  it('builds a forecast URL with metric units and timezone auto', () => {
    const url = new URL(buildForecastUrl(28.58, 77.33, { days: 7 }));
    expect(url.searchParams.get('forecast_days')).toBe('7');
    expect(url.searchParams.get('timezone')).toBe('auto');
  });
});

describe('evaluateAlertRule', () => {
  const forecast = mapForecast(forecastRaw as RawForecastResponse);
  const base: AlertRule = {
    id: 'r1',
    locationName: 'Noida',
    latitude: 28.58,
    longitude: 77.33,
    metric: 'temperatureMax',
    operator: 'gt',
    threshold: -50,
    day: 'tomorrow',
    enabled: true,
    createdAt: new Date().toISOString(),
  };

  it('triggers when the condition holds', () => {
    const alert = evaluateAlertRule(base, forecast);
    expect(alert?.date).toBe(forecast.daily[1]!.date);
    expect(alert?.message).toContain('Noida');
  });

  it('does not trigger when the condition fails or the rule is disabled', () => {
    expect(evaluateAlertRule({ ...base, operator: 'lt' }, forecast)).toBeNull();
    expect(evaluateAlertRule({ ...base, enabled: false }, forecast)).toBeNull();
  });
});
