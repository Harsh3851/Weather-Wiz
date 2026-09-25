import type { Request, Response } from 'express';
import {
  alertRuleInputSchema,
  alertRulePatchSchema,
  locationInputSchema,
  preferencesPatchSchema,
  reorderSchema,
  savedLocationInputSchema,
  savedLocationPatchSchema,
} from '@weatherwiz/shared';
import { parseInput } from '../lib/validate';
import { userIdOf } from '../middleware/auth';
import * as alerts from '../services/alerts.service';
import * as locations from '../services/locations.service';
import * as prefs from '../services/preferences.service';
import * as recents from '../services/recents.service';
import type { WeatherService } from '../services/weather.service';

const idParam = (req: Request) => String(req.params.id ?? '');

export const preferencesController = {
  async get(req: Request, res: Response) {
    res.json({ preferences: await prefs.getPreferences(userIdOf(req)) });
  },
  async update(req: Request, res: Response) {
    const patch = parseInput(preferencesPatchSchema, req.body);
    res.json({ preferences: await prefs.updatePreferences(userIdOf(req), patch) });
  },
};

export const locationsController = {
  async list(req: Request, res: Response) {
    res.json({ locations: await locations.listLocations(userIdOf(req)) });
  },
  async create(req: Request, res: Response) {
    const input = parseInput(savedLocationInputSchema, req.body);
    res.status(201).json({ location: await locations.addLocation(userIdOf(req), input) });
  },
  async update(req: Request, res: Response) {
    const patch = parseInput(savedLocationPatchSchema, req.body);
    res.json({ location: await locations.updateLocation(userIdOf(req), idParam(req), patch) });
  },
  async remove(req: Request, res: Response) {
    await locations.removeLocation(userIdOf(req), idParam(req));
    res.status(204).end();
  },
  async reorder(req: Request, res: Response) {
    const { ids } = parseInput(reorderSchema, req.body);
    res.json({ locations: await locations.reorderLocations(userIdOf(req), ids) });
  },
};

export const recentsController = {
  async list(req: Request, res: Response) {
    res.json({ searches: await recents.listRecent(userIdOf(req)) });
  },
  async add(req: Request, res: Response) {
    const input = parseInput(locationInputSchema, req.body);
    res.status(201).json({ searches: await recents.addRecent(userIdOf(req), input) });
  },
  async clear(req: Request, res: Response) {
    await recents.clearRecent(userIdOf(req));
    res.status(204).end();
  },
};

export function createAlertsController(weather: WeatherService) {
  return {
    async list(req: Request, res: Response) {
      res.json({ rules: await alerts.listRules(userIdOf(req)) });
    },
    async create(req: Request, res: Response) {
      const input = parseInput(alertRuleInputSchema, req.body);
      res.status(201).json({ rule: await alerts.createRule(userIdOf(req), input) });
    },
    async update(req: Request, res: Response) {
      const { enabled } = parseInput(alertRulePatchSchema, req.body);
      res.json({ rule: await alerts.setRuleEnabled(userIdOf(req), idParam(req), enabled) });
    },
    async remove(req: Request, res: Response) {
      await alerts.deleteRule(userIdOf(req), idParam(req));
      res.status(204).end();
    },
    async evaluate(req: Request, res: Response) {
      res.set('Cache-Control', 'no-store');
      res.json(await alerts.evaluateRules(userIdOf(req), weather));
    },
  };
}
