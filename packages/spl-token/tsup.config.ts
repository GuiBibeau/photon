import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    constants: 'src/constants.ts',
  },
  format: ['esm', 'cjs'],
  dts: false, // We use tsc --emitDeclarationOnly instead
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
});
