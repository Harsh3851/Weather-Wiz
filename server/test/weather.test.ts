import nock from 'nock';
import { describe, expect, it } from 'vitest';
import { CacheEntry } from '../src/models/CacheEntry';
import { FORECAST_HOST, makeAgent, mockAir, mockForecast, mockGeocode } from './helpers';

describe('GET /api/geocode', () => {
  it('validates the query', async () => {
    const res = await makeAgent().get('/api/geocode?q=a').expect(400);
    expect(res.body.error).toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(res.body.error.requestId).toBeTruthy();
  });

  it('returns normalised results and caches them (MISS then HIT)', async () => {
    const scope = mockGeocode(1);
    const agent = makeAgent();

    const first = await agent.get('/api/geocode?q=Noida').expect(200);
    expect(first.headers['x-cache']).toBe('MISS');
    expect(first.body.data[0]).toMatchObject({ name: 'Noida', countryCode: 'IN' });
    expect(first.body.meta).toMatchObject({ cache: 'MISS', source: 'open-meteo' });

    const second = await agent.get('/api/geocode?q=noida').expect(200);
    expect(second.headers['x-cache']).toBe('HIT');
    expect(second.body.data).toEqual(first.body.data);
    expect(scope.isDone()).toBe(true);

    const entry = await CacheEntry.findOne({ kind: 'geocode' }).lean();
    expect(entry?.hits).toBeGreaterThanOrEqual(0);
    expect(entry!.expiresAt.getTime()).toBeGreaterThan(entry!.freshUntil.getTime());
  });

  it('handles an empty upstream result set', async () => {
    mockGeocode(1, 200, { generationtime_ms: 0.1 });
    const res = await makeAgent().get('/api/geocode?q=zzzzqq').expect(200);
    expect(res.body.data).toEqual([]);
  });
});

