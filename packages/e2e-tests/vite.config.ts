import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@photon/addresses': path.resolve(__dirname, '../addresses/src'),
      '@photon/codecs': path.resolve(__dirname, '../codecs/src'),
      '@photon/crypto': path.resolve(__dirname, '../crypto/src'),
      '@photon/errors': path.resolve(__dirname, '../errors/src'),
      '@photon/rpc': path.resolve(__dirname, '../rpc/src'),
      '@photon/signers': path.resolve(__dirname, '../signers/src'),
      '@photon/spl-token': path.resolve(__dirname, '../spl-token/src'),
      '@photon/transaction-messages': path.resolve(__dirname, '../transaction-messages/src'),
      '@photon/transactions': path.resolve(__dirname, '../transactions/src'),
    },
  },
  optimizeDeps: {
    exclude: ['@photon/*'],
  },
});
