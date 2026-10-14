import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier';
import { createTypeScriptConfig } from '../../eslint.base.mjs';

const tsconfigRootDir = fileURLToPath(new URL('.', import.meta.url));
export default defineConfig([...createTypeScriptConfig(tsconfigRootDir), eslintConfigPrettier]);
