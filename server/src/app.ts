import crypto from 'node:crypto';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { Logger } from 'pino';
import { pinoHttp } from 'pino-http';
import type { AppConfig } from './config/env';
import { createLogger } from './lib/logger';
import { createErrorHandler, notFoundHandler } from './middleware/errorHandler';
import { createRateLimiter } from './middleware/rateLimit';
import { createApiRouter } from './routes';
import { createAuthService } from './services/auth.service';
import { createCacheService } from './services/cache.service';
import { createWeatherService } from './services/weather.service';

export function createApp(config: AppConfig, logger: Logger = createLogger(config)): Express {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy > 0) app.set('trust proxy', config.trustProxy);

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const incoming = req.headers['x-request-id'];
        const id =
          typeof incoming === 'string' && incoming.length <= 64 ? incoming : crypto.randomUUID();
        res.setHeader('X-Request-Id', id);
        return id;
      },
      autoLogging: { ignore: (req) => req.url === '/api/health' },
      customLogLevel: (_req, res, err) =>
        err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
    }),
  );
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, cb) => {
        // Non-browser clients (curl, health checks) send no Origin header.
        if (!origin || config.cors.origins.includes(origin) || config.cors.origins.includes('*')) {
          return cb(null, true);
        }
        cb(null, false);
      },
      credentials: true,
      exposedHeaders: ['X-Cache', 'X-Request-Id', 'RateLimit', 'RateLimit-Policy'],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: '20kb' }));
  app.use(cookieParser());
  app.use(
    '/api',
    createRateLimiter({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      message: 'Too many requests. Please slow down and try again shortly.',
    }),
  );

  const cache = createCacheService({ staleSeconds: config.cache.staleSeconds, logger });
  const weather = createWeatherService({ config, cache, logger });
  const auth = createAuthService({ config, logger });

  app.get('/', (_req, res) => {
    res.json({
      name: 'Weather Wiz API',
      docs: 'https://github.com/Harsh3851/Weather-Wiz#api-reference',
    });
  });
  app.use('/api', createApiRouter({ config, weather, auth }));
  app.use(notFoundHandler);
  app.use(createErrorHandler({ exposeInternal: !config.isProduction }));
  return app;
}
