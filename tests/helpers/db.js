import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { beforeAll, afterEach, afterAll } from 'vitest';

// Name of the database tests use. Always forced, so tests can never touch a
// real database even if TEST_MONGODB_URI points at a shared server.
const TEST_DB_NAME = 'idk-org-test';

// Call once at the top of a test file that needs a database.
//
// By default an in-memory MongoDB is started (mongodb-memory-server downloads a
// mongod binary on the first run, so no local MongoDB install is needed).
// To use an existing MongoDB-compatible server instead (for example a CI
// service container), set TEST_MONGODB_URI.
export function useTestDatabase() {
  let memoryServer;

  beforeAll(async () => {
    let uri = process.env.TEST_MONGODB_URI;

    if (!uri) {
      memoryServer = await MongoMemoryServer.create();
      uri = memoryServer.getUri();
    }

    await mongoose.connect(uri, { dbName: TEST_DB_NAME });
  });

  // Every test starts from empty collections
  afterEach(async () => {
    const collections = Object.values(mongoose.connection.collections);
    await Promise.all(collections.map(collection => collection.deleteMany({})));
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (memoryServer) await memoryServer.stop();
  });
}
