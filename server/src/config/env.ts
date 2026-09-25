import 'dotenv/config';
import { z } from 'zod';
import { OPEN_METEO_DEFAULT_BASE_URLS } from '@weatherwiz/shared';

const DEV_ACCESS_SECRET = 'dev-only-access-secret-change-me-0123456789';
const DEV_REFRESH_SECRET = 'dev-only-refresh-secret-change-me-0123456789';

const bool = z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1');

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    MONGODB_URI: z.string().trim().optional().default(''),
    JWT_ACCESS_SECRET: z.string().optional(),
    JWT_REFRESH_SECRET: z.string().optional(),
    ACCESS_TOKEN_TTL: z.string().default('15m'),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),
    CORS_ORIGINS: z.string().default('http://localhost:5173'),
    COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    COOKIE_SECURE: bool.default('false'),
    TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(0),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
    CACHE_TTL_FORECAST_SECONDS: z.coerce.number().int().positive().default(600),
    CACHE_TTL_AIR_QUALITY_SECONDS: z.coerce.number().int().positive().default(1800),
    CACHE_TTL_GEOCODE_SECONDS: z.coerce.number().int().positive().default(86_400),
    CACHE_STALE_SECONDS: z.coerce.number().int().min(0).default(21_600),
    UPSTREAM_TIMEOUT_MS: z.coerce.number().int().positive().default(6000),
    UPSTREAM_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
    UPSTREAM_RETRY_BASE_DELAY_MS: z.coerce.number().int().min(0).default(250),
    OPEN_METEO_GEOCODING_URL: z.string().url().default(OPEN_METEO_DEFAULT_BASE_URLS.geocoding),
    OPEN_METEO_FORECAST_URL: z.string().url().default(OPEN_METEO_DEFAULT_BASE_URLS.forecast),
    OPEN_METEO_AIR_QUALITY_URL: z.string().url().default(OPEN_METEO_DEFAULT_BASE_URLS.airQuality),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') return;
    for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const) {
      if (!env[key] || env[key].length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: 'must be set to at least 32 characters in production',
        });
      }
    }
    if (!env.MONGODB_URI) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['MONGODB_URI'],
        message: 'is required in production',
      });
    }
    if (env.COOKIE_SAMESITE === 'none' && !env.COOKIE_SECURE) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['COOKIE_SECURE'],
        message: 'must be true when COOKIE_SAMESITE=none',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

export interface AppConfig {
  env: Env['NODE_ENV'];
  isProduction: boolean;
  port: number;
  logLevel: Env['LOG_LEVEL'];
  mongoUri: string;
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessTtl: string;
    refreshTtlDays: number;
  };
  cors: { origins: string[] };
  cookie: { sameSite: 'lax' | 'strict' | 'none'; secure: boolean };
  trustProxy: number;
  rateLimit: { windowMs: number; max: number; authMax: number };
  cache: {
    forecastSeconds: number;
    airQualitySeconds: number;
    geocodeSeconds: number;
    staleSeconds: number;
  };
  upstream: {
    timeoutMs: number;
    retries: number;
    retryBaseDelayMs: number;
    baseUrls: { geocoding: string; forecast: string; airQuality: string };
  };
}

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || 'env'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  const e = parsed.data;
  return {
    env: e.NODE_ENV,
    isProduction: e.NODE_ENV === 'production',
    port: e.PORT,
    logLevel: e.LOG_LEVEL,
    mongoUri: e.MONGODB_URI,
    jwt: {
      accessSecret: e.JWT_ACCESS_SECRET || DEV_ACCESS_SECRET,
      refreshSecret: e.JWT_REFRESH_SECRET || DEV_REFRESH_SECRET,
      accessTtl: e.ACCESS_TOKEN_TTL,
      refreshTtlDays: e.REFRESH_TOKEN_TTL_DAYS,
    },
    cors: {
      origins: e.CORS_ORIGINS.split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    },
    cookie: { sameSite: e.COOKIE_SAMESITE, secure: e.COOKIE_SECURE },
    trustProxy: e.TRUST_PROXY,
    rateLimit: {
      windowMs: e.RATE_LIMIT_WINDOW_MS,
      max: e.RATE_LIMIT_MAX,
      authMax: e.AUTH_RATE_LIMIT_MAX,
    },
    cache: {
      forecastSeconds: e.CACHE_TTL_FORECAST_SECONDS,
      airQualitySeconds: e.CACHE_TTL_AIR_QUALITY_SECONDS,
      geocodeSeconds: e.CACHE_TTL_GEOCODE_SECONDS,
      staleSeconds: e.CACHE_STALE_SECONDS,
    },
    upstream: {
      timeoutMs: e.UPSTREAM_TIMEOUT_MS,
      retries: e.UPSTREAM_RETRIES,
      retryBaseDelayMs: e.UPSTREAM_RETRY_BASE_DELAY_MS,
      baseUrls: {
        geocoding: e.OPEN_METEO_GEOCODING_URL,
        forecast: e.OPEN_METEO_FORECAST_URL,
        airQuality: e.OPEN_METEO_AIR_QUALITY_URL,
      },
    },
  };
}
