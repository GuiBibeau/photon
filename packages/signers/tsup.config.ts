import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    interface: 'src/interface.ts',
    'multi-signer': 'src/multi-signer.ts',
    guards: 'src/guards.ts',
    'webcrypto-signer': 'src/webcrypto-signer.ts',
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
  external: [],
  esbuildOptions(options) {
    options.conditions = ['import', 'module', 'require'];
    options.mainFields = ['module', 'main'];
  },
});
