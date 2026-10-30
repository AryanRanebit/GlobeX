import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['dist/**', 'node_modules/**'],
    testTimeout: 45000,
    hookTimeout: 45000,
    // Minimal environment for modules that validate config at import time
    // (config/env.ts exits the process when required vars are missing).
    // These are dummy values only used under `vitest run`; no connections
    // are opened because tests mock network and database access.
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/globex_test',
      JWT_SECRET: 'test-secret-test-secret-test-secret-xx',
      JWT_REFRESH_SECRET: 'test-refresh-test-refresh-test-refresh-x',
    },
  },
});
