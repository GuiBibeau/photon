import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    client: 'src/client.ts',
    transport: 'src/transport.ts',
    middleware: 'src/middleware.ts',
    convenience: 'src/convenience.ts',
    helpers: 'src/helpers.ts',
    types: 'src/types.ts',
    api: 'src/api.ts',
    // Methods as separate entries
    'methods/index': 'src/methods/index.ts',
    'methods/account': 'src/methods/account.ts',
    'methods/block': 'src/methods/block.ts',
    'methods/transaction': 'src/methods/transaction.ts',
    'methods/utility': 'src/methods/utility.ts',
    // Parsers as separate entries
    'parsers/index': 'src/parsers/index.ts',
    'parsers/base64': 'src/parsers/base64.ts',
    'parsers/bigint': 'src/parsers/bigint.ts',
    'parsers/types': 'src/parsers/types.ts',
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
  external: ['@photon/errors', '@photon/addresses'],
  esbuildOptions(options) {
    options.conditions = ['import', 'module', 'require'];
    options.mainFields = ['module', 'main'];
  },
});
