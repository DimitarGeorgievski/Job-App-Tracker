import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier';
import { createTypeScriptConfig } from '../../eslint.base.mjs';

const tsconfigRootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig([
  ...createTypeScriptConfig(tsconfigRootDir),
  {
    files: [
      'prisma.config.ts',
      'src/platform/config/env.loader.ts',
      'test/setup-test-env.ts',
      'test/test-config.ts',
    ],
    rules: {
      'no-restricted-properties': 'off',
    },
  },
  eslintConfigPrettier,
]);
