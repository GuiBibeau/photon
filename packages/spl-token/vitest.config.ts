import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.config.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@photon/addresses': resolve(__dirname, '../addresses/src'),
      '@photon/errors': resolve(__dirname, '../errors/src'),
      '@photon/codecs': resolve(__dirname, '../codecs/src'),
    },
  },
});
