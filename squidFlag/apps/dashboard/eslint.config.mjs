import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'pg',
              message: 'Database drivers must not be imported by the dashboard.',
            },
            {
              name: 'ioredis',
              message: 'Redis clients must not be imported by the dashboard.',
            },
          ],
          patterns: [
            {
              group: [
                '@prisma/*',
                '@aws-sdk/*',
                '@squidflag/api',
                '@squidflag/api/*',
                '**/apps/api/**',
              ],
              message: 'The dashboard must not depend on backend infrastructure or API source.',
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
