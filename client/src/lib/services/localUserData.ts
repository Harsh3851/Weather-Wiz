import {
  DEFAULT_PREFERENCES,
  MAX_ALERT_RULES,
  MAX_RECENT_SEARCHES,
  MAX_SAVED_LOCATIONS,
  evaluateAlertRule,
  preferencesSchema,
  roundCoord,
  type AlertEvaluation,
  type AlertRule,
  type Preferences,
  type RecentSearch,
  type SavedLocation,
} from '@weatherwiz/shared';
import { ApiError } from '../api/errors';
import { STORAGE_KEYS, storage, uid } from '../storage';
import type { UserDataService, WeatherService } from './types';

/**
 * Browser-only persistence with the same contract as the API, used in demo
 * mode and for signed-out visitors. Enforces the same limits and rules.
 */
export function createLocalUserDataService(weather: WeatherService): UserDataService {
  const read = {
    locations: () =>
      storage.get<SavedLocation[]>(STORAGE_KEYS.locations, []).sort((a, b) => a.order - b.order),
    recents: () => storage.get<RecentSearch[]>(STORAGE_KEYS.recents, []),
    rules: () => storage.get<AlertRule[]>(STORAGE_KEYS.alerts, []),
  };

  const writeLocations = (list: SavedLocation[]) => {
    const normalised = list.map((l, order) => ({ ...l, order }));
    storage.set(STORAGE_KEYS.locations, normalised);
    return normalised;
  };

  const notFound = (what: string) => new ApiError(`${what} not found`, 404, 'NOT_FOUND');

  return {
    kind: 'local',

    async getPreferences() {
      const parsed = preferencesSchema.safeParse({
        ...DEFAULT_PREFERENCES,
        ...storage.get<Partial<Preferences>>(STORAGE_KEYS.preferences, {}),
      });
      return parsed.success ? parsed.data : DEFAULT_PREFERENCES;
    },

    async updatePreferences(patch) {
      const next = { ...(await this.getPreferences()), ...patch };
      storage.set(STORAGE_KEYS.preferences, next);
      return next;
    },

    async listLocations() {
      return read.locations();
    },

    async addLocation(input) {
      const list = read.locations();
      if (list.length >= MAX_SAVED_LOCATIONS) {
        throw new ApiError(
          `You can save up to ${MAX_SAVED_LOCATIONS} locations`,
          422,
          'LIMIT_REACHED',
        );
      }
      const latitude = roundCoord(input.latitude);
      const longitude = roundCoord(input.longitude);
      if (list.some((l) => l.latitude === latitude && l.longitude === longitude)) {
        throw new ApiError(`${input.name} is already in your saved locations`, 409, 'CONFLICT');
      }
      const isDefault = input.isDefault ?? list.length === 0;
      const created: SavedLocation = {
        id: uid(),
        name: input.name,
        country: input.country ?? null,
        countryCode: input.countryCode ?? null,
        admin1: input.admin1 ?? null,
        latitude,
        longitude,
        timezone: input.timezone ?? null,
        isDefault,
        order: list.length,
        createdAt: new Date().toISOString(),
      };
      const next = [...list.map((l) => (isDefault ? { ...l, isDefault: false } : l)), created];
      writeLocations(next);
      return created;
    },

    async updateLocation(id, patch) {
      const list = read.locations();
      const target = list.find((l) => l.id === id);
      if (!target) throw notFound('Saved location');
      const next = list.map((l) => {
        if (l.id === id) return { ...l, ...patch };
        return patch.isDefault ? { ...l, isDefault: false } : l;
      });
      writeLocations(next);
      return next.find((l) => l.id === id)!;
    },

    async removeLocation(id) {
      const list = read.locations();
      const target = list.find((l) => l.id === id);
      if (!target) throw notFound('Saved location');
      const rest = list.filter((l) => l.id !== id);
      if (target.isDefault && rest[0]) rest[0] = { ...rest[0], isDefault: true };
      writeLocations(rest);
    },

    async reorderLocations(ids) {
      const list = read.locations();
      const byId = new Map(list.map((l) => [l.id, l]));
      if (
        ids.length !== list.length ||
        new Set(ids).size !== ids.length ||
        !ids.every((id) => byId.has(id))
      ) {
        throw new ApiError(
          'ids must list every saved location exactly once',
          400,
          'VALIDATION_ERROR',
        );
      }
      return writeLocations(ids.map((id) => byId.get(id)!));
    },

    async listRecent() {
      return read.recents();
    },

    async addRecent(input) {
      const latitude = roundCoord(input.latitude);
      const longitude = roundCoord(input.longitude);
      const entry: RecentSearch = {
        id: uid(),
        name: input.name,
        country: input.country ?? null,
        countryCode: input.countryCode ?? null,
        admin1: input.admin1 ?? null,
        latitude,
        longitude,
        searchedAt: new Date().toISOString(),
      };
      const next = [
        entry,
        ...read.recents().filter((r) => !(r.latitude === latitude && r.longitude === longitude)),
      ].slice(0, MAX_RECENT_SEARCHES);
      storage.set(STORAGE_KEYS.recents, next);
      return next;
    },

    async clearRecent() {
      storage.remove(STORAGE_KEYS.recents);
    },

    async listAlertRules() {
      return read.rules();
    },

    async createAlertRule(input) {
      const rules = read.rules();
      if (rules.length >= MAX_ALERT_RULES) {
        throw new ApiError(
          `You can create up to ${MAX_ALERT_RULES} alert rules`,
          422,
          'LIMIT_REACHED',
        );
      }
      const rule: AlertRule = {
        ...input,
        id: uid(),
        enabled: input.enabled ?? true,
        createdAt: new Date().toISOString(),
      };
      storage.set(STORAGE_KEYS.alerts, [...rules, rule]);
      return rule;
    },

    async setAlertRuleEnabled(id, enabled) {
      const rules = read.rules();
      const target = rules.find((r) => r.id === id);
      if (!target) throw notFound('Alert rule');
      const updated = { ...target, enabled };
      storage.set(
        STORAGE_KEYS.alerts,
        rules.map((r) => (r.id === id ? updated : r)),
      );
      return updated;
    },

    async deleteAlertRule(id) {
      const rules = read.rules();
      if (!rules.some((r) => r.id === id)) throw notFound('Alert rule');
      storage.set(
        STORAGE_KEYS.alerts,
        rules.filter((r) => r.id !== id),
      );
    },

    async evaluateAlerts() {
      const rules = read.rules().filter((r) => r.enabled);
      const evaluation: AlertEvaluation = {
        evaluatedAt: new Date().toISOString(),
        triggered: [],
        errors: [],
      };
      const results = await Promise.allSettled(
        rules.map(async (rule) => {
          const { data } = await weather.forecast(rule.latitude, rule.longitude);
          return evaluateAlertRule(rule, data);
        }),
      );
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          if (r.value) evaluation.triggered.push(r.value);
        } else {
          evaluation.errors.push({ ruleId: rules[i]!.id, message: 'Could not load the forecast' });
        }
      });
      return evaluation;
    },
  };
}
