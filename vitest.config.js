import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    setupFiles: ['./tests/setupEnv.js'],
    testTimeout: 30000,
    // The first run downloads a MongoDB binary for mongodb-memory-server
    hookTimeout: 120000
  }
});
