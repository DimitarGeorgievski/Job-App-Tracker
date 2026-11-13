export const E2E_FIXTURES = {
  user: {
    id: '0197f8c0-1234-7abc-8def-0123456789aa',
    email: 'e2e@squidflag.test',
    password: 'SquidFlag-E2E-Password-2026!',
  },
  editorUser: {
    id: '0197f8c0-1234-7abc-8def-0123456789af',
    email: 'e2e-editor@squidflag.test',
    password: 'SquidFlag-E2E-Editor-2026!',
  },
  viewerUser: {
    id: '0197f8c0-1234-7abc-8def-0123456789b0',
    email: 'e2e-viewer@squidflag.test',
    password: 'SquidFlag-E2E-Viewer-2026!',
  },
  organization: {
    id: '0197f8c0-1234-7abc-8def-0123456789ab',
    name: 'E2E Test Organization',
    slug: 'e2e-test-organization',
  },
  archivedOrganization: {
    id: '0197f8c0-1234-7abc-8def-0123456789ac',
    name: 'E2E Archived Organization',
    slug: 'e2e-archived-organization',
  },
  project: {
    id: '0197f8c0-1234-7abc-8def-0123456789ad',
    name: 'Existing E2E Project',
    slug: 'existing-e2e-project',
  },
  environment: {
    id: '0197f8c0-1234-7abc-8def-0123456789ae',
    key: 'test-env',
    name: 'Test Environment',
    organizationId: '0197f8c0-1234-7abc-8def-0123456789ab',
    projectId: '0197f8c0-1234-7abc-8def-0123456789ad',
  } as const,
  createdProjectSlug: 'e2e-test-project',
} as const;

export const E2E_ORIGIN = 'http://localhost:4001';
