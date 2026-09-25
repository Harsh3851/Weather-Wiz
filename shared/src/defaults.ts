import type { GeoLocation, Preferences } from './types';

export const DEFAULT_PREFERENCES: Preferences = {
  temperatureUnit: 'celsius',
  windUnit: 'kmh',
  timeFormat: '24h',
  theme: 'system',
};

export const DEFAULT_LOCATION: GeoLocation = {
  id: 7279746,
  name: 'Noida',
  latitude: 28.58,
  longitude: 77.33,
  country: 'India',
  countryCode: 'IN',
  admin1: 'Uttar Pradesh',
  timezone: 'Asia/Kolkata',
  population: 293908,
};

export const MAX_SAVED_LOCATIONS = 20;
export const MAX_RECENT_SEARCHES = 8;
export const MAX_ALERT_RULES = 20;
