import { describe, expect, it, vi } from 'vitest';
import { dayLabel, formatDate, formatHour, formatTime, weekday } from '@/lib/format';
import { placeFromParams, placeToParams } from '@/lib/place';
import { createLocalUserDataService } from '@/lib/services/localUserData';
import type { WeatherService } from '@/lib/services/types';
import { compass, formatTemp, formatWind } from '@/lib/units';

describe('format', () => {
  it('formats dates as DD-MM-YYYY without timezone drift', () => {
    expect(formatDate('2026-09-05T23:30')).toBe('05-09-2026');
    expect(weekday('2026-09-25')).toBe('Friday');
    expect(dayLabel('2026-09-26', '2026-09-25')).toBe('Tomorrow');
  });

  it('formats 12 h and 24 h times', () => {
    expect(formatTime('2026-09-25T00:05', '12h')).toBe('12:05 AM');
    expect(formatTime('2026-09-25T13:45', '12h')).toBe('1:45 PM');
    expect(formatTime('2026-09-25T13:45', '24h')).toBe('13:45');
    expect(formatHour('2026-09-25T12:00', '12h')).toBe('12 PM');
  });
});

describe('units', () => {
  it('converts temperature and wind', () => {
    expect(formatTemp(0, 'fahrenheit', true)).toBe('32°F');
    expect(formatTemp(31.4, 'celsius')).toBe('31°');
    expect(formatWind(36, 'ms')).toBe('10.0 m/s');
    expect(formatWind(13.2, 'kmh')).toBe('13 km/h');
    expect(compass(350)).toBe('N');
    expect(compass(135)).toBe('SE');
  });
});

describe('place params', () => {
  it('round-trips through the URL and rejects invalid coordinates', () => {
    const params = placeToParams({
      name: 'Noida',
      latitude: 28.58,
      longitude: 77.33,
      country: 'India',
    });
    expect(placeFromParams(params)).toMatchObject({
      name: 'Noida',
      latitude: 28.58,
      longitude: 77.33,
      country: 'India',
    });
    expect(placeFromParams(new URLSearchParams('lat=200&lon=0'))).toBeNull();
    expect(placeFromParams(new URLSearchParams(''))).toBeNull();
  });
});

describe('local user data (demo mode)', () => {
  const weather = {
    geocode: vi.fn(),
    forecast: vi.fn(),
    airQuality: vi.fn(),
  } as unknown as WeatherService;
  const base = { country: 'India', countryCode: 'IN', admin1: null, timezone: 'Asia/Kolkata' };

  it('persists favourites with a single default, reorder and duplicate protection', async () => {
    const svc = createLocalUserDataService(weather);
    const a = await svc.addLocation({ ...base, name: 'Noida', latitude: 28.58, longitude: 77.33 });
    const b = await svc.addLocation({ ...base, name: 'Mumbai', latitude: 19.07, longitude: 72.88 });
    expect(a.isDefault).toBe(true);
    expect(b.isDefault).toBe(false);
    await expect(
      svc.addLocation({ ...base, name: 'Noida again', latitude: 28.5801, longitude: 77.33 }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });

    await svc.updateLocation(b.id, { isDefault: true });
    const reordered = await svc.reorderLocations([b.id, a.id]);
    expect(reordered.map((l) => [l.name, l.isDefault])).toEqual([
      ['Mumbai', true],
      ['Noida', false],
    ]);

    await svc.removeLocation(b.id);
    const rest = await svc.listLocations();
    expect(rest).toHaveLength(1);
    expect(rest[0]).toMatchObject({ name: 'Noida', isDefault: true, order: 0 });
  });

  it('stores preferences and keeps recent searches unique', async () => {
    const svc = createLocalUserDataService(weather);
    expect((await svc.getPreferences()).temperatureUnit).toBe('celsius');
    await svc.updatePreferences({ temperatureUnit: 'fahrenheit' });
    expect((await svc.getPreferences()).temperatureUnit).toBe('fahrenheit');

    await svc.addRecent({ name: 'Noida', latitude: 28.58, longitude: 77.33 });
    await svc.addRecent({ name: 'Pune', latitude: 18.52, longitude: 73.86 });
    const list = await svc.addRecent({ name: 'Noida', latitude: 28.58, longitude: 77.33 });
    expect(list.map((r) => r.name)).toEqual(['Noida', 'Pune']);
  });
});
