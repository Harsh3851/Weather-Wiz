import { describe, expect, it } from 'vitest';
import { makeAgent, mockForecast, registerUser } from './helpers';

const noida = {
  name: 'Noida',
  country: 'India',
  countryCode: 'IN',
  admin1: 'Uttar Pradesh',
  latitude: 28.58,
  longitude: 77.33,
  timezone: 'Asia/Kolkata',
};
const mumbai = {
  ...noida,
  name: 'Mumbai',
  admin1: 'Maharashtra',
  latitude: 19.07,
  longitude: 72.88,
};
const london = {
  ...noida,
  name: 'London',
  country: 'United Kingdom',
  latitude: 51.51,
  longitude: -0.13,
};

async function setup() {
  const agent = makeAgent();
  const { token } = await registerUser(agent);
  const auth = { Authorization: `Bearer ${token}` };
  return { agent, auth };
}

describe('saved locations', () => {
  it('requires authentication', async () => {
    const res = await makeAgent().get('/api/me/locations').expect(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('creates, lists, sets default, reorders and deletes', async () => {
    const { agent, auth } = await setup();
    const a = await agent.post('/api/me/locations').set(auth).send(noida).expect(201);
    expect(a.body.location).toMatchObject({ name: 'Noida', isDefault: true, order: 0 });
    const b = await agent.post('/api/me/locations').set(auth).send(mumbai).expect(201);
    const c = await agent.post('/api/me/locations').set(auth).send(london).expect(201);
    expect(b.body.location.isDefault).toBe(false);

    // Duplicate coordinates are rejected.
    await agent.post('/api/me/locations').set(auth).send(noida).expect(409);

    // Make London the default: only one default at a time.
    await agent
      .patch(`/api/me/locations/${c.body.location.id}`)
      .set(auth)
      .send({ isDefault: true })
      .expect(200);
    let list = await agent.get('/api/me/locations').set(auth).expect(200);
    expect(list.body.locations.filter((l: { isDefault: boolean }) => l.isDefault)).toHaveLength(1);
    expect(list.body.locations.find((l: { isDefault: boolean }) => l.isDefault).name).toBe(
      'London',
    );

    // Reorder.
    const ids = [c.body.location.id, a.body.location.id, b.body.location.id];
    const reordered = await agent
      .put('/api/me/locations/order')
      .set(auth)
      .send({ ids })
      .expect(200);
    expect(reordered.body.locations.map((l: { name: string }) => l.name)).toEqual([
      'London',
      'Noida',
      'Mumbai',
    ]);

    // Reorder must list every id exactly once.
    await agent
      .put('/api/me/locations/order')
      .set(auth)
      .send({ ids: [ids[0]] })
      .expect(400);

    // Deleting the default promotes the first remaining location.
    await agent.delete(`/api/me/locations/${c.body.location.id}`).set(auth).expect(204);
    list = await agent.get('/api/me/locations').set(auth).expect(200);
    expect(list.body.locations).toHaveLength(2);
    expect(list.body.locations[0]).toMatchObject({ name: 'Noida', isDefault: true, order: 0 });

    await agent.delete('/api/me/locations/not-an-id').set(auth).expect(404);
  });

  it("isolates users' data", async () => {
    const first = await setup();
    const created = await first.agent
      .post('/api/me/locations')
      .set(first.auth)
      .send(noida)
      .expect(201);
    const second = await setup();
    await second.agent
      .delete(`/api/me/locations/${created.body.location.id}`)
      .set(second.auth)
      .expect(404);
    const list = await second.agent.get('/api/me/locations').set(second.auth).expect(200);
    expect(list.body.locations).toEqual([]);
  });
});

describe('preferences', () => {
  it('reads and partially updates preferences', async () => {
    const { agent, auth } = await setup();
    const res = await agent
      .patch('/api/me/preferences')
      .set(auth)
      .send({ temperatureUnit: 'fahrenheit', theme: 'dark' })
      .expect(200);
    expect(res.body.preferences).toMatchObject({
      temperatureUnit: 'fahrenheit',
      theme: 'dark',
      windUnit: 'kmh',
    });
    await agent.patch('/api/me/preferences').set(auth).send({ windUnit: 'mph' }).expect(400);
    await agent.patch('/api/me/preferences').set(auth).send({}).expect(400);
    const me = await agent.get('/api/auth/me').set(auth).expect(200);
    expect(me.body.user.preferences.temperatureUnit).toBe('fahrenheit');
  });
});

describe('recent searches', () => {
  it('keeps unique, most-recent-first entries and can be cleared', async () => {
    const { agent, auth } = await setup();
    await agent.post('/api/me/recent-searches').set(auth).send(noida).expect(201);
    await agent.post('/api/me/recent-searches').set(auth).send(mumbai).expect(201);
    const res = await agent.post('/api/me/recent-searches').set(auth).send(noida).expect(201);
    expect(res.body.searches.map((s: { name: string }) => s.name)).toEqual(['Noida', 'Mumbai']);

    await agent.delete('/api/me/recent-searches').set(auth).expect(204);
    const list = await agent.get('/api/me/recent-searches').set(auth).expect(200);
    expect(list.body.searches).toEqual([]);
  });

  it('caps the list length', async () => {
    const { agent, auth } = await setup();
    for (let i = 0; i < 10; i++) {
      await agent
        .post('/api/me/recent-searches')
        .set(auth)
        .send({ ...noida, name: `Place ${i}`, latitude: i, longitude: i })
        .expect(201);
    }
    const list = await agent.get('/api/me/recent-searches').set(auth).expect(200);
    expect(list.body.searches).toHaveLength(8);
    expect(list.body.searches[0].name).toBe('Place 9');
  });
});

describe('alert rules', () => {
  const rule = {
    locationName: 'Noida',
    latitude: 28.58,
    longitude: 77.33,
    metric: 'temperatureMax',
    operator: 'gt',
    threshold: -40,
    day: 'tomorrow',
  };

  it('creates, toggles and deletes rules', async () => {
    const { agent, auth } = await setup();
    const created = await agent.post('/api/me/alerts').set(auth).send(rule).expect(201);
    expect(created.body.rule).toMatchObject({ enabled: true, metric: 'temperatureMax' });
    await agent
      .post('/api/me/alerts')
      .set(auth)
      .send({ ...rule, metric: 'snowDepth' })
      .expect(400);

    const toggled = await agent
      .patch(`/api/me/alerts/${created.body.rule.id}`)
      .set(auth)
      .send({ enabled: false })
      .expect(200);
    expect(toggled.body.rule.enabled).toBe(false);

    await agent.delete(`/api/me/alerts/${created.body.rule.id}`).set(auth).expect(204);
    const list = await agent.get('/api/me/alerts').set(auth).expect(200);
    expect(list.body.rules).toEqual([]);
  });

  it('evaluates enabled rules against the (cached) forecast', async () => {
    const { agent, auth } = await setup();
    await agent.post('/api/me/alerts').set(auth).send(rule).expect(201);
    await agent
      .post('/api/me/alerts')
      .set(auth)
      .send({ ...rule, operator: 'lt' })
      .expect(201);
    const scope = mockForecast(1);

    const res = await agent.get('/api/me/alerts/evaluate').set(auth).expect(200);
    expect(res.body.triggered).toHaveLength(1);
    expect(res.body.triggered[0]).toMatchObject({ locationName: 'Noida', day: 'tomorrow' });
    expect(res.body.errors).toEqual([]);
    expect(scope.isDone()).toBe(true);
  });

  it('reports rules that could not be evaluated', async () => {
    const { agent, auth } = await setup();
    await agent.post('/api/me/alerts').set(auth).send(rule).expect(201);
    mockForecast(2, 503);
    const res = await agent.get('/api/me/alerts/evaluate').set(auth).expect(200);
    expect(res.body.triggered).toEqual([]);
    expect(res.body.errors).toHaveLength(1);
  });
});
