import { Router } from 'express';
import mongoose from 'mongoose';
import type { AppConfig } from '../config/env';
import { createAuthController } from '../controllers/auth.controller';
import {
  createAlertsController,
  locationsController,
  preferencesController,
  recentsController,
} from '../controllers/user.controller';
import { createWeatherController } from '../controllers/weather.controller';
import { requireAuth } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimit';
import type { AuthService } from '../services/auth.service';
import type { WeatherService } from '../services/weather.service';

export function createApiRouter(deps: {
  config: AppConfig;
  weather: WeatherService;
  auth: AuthService;
}): Router {
  const { config, weather, auth } = deps;
  const router = Router();
  const authed = requireAuth(config.jwt.accessSecret);

  router.get('/health', (_req, res) => {
    const dbState = mongoose.connection.readyState === 1 ? 'up' : 'down';
    res.status(dbState === 'up' ? 200 : 503).json({
      status: dbState === 'up' ? 'ok' : 'degraded',
      db: dbState,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  // Weather (anonymous)
  const w = createWeatherController(weather);
  router.get('/geocode', w.geocode);
  router.get('/weather/forecast', w.forecast);
  router.get('/weather/air-quality', w.airQuality);

  // Auth
  const a = createAuthController(auth, config);
  const authLimiter = createRateLimiter({
    windowMs: 15 * 60_000,
    max: config.rateLimit.authMax,
    message: 'Too many authentication attempts. Please wait a few minutes and try again.',
  });
  router.post('/auth/register', authLimiter, a.register);
  router.post('/auth/login', authLimiter, a.login);
  router.post('/auth/demo', authLimiter, a.demo);
  router.post('/auth/refresh', a.refresh);
  router.post('/auth/logout', a.logout);
  router.get('/auth/me', authed, a.me);

  // Account data
  const me = Router();
  me.use(authed);
  me.get('/preferences', preferencesController.get);
  me.patch('/preferences', preferencesController.update);

  me.get('/locations', locationsController.list);
  me.post('/locations', locationsController.create);
  me.put('/locations/order', locationsController.reorder);
  me.patch('/locations/:id', locationsController.update);
  me.delete('/locations/:id', locationsController.remove);

  me.get('/recent-searches', recentsController.list);
  me.post('/recent-searches', recentsController.add);
  me.delete('/recent-searches', recentsController.clear);

  const al = createAlertsController(weather);
  me.get('/alerts', al.list);
  me.post('/alerts', al.create);
  me.get('/alerts/evaluate', al.evaluate);
  me.patch('/alerts/:id', al.update);
  me.delete('/alerts/:id', al.remove);

  router.use('/me', me);
  return router;
}
