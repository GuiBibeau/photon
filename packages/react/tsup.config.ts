import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    providers: 'src/providers.ts',
    types: 'src/types.ts',
    // Hooks as separate entries for tree-shaking
    'hooks/index': 'src/hooks/index.ts',
    'hooks/wallet': 'src/hooks/wallet.ts',
    'hooks/balance': 'src/hooks/balance.ts',
    'hooks/transaction': 'src/hooks/transaction.ts',
    'hooks/tokens': 'src/hooks/tokens.ts',
    'hooks/defi': 'src/hooks/defi.ts',
    // Wallet core modules
    'wallet/index': 'src/wallet/index.ts',
    'wallet/detector': 'src/wallet/detector.ts',
    'wallet/connection': 'src/wallet/connection.ts',
    'wallet/mobile': 'src/wallet/mobile.ts',
  },
  format: ['esm', 'cjs'],
  dts: false,
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  outDir: 'dist',
  target: 'es2022',
  minify: false, // Will enable for production builds
  shims: false, // No polyfills - we use Web Standards
  bundle: true,
  skipNodeModulesBundle: true,
  external: [
    'react',
    'react-dom',
    '@photon/errors',
    '@photon/addresses',
    '@photon/codecs',
    '@photon/crypto',
    '@photon/rpc',
    '@photon/signers',
    '@photon/transactions',
    '@photon/transaction-messages',
  ],
  esbuildOptions(options) {
    options.conditions = ['import', 'module', 'require'];
    options.mainFields = ['module', 'main'];
  },
});
