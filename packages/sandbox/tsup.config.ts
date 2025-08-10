import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  bundle: false,
  minify: false,
  skipNodeModulesBundle: true,
  target: 'es2022',
  platform: 'neutral',
  treeshake: false,
});
