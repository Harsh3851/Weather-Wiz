import { describe, expect, it } from 'vitest';
import { RefreshToken } from '../src/models/RefreshToken';
import { makeAgent, registerUser } from './helpers';

function refreshCookie(res: { headers: Record<string, unknown> }): string | undefined {
  const cookies = res.headers['set-cookie'] as string[] | undefined;
  return cookies?.find((c) => c.startsWith('ww_refresh='));
}

describe('auth', () => {
  it('registers a user, sets an httpOnly refresh cookie and never leaks the hash', async () => {
    const agent = makeAgent();
    const res = await agent
      .post('/api/auth/register')
      .send({ name: 'Asha', email: 'Asha@Example.com', password: 'secret123' })
      .expect(201);
    expect(res.body.user).toMatchObject({ name: 'Asha', email: 'asha@example.com', isDemo: false });
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.user.preferences).toEqual({
      temperatureUnit: 'celsius',
      windUnit: 'kmh',
      timeFormat: '24h',
      theme: 'system',
    });
    expect(res.body.accessToken).toEqual(expect.any(String));
    const cookie = refreshCookie(res);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/Path=\/api\/auth/);
  });

  it('rejects weak passwords and duplicate emails', async () => {
    const agent = makeAgent();
    const weak = await agent
      .post('/api/auth/register')
      .send({ name: 'Asha', email: 'a@example.com', password: 'short' })
      .expect(400);
    expect(weak.body.error.details[0].path).toBe('password');

    await agent
      .post('/api/auth/register')
      .send({ name: 'Asha', email: 'dup@example.com', password: 'secret123' })
      .expect(201);
    const dup = await agent
      .post('/api/auth/register')
      .send({ name: 'Asha', email: 'dup@example.com', password: 'secret123' })
      .expect(409);
    expect(dup.body.error.code).toBe('CONFLICT');
  });

  it('logs in with valid credentials and rejects invalid ones with the same message', async () => {
    const agent = makeAgent();
    await agent
      .post('/api/auth/register')
      .send({ name: 'Ravi', email: 'ravi@example.com', password: 'secret123' })
      .expect(201);

    const ok = await agent
      .post('/api/auth/login')
      .send({ email: 'ravi@example.com', password: 'secret123' })
      .expect(200);
    expect(ok.body.user.email).toBe('ravi@example.com');

    const wrong = await agent
      .post('/api/auth/login')
      .send({ email: 'ravi@example.com', password: 'nope12345' })
      .expect(401);
    const missing = await agent
      .post('/api/auth/login')
      .send({ email: 'ghost@example.com', password: 'nope12345' })
      .expect(401);
    expect(wrong.body.error.message).toBe(missing.body.error.message);
  });

  it('protects /me and accepts a valid bearer token', async () => {
    const agent = makeAgent();
    await agent.get('/api/auth/me').expect(401);
    await agent.get('/api/auth/me').set('Authorization', 'Bearer not-a-jwt').expect(401);
    const { token } = await registerUser(agent);
    const me = await agent.get('/api/auth/me').set('Authorization', `Bearer ${token}`).expect(200);
    expect(me.body.user.name).toBe('Test User');
  });

  it('rotates refresh tokens and revokes the family on reuse', async () => {
    const agent = makeAgent();
    const reg = await agent
      .post('/api/auth/register')
      .send({ name: 'Rotating', email: 'rot@example.com', password: 'secret123' })
      .expect(201);
    const original = refreshCookie(reg)!.split(';')[0]!;

    // The agent keeps cookies, so this uses the original token.
    const refreshed = await agent.post('/api/auth/refresh').expect(200);
    expect(refreshed.body.accessToken).toEqual(expect.any(String));
    expect(refreshCookie(refreshed)!.split(';')[0]).not.toBe(original);

    // Replaying the rotated-out token is treated as theft.
    const replay = await makeAgent().post('/api/auth/refresh').set('Cookie', original).expect(401);
    expect(replay.body.error.code).toBe('UNAUTHORIZED');

    // ...which also invalidates the legitimately rotated token.
    await agent.post('/api/auth/refresh').expect(401);
    const active = await RefreshToken.countDocuments({ revokedAt: null });
    expect(active).toBe(0);
  });

  it('logs out by revoking the refresh token and clearing the cookie', async () => {
    const agent = makeAgent();
    await registerUser(agent);
    const res = await agent.post('/api/auth/logout').expect(204);
    expect(refreshCookie(res)).toMatch(/Expires=Thu, 01 Jan 1970/);
    await agent.post('/api/auth/refresh').expect(401);
  });

  it('refresh without a cookie is a 401', async () => {
    await makeAgent().post('/api/auth/refresh').expect(401);
  });

  it('one-click demo login creates a seeded demo account once', async () => {
    const agent = makeAgent();
    const first = await agent.post('/api/auth/demo').expect(200);
    expect(first.body.user).toMatchObject({ isDemo: true, email: 'demo@weatherwiz.app' });
    const token = first.body.accessToken as string;
    const locations = await agent
      .get('/api/me/locations')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(locations.body.locations.map((l: { name: string }) => l.name)).toEqual([
      'Noida',
      'Mumbai',
      'Bengaluru',
      'London',
    ]);
    expect(locations.body.locations[0].isDefault).toBe(true);

    const second = await makeAgent().post('/api/auth/demo').expect(200);
    expect(second.body.user.id).toBe(first.body.user.id);
  });
});
