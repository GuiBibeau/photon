import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // Use node for integration tests
    include: ['test/**/*.test.ts', 'tests/**/*.test.ts', 'src/**/*.test.ts'],

    // Longer timeouts for blockchain operations
    testTimeout: 60000,
    hookTimeout: 30000,

    // Global setup for validator (optional)
    // globalSetup: './test/utils/setup.ts',

    // Run tests sequentially for validator state
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true, // Run tests in sequence
      },
    },

    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: [
        'node_modules',
        'dist',
        'test',
        'tests',
        '*.config.ts',
        '*.config.js',
        'src/index.ts',
        'src/examples', // Examples are tested via integration tests
      ],
      thresholds: {
        lines: 0,
        functions: 0,
        branches: 0,
        statements: 0,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@test': resolve(__dirname, './test'),
    },
  },
});
