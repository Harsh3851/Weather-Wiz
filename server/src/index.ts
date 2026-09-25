import { createApp } from './app';
import { loadConfig } from './config/env';
import { connectDatabase } from './db/connect';
import { createLogger } from './lib/logger';

async function main() {
  const config = loadConfig();
  const logger = createLogger(config);
  const db = await connectDatabase({
    uri: config.mongoUri,
    allowInMemory: !config.isProduction,
    logger,
  });
  const app = createApp(config, logger);
  const server = app.listen(config.port, () => {
    logger.info({ port: config.port, env: config.env }, 'Weather Wiz API listening');
  });

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'shutting down');
    server.close(() => {
      db.close()
        .catch((err: unknown) => logger.error({ err }, 'error closing database'))
        .finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
