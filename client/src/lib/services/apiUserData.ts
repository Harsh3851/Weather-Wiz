import type {
  AlertEvaluation,
  AlertRule,
  Preferences,
  RecentSearch,
  SavedLocation,
} from '@weatherwiz/shared';
import { request } from '../api/http';
import type { UserDataService } from './types';

const auth = { auth: true } as const;

export const apiUserDataService: UserDataService = {
  kind: 'api',
  async getPreferences() {
    return (await request<{ preferences: Preferences }>('/me/preferences', auth)).preferences;
  },
  async updatePreferences(patch) {
    return (
      await request<{ preferences: Preferences }>('/me/preferences', {
        ...auth,
        method: 'PATCH',
        body: patch,
      })
    ).preferences;
  },
  async listLocations() {
    return (await request<{ locations: SavedLocation[] }>('/me/locations', auth)).locations;
  },
  async addLocation(input) {
    return (
      await request<{ location: SavedLocation }>('/me/locations', {
        ...auth,
        method: 'POST',
        body: input,
      })
    ).location;
  },
  async updateLocation(id, patch) {
    return (
      await request<{ location: SavedLocation }>(`/me/locations/${id}`, {
        ...auth,
        method: 'PATCH',
        body: patch,
      })
    ).location;
  },
  async removeLocation(id) {
    await request<void>(`/me/locations/${id}`, { ...auth, method: 'DELETE' });
  },
  async reorderLocations(ids) {
    return (
      await request<{ locations: SavedLocation[] }>('/me/locations/order', {
        ...auth,
        method: 'PUT',
        body: { ids },
      })
    ).locations;
  },
  async listRecent() {
    return (await request<{ searches: RecentSearch[] }>('/me/recent-searches', auth)).searches;
  },
  async addRecent(input) {
    return (
      await request<{ searches: RecentSearch[] }>('/me/recent-searches', {
        ...auth,
        method: 'POST',
        body: input,
      })
    ).searches;
  },
  async clearRecent() {
    await request<void>('/me/recent-searches', { ...auth, method: 'DELETE' });
  },
  async listAlertRules() {
    return (await request<{ rules: AlertRule[] }>('/me/alerts', auth)).rules;
  },
  async createAlertRule(input) {
    return (
      await request<{ rule: AlertRule }>('/me/alerts', { ...auth, method: 'POST', body: input })
    ).rule;
  },
  async setAlertRuleEnabled(id, enabled) {
    return (
      await request<{ rule: AlertRule }>(`/me/alerts/${id}`, {
        ...auth,
        method: 'PATCH',
        body: { enabled },
      })
    ).rule;
  },
  async deleteAlertRule(id) {
    await request<void>(`/me/alerts/${id}`, { ...auth, method: 'DELETE' });
  },
  evaluateAlerts() {
    return request<AlertEvaluation>('/me/alerts/evaluate', auth);
  },
};
