import type {
  AirQuality,
  AlertEvaluation,
  AlertRule,
  AlertRuleInput,
  Forecast,
  GeoLocation,
  LocationInput,
  Preferences,
  RecentSearch,
  SavedLocation,
  SavedLocationInput,
  SavedLocationPatch,
  WeatherEnvelope,
} from '@weatherwiz/shared';

/** Weather data source. Implemented by the API client and by direct Open-Meteo calls. */
export interface WeatherService {
  geocode(query: string, signal?: AbortSignal): Promise<GeoLocation[]>;
  forecast(lat: number, lon: number, signal?: AbortSignal): Promise<WeatherEnvelope<Forecast>>;
  airQuality(lat: number, lon: number, signal?: AbortSignal): Promise<WeatherEnvelope<AirQuality>>;
}

/** Per-user data. Implemented by the API (signed in) and localStorage (demo / signed out). */
export interface UserDataService {
  readonly kind: 'api' | 'local';
  getPreferences(): Promise<Preferences>;
  updatePreferences(patch: Partial<Preferences>): Promise<Preferences>;
  listLocations(): Promise<SavedLocation[]>;
  addLocation(input: SavedLocationInput): Promise<SavedLocation>;
  updateLocation(id: string, patch: SavedLocationPatch): Promise<SavedLocation>;
  removeLocation(id: string): Promise<void>;
  reorderLocations(ids: string[]): Promise<SavedLocation[]>;
  listRecent(): Promise<RecentSearch[]>;
  addRecent(input: LocationInput): Promise<RecentSearch[]>;
  clearRecent(): Promise<void>;
  listAlertRules(): Promise<AlertRule[]>;
  createAlertRule(input: AlertRuleInput): Promise<AlertRule>;
  setAlertRuleEnabled(id: string, enabled: boolean): Promise<AlertRule>;
  deleteAlertRule(id: string): Promise<void>;
  evaluateAlerts(): Promise<AlertEvaluation>;
}
