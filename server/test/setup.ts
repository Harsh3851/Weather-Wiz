import crypto from 'node:crypto';
import mongoose from 'mongoose';
import nock from 'nock';
import { afterAll, afterEach, beforeAll } from 'vitest';

beforeAll(async () => {
  // A dedicated database per test file keeps files independent.
  const dbName = `ww_test_${crypto.randomUUID().slice(0, 8)}`;
  await mongoose.connect(process.env.TEST_MONGO_URI!, { dbName });
  await mongoose.connection.syncIndexes();
  nock.disableNetConnect();
  nock.enableNetConnect((host) => host.startsWith('127.0.0.1') || host.startsWith('localhost'));
});

afterEach(async () => {
  nock.cleanAll();
  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
});

afterAll(async () => {
  nock.enableNetConnect();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
