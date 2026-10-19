import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import importX from 'eslint-plugin-import-x';

export function createTypeScriptConfig(tsconfigRootDir) {
  return tseslint.config(
    {
      ignores: [
        '**/dist/**',
        '**/node_modules/**',
        '**/coverage/**',
        '**/generated/**',
        '**/.next/**',
      ],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked.map((config) => ({
      ...config,
      files: ['**/*.ts', '**/*.tsx'],
    })),
    {
      files: ['**/*.ts', '**/*.tsx'],
      plugins: {
        'import-x': importX,
      },
      languageOptions: {
        globals: globals.node,
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
        },
      },
      rules: {
        'no-restricted-properties': [
          'error',
          {
            object: 'process',
            property: 'env',
            message: 'Read environment variables only through validated configuration.',
          },
        ],
        'import-x/no-extraneous-dependencies': [
          'error',
          {
            devDependencies: [
              '**/*.spec.ts',
              '**/*.test.ts',
              '**/*.spec.ts',
              '**/test/**',
              '**/tests/**',
              '**/*.config.ts',
              '**/*.config.js',
              '**/*.config.mjs',
            ],
            optionalDependencies: false,
            peerDependencies: false,
          },
        ],
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/no-misused-promises': 'error',
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/switch-exhaustiveness-check': 'error',
        '@typescript-eslint/consistent-type-imports': 'warn',
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
            caughtErrorsIgnorePattern: '^_',
          },
        ],
        'no-console': 'warn',
        eqeqeq: ['error', 'always'],
      },
    },
    {
      files: ['prisma.config.ts', 'test/global-setup.ts', 'test/setup-e2e.ts'],
      rules: {
        'no-restricted-properties': 'off',
      },
    },
  );
}
