/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'Circular dependencies are not allowed.',
      from: {},
      to: {
        circular: true,
      },
    },
    {
      name: 'evaluator-cannot-import-prisma',
      severity: 'error',
      comment:
        'The evaluator entry point must not depend on Prisma or PostgreSQL database implementation.',
      from: {
        path: '^apps/api/src/evaluator-app\\.module\\.ts$',
      },
      to: {
        path: '^apps/api/src/platform/database/',
      },
    },
    {
      name: 'contracts-only-depends-on-zod',
      severity: 'error',
      comment: 'Contracts may only depend on Zod and must remain independent of application code.',
      from: {
        path: '^packages/contracts/src/',
      },
      to: {
        path: '^(apps/|packages/|node_modules/)',
        pathNot: '^node_modules/zod/',
      },
    },
    {
      name: 'flag-engine-only-depends-on-contracts',
      severity: 'error',
      comment: 'The flag engine may only depend on contracts within this monorepo.',
      from: {
        path: '^packages/flag-engine/src/',
      },
      to: {
        path: '^(apps/|packages/|node_modules/)',
        pathNot: '^packages/contracts/src/',
      },
    },
    {
      name: 'dashboard-cannot-import-api-source',
      severity: 'error',
      comment: 'The dashboard must not import backend source files.',
      from: {
        path: '^apps/dashboard/src/',
      },
      to: {
        path: '^apps/api/',
      },
    },
  ],
  options: {
    exclude: {
      path: '(^|/)generated/prisma/',
    },
    tsPreCompilationDeps: true,
    doNotFollow: {
      path: 'node_modules',
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
    },
  },
};
