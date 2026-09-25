import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['./test/globalSetup.ts'],
    setupFiles: ['./test/setup.ts'],
    // Each file gets its own in-memory database; keep files isolated.
    pool: 'forks',
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
  },
});
