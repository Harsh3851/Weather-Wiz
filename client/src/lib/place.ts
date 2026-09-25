import { DEFAULT_LOCATION, roundCoord } from '@weatherwiz/shared';

/** The minimum needed to show weather for somewhere. */
export interface Place {
  name: string;
  latitude: number;
  longitude: number;
  country?: string | null;
  countryCode?: string | null;
  admin1?: string | null;
  timezone?: string | null;
}

export const DEFAULT_PLACE: Place = DEFAULT_LOCATION;

export function samePlace(a: Place, b: Place): boolean {
  return (
    roundCoord(a.latitude) === roundCoord(b.latitude) &&
    roundCoord(a.longitude) === roundCoord(b.longitude)
  );
}

export function placeToParams(place: Place): URLSearchParams {
  const p = new URLSearchParams();
  p.set('lat', String(roundCoord(place.latitude, 4)));
  p.set('lon', String(roundCoord(place.longitude, 4)));
  p.set('name', place.name);
  if (place.admin1) p.set('admin1', place.admin1);
  if (place.country) p.set('country', place.country);
  if (place.countryCode) p.set('cc', place.countryCode);
  return p;
}

export function placeFromParams(params: URLSearchParams, prefix = ''): Place | null {
  const lat = Number(params.get(`${prefix}lat`));
  const lon = Number(params.get(`${prefix}lon`));
  const rawLat = params.get(`${prefix}lat`);
  const rawLon = params.get(`${prefix}lon`);
  if (rawLat === null || rawLon === null || !Number.isFinite(lat) || !Number.isFinite(lon))
    return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return {
    name: params.get(`${prefix}name`)?.slice(0, 120) || 'Selected location',
    latitude: lat,
    longitude: lon,
    admin1: params.get(`${prefix}admin1`),
    country: params.get(`${prefix}country`),
    countryCode: params.get(`${prefix}cc`),
  };
}
