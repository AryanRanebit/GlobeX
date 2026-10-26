import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['dist/**', 'node_modules/**'],
    testTimeout: 45000,
    hookTimeout: 45000,
  },
});
