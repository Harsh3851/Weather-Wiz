import pino, { type Logger } from 'pino';
import type { AppConfig } from '../config/env';

export function createLogger(config: Pick<AppConfig, 'logLevel' | 'env'>): Logger {
  const pretty = config.env === 'development';
  return pino({
    level: config.env === 'test' ? 'silent' : config.logLevel,
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
      censor: '[redacted]',
    },
    ...(pretty
      ? {
          transport: { target: 'pino-pretty', options: { colorize: true, ignore: 'pid,hostname' } },
        }
      : {}),
  });
}
