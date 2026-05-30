// Test lifecycle: spin up an in-memory MongoDB, connect mongoose to it, wipe
// data between tests, and tear everything down at the end. No real DB touched.
import { beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Test-only secrets so auth middleware/controllers work. Set before any app
// code that reads them runs.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret';

let mongod;

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
});

// After each test, empty every collection so tests don't leak state into each
// other (e.g. a user created in one test won't exist in the next).
afterEach(async () => {
    const { collections } = mongoose.connection;
    for (const key of Object.keys(collections)) {
        await collections[key].deleteMany({});
    }
});

afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
});
