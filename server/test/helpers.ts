import supertest from 'supertest';
import nock from 'nock';
import { createApp } from '../src/app';
import { loadConfig } from '../src/config/env';
import forecastFixture from '../../shared/test/fixtures/forecast-noida.json';
import airFixture from '../../shared/test/fixtures/air-quality-noida.json';
import geocodeFixture from '../../shared/test/fixtures/geocoding-noida.json';

export const fixtures = { forecast: forecastFixture, air: airFixture, geocode: geocodeFixture };

export const FORECAST_HOST = 'https://api.open-meteo.com';
export const AIR_HOST = 'https://air-quality-api.open-meteo.com';
export const GEO_HOST = 'https://geocoding-api.open-meteo.com';

export function testConfig(overrides: Record<string, string> = {}) {
  return loadConfig({
    NODE_ENV: 'test',
    UPSTREAM_TIMEOUT_MS: '300',
    UPSTREAM_RETRIES: '1',
    UPSTREAM_RETRY_BASE_DELAY_MS: '0',
    RATE_LIMIT_MAX: '1000',
    AUTH_RATE_LIMIT_MAX: '1000',
    CORS_ORIGINS: 'http://localhost:5173',
    ...overrides,
  });
}

export function makeAgent(overrides: Record<string, string> = {}) {
  return supertest.agent(createApp(testConfig(overrides)));
}

export function mockForecast(times = 1, status = 200, body: unknown = forecastFixture) {
  return nock(FORECAST_HOST)
    .get('/v1/forecast')
    .query(true)
    .times(times)
    .reply(status, body as nock.Body);
}

export function mockAir(times = 1, status = 200, body: unknown = airFixture) {
  return nock(AIR_HOST)
    .get('/v1/air-quality')
    .query(true)
    .times(times)
    .reply(status, body as nock.Body);
}

export function mockGeocode(times = 1, status = 200, body: unknown = geocodeFixture) {
  return nock(GEO_HOST)
    .get('/v1/search')
    .query(true)
    .times(times)
    .reply(status, body as nock.Body);
}

let counter = 0;
export async function registerUser(agent: ReturnType<typeof makeAgent>) {
  counter += 1;
  const res = await agent
    .post('/api/auth/register')
    .send({ name: 'Test User', email: `user${counter}@example.com`, password: 'secret123' })
    .expect(201);
  return { token: res.body.accessToken as string, user: res.body.user };
}
