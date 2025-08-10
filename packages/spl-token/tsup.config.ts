import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    constants: 'src/constants.ts',
    types: 'src/types.ts',
    instructions: 'src/instructions.ts',
    // Codec entry points for tree-shaking
    'codecs/accounts': 'src/codecs/accounts.ts',
    'codecs/instructions': 'src/codecs/instructions.ts',
    'codecs/extensions': 'src/codecs/extensions.ts',
    'codecs/tlv': 'src/codecs/tlv.ts',
    'codecs/program-detection': 'src/codecs/program-detection.ts',
  },
  format: ['esm', 'cjs'],
  dts: false, // We use tsc --emitDeclarationOnly instead
  splitting: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
});
