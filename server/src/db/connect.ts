import mongoose from 'mongoose';
import type { Logger } from 'pino';

export interface DatabaseHandle {
  uri: string;
  inMemory: boolean;
  close(): Promise<void>;
}

/**
 * Connects to MongoDB. When no URI is configured outside production, an
 * in-memory MongoDB (mongodb-memory-server, a dev dependency) is started so
 * the API runs locally without installing MongoDB.
 */
export async function connectDatabase(opts: {
  uri: string;
  allowInMemory: boolean;
  logger: Logger;
}): Promise<DatabaseHandle> {
  let uri = opts.uri;
  let stopMemory: (() => Promise<unknown>) | undefined;

  if (!uri) {
    if (!opts.allowInMemory) throw new Error('MONGODB_URI is required');
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const memory = await MongoMemoryServer.create();
    uri = memory.getUri('weatherwiz');
    stopMemory = () => memory.stop();
    opts.logger.warn('MONGODB_URI not set: using an in-memory MongoDB (data resets on restart)');
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  await mongoose.connection.syncIndexes();
  opts.logger.info({ inMemory: Boolean(stopMemory) }, 'connected to MongoDB');

  return {
    uri,
    inMemory: Boolean(stopMemory),
    async close() {
      await mongoose.disconnect();
      await stopMemory?.();
    },
  };
}
