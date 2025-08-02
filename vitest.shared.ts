import { defineConfig } from 'vitest/config';
import path from 'path';

export const sharedConfig = defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.d.ts',
        '**/vitest.config.ts',
        '**/tsup.config.ts',
        '**/.*.js',
        '**/test/**',
        '**/tests/**',
        '**/__tests__/**',
        '**/*.test.ts',
        '**/*.spec.ts'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
        perFile: true
      }
    },
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**'
    ],
    testTimeout: 10000,
    hookTimeout: 10000
  },
  resolve: {
    alias: {
      '@photon/errors': path.resolve(__dirname, './packages/errors/src'),
      '@photon/codecs': path.resolve(__dirname, './packages/codecs/src'),
      '@photon/crypto': path.resolve(__dirname, './packages/crypto/src'),
      '@photon/addresses': path.resolve(__dirname, './packages/addresses/src'),
      '@photon/rpc': path.resolve(__dirname, './packages/rpc/src'),
      '@photon/rpc-subscriptions': path.resolve(__dirname, './packages/rpc-subscriptions/src'),
      '@photon/signers': path.resolve(__dirname, './packages/signers/src'),
      '@photon/sysvars': path.resolve(__dirname, './packages/sysvars/src'),
      '@photon/transaction-messages': path.resolve(__dirname, './packages/transaction-messages/src'),
      '@photon/transactions': path.resolve(__dirname, './packages/transactions/src'),
      '@photon/accounts': path.resolve(__dirname, './packages/accounts/src')
    }
  }
});