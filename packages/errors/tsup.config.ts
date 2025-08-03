import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    codes: 'src/codes.ts',
    error: 'src/error.ts',
    factories: 'src/factories.ts',
    'rpc-mapper': 'src/rpc-mapper.ts',
    'validation-mapper': 'src/validation-mapper.ts',
    enhancer: 'src/enhancer.ts',
    recovery: 'src/recovery.ts',
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
