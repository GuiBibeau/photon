import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    constants: 'src/constants.ts',
    types: 'src/types.ts',
    instructions: 'src/instructions.ts',
  },
  format: ['esm', 'cjs'],
  dts: false, // We use tsc --emitDeclarationOnly instead
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
});
