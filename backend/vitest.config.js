import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // setup.js boots an in-memory MongoDB, connects mongoose, and wipes
        // collections between tests so each test starts from a clean slate.
        setupFiles: ['./tests/setup.js'],
        // Tests hit a shared DB, so run files sequentially to avoid cross-talk.
        fileParallelism: false,
        environment: 'node',
        // First spin-up of mongodb-memory-server downloads a binary; be patient.
        hookTimeout: 120000,
        testTimeout: 30000,
    },
});
