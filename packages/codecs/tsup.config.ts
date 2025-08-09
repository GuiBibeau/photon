import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    codec: 'src/codec.ts',
    composition: 'src/composition.ts',
    errors: 'src/errors.ts',
    // Primitives as separate entries
    'primitives/index': 'src/primitives/index.ts',
    'primitives/base58': 'src/primitives/base58.ts',
    'primitives/boolean': 'src/primitives/boolean.ts',
    'primitives/bytes': 'src/primitives/bytes.ts',
    'primitives/numeric': 'src/primitives/numeric.ts',
    'primitives/string': 'src/primitives/string.ts',
    'primitives/compact-u16': 'src/primitives/compact-u16.ts',
    // Composites as separate entries
    'composites/index': 'src/composites/index.ts',
    'composites/array': 'src/composites/array.ts',
    'composites/enum': 'src/composites/enum.ts',
    'composites/lazy': 'src/composites/lazy.ts',
    'composites/option': 'src/composites/option.ts',
    'composites/struct': 'src/composites/struct.ts',
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
  external: ['@photon/errors'],
  esbuildOptions(options) {
    options.conditions = ['import', 'module', 'require'];
    options.mainFields = ['module', 'main'];
  },
});
