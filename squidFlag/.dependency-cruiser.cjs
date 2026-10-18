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
      name: 'contracts-only-depends-on-zod',
      severity: 'error',
      comment: 'Contracts must remain independent of application code.',
      from: {
        path: '^packages/contracts/src/',
      },
      to: {
        path: '^(apps/|packages/(?!contracts/src/)|node_modules/(?!zod/))',
      },
    },
    {
      name: 'flag-engine-only-depends-on-contracts',
      severity: 'error',
      comment: 'The flag engine may depend only on contracts within this monorepo.',
      from: {
        path: '^packages/flag-engine/src/',
      },
      to: {
        path: '^packages/(?!flag-engine/src/|contracts/src/)',
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
