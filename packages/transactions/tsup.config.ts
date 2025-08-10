import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    compile: 'src/compile.ts',
    send: 'src/send.ts',
    serialize: 'src/serialize.ts',
    sign: 'src/sign.ts',
    types: 'src/types.ts',
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
    '@photon/addresses',
    '@photon/codecs',
    '@photon/crypto',
    '@photon/signers',
    '@photon/transaction-messages',
  ],
  esbuildOptions(options) {
    options.conditions = ['import', 'module', 'require'];
    options.mainFields = ['module', 'main'];
  },
});
