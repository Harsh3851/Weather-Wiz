import { MongoMemoryServer } from 'mongodb-memory-server';

let mongo: MongoMemoryServer | undefined;

export async function setup() {
  mongo = await MongoMemoryServer.create();
  process.env.TEST_MONGO_URI = mongo.getUri();
}

export async function teardown() {
  await mongo?.stop();
}