describe('GET /api/weather/forecast', () => {
  it('rejects out-of-range coordinates', async () => {
    const res = await makeAgent().get('/api/weather/forecast?lat=120&lon=0').expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details[0].path).toBe('lat');
  });

  it('returns the normalised forecast DTO and serves the second call from cache', async () => {
    const scope = mockForecast(1);
    const agent = makeAgent();

    const first = await agent.get('/api/weather/forecast?lat=28.5812&lon=77.3301').expect(200);
    expect(first.headers['x-cache']).toBe('MISS');
    const data = first.body.data;
    expect(data.timezone).toBe('Asia/Kolkata');
    expect(data.hourly).toHaveLength(48);
    expect(data.daily).toHaveLength(14);
    expect(data.current).toMatchObject({
      temperature: expect.any(Number),
      condition: { label: expect.any(String), icon: expect.any(String) },
    });

    // Nearby coordinates round to the same cache key.
    const second = await agent.get('/api/weather/forecast?lat=28.58&lon=77.33').expect(200);
    expect(second.headers['x-cache']).toBe('HIT');
    expect(scope.isDone()).toBe(true);
  });

  it('coalesces concurrent identical requests into one upstream call', async () => {
    const scope = mockForecast(1);
    const agent = makeAgent();
    const results = await Promise.all([
      agent.get('/api/weather/forecast?lat=10&lon=10'),
      agent.get('/api/weather/forecast?lat=10&lon=10'),
    ]);
    expect(results.map((r) => r.status)).toEqual([200, 200]);
    expect(scope.isDone()).toBe(true);
  });

  it('retries a 5xx and then fails with a 502 UPSTREAM_ERROR', async () => {
    const scope = mockForecast(2, 503, 'unavailable');
    const res = await makeAgent().get('/api/weather/forecast?lat=1&lon=1').expect(502);
    expect(res.body.error.code).toBe('UPSTREAM_ERROR');
    expect(scope.isDone()).toBe(true); // initial attempt + 1 retry
  });

  it('recovers when a retry succeeds', async () => {
    nock(FORECAST_HOST).get('/v1/forecast').query(true).reply(500);
    mockForecast(1);
    const res = await makeAgent().get('/api/weather/forecast?lat=2&lon=2').expect(200);
    expect(res.headers['x-cache']).toBe('MISS');
  });

  it('maps an upstream timeout to 504 UPSTREAM_TIMEOUT', async () => {
    nock(FORECAST_HOST).get('/v1/forecast').query(true).times(2).delay(800).reply(200, {});
    const res = await makeAgent().get('/api/weather/forecast?lat=3&lon=3').expect(504);
    expect(res.body.error.code).toBe('UPSTREAM_TIMEOUT');
  });

  it('does not retry an upstream 400 and surfaces the reason', async () => {
    const scope = nock(FORECAST_HOST)
      .get('/v1/forecast')
      .query(true)
      .once()
      .reply(400, { error: true, reason: 'Invalid forecast_days' });
    const res = await makeAgent().get('/api/weather/forecast?lat=4&lon=4').expect(400);
    expect(res.body.error).toMatchObject({
      code: 'UPSTREAM_BAD_REQUEST',
      message: 'Invalid forecast_days',
    });
    expect(scope.isDone()).toBe(true);
  });

  it('serves a stale entry when upstream fails after the fresh TTL', async () => {
    mockForecast(1);
    const agent = makeAgent();
    await agent.get('/api/weather/forecast?lat=5&lon=5').expect(200);

    // Age the entry past its fresh window but inside the stale window.
    await CacheEntry.updateMany({}, { $set: { freshUntil: new Date(Date.now() - 1000) } });
    mockForecast(2, 500, 'down');

    const res = await agent.get('/api/weather/forecast?lat=5&lon=5').expect(200);
    expect(res.headers['x-cache']).toBe('STALE');
    expect(res.body.meta.cache).toBe('STALE');
    expect(res.body.data.daily).toHaveLength(14);
  });

  it('refetches once the fresh TTL has passed', async () => {
    const scope = mockForecast(2);
    const agent = makeAgent();
    await agent.get('/api/weather/forecast?lat=6&lon=6').expect(200);
    await CacheEntry.updateMany({}, { $set: { freshUntil: new Date(Date.now() - 1000) } });
    const res = await agent.get('/api/weather/forecast?lat=6&lon=6').expect(200);
    expect(res.headers['x-cache']).toBe('MISS');
    expect(scope.isDone()).toBe(true);
  });

  it('returns 502 for a malformed upstream payload', async () => {
    mockForecast(1, 200, { latitude: 1, longitude: 1 });
    const res = await makeAgent().get('/api/weather/forecast?lat=7&lon=7').expect(502);
    expect(res.body.error.code).toBe('UPSTREAM_ERROR');
  });
});

describe('GET /api/weather/air-quality', () => {
  it('returns AQI with a category', async () => {
    mockAir(1);
    const res = await makeAgent().get('/api/weather/air-quality?lat=28.58&lon=77.33').expect(200);
    expect(res.body.data).toMatchObject({ usAqi: 119, category: { key: 'sensitive' } });
  });

  it('fails independently of the forecast', async () => {
    mockAir(2, 503);
    const res = await makeAgent().get('/api/weather/air-quality?lat=28.58&lon=77.33').expect(502);
    expect(res.body.error.code).toBe('UPSTREAM_ERROR');
  });
});

describe('platform', () => {
  it('reports health', async () => {
    const res = await makeAgent().get('/api/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', db: 'up' });
  });

  it('returns the error shape for unknown routes', async () => {
    const res = await makeAgent().get('/api/nope').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('rejects malformed JSON bodies', async () => {
    const res = await makeAgent()
      .post('/api/auth/login')
      .set('content-type', 'application/json')
      .send('{"email":')
      .expect(400);
    expect(res.body.error.message).toMatch(/valid JSON/);
  });

  it('sets security headers and CORS for allowed origins only', async () => {
    const allowed = await makeAgent().get('/api/health').set('Origin', 'http://localhost:5173');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(allowed.headers['x-content-type-options']).toBe('nosniff');
    const blocked = await makeAgent().get('/api/health').set('Origin', 'https://evil.example');
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('rate-limits with the standard error shape', async () => {
    const agent = makeAgent({ RATE_LIMIT_MAX: '2' });
    await agent.get('/api/health');
    await agent.get('/api/health');
    const res = await agent.get('/api/health').expect(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });
});
