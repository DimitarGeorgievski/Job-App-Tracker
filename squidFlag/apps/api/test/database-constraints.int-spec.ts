import { Test, type TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import { parseEnv } from '../src/platform/config/env.schema';
import { PrismaModule } from '../src/platform/database/prisma.module';
import { PrismaService } from '../src/platform/database/prisma.service';
import { e2eConfig } from './test-config';
import { assertTestDatabase } from './assert-test-database';

describe('Database constraints (integration)', () => {
  let moduleRef: TestingModule;
  let prismaService: PrismaService;
  beforeAll(async () => {
    const config = parseEnv(e2eConfig);
    assertTestDatabase(config);
    moduleRef = await Test.createTestingModule({
      imports: [PrismaModule.register(config)],
    }).compile();
    prismaService = moduleRef.get(PrismaService);
    await moduleRef.init();
  });
  afterAll(async () => {
    await moduleRef?.close();
  });
  it('rejects user emails containing uppercase characters', async () => {
    const email = `Constraint-${randomUUID()}@example.com`;
    await expect(
      prismaService.user.create({
        data: {
          email,
          passwordHash: 'integration-test',
        },
      }),
    ).rejects.toThrow();
  });
  it('rejects duplicate flag keys even when the existing flag is archived', async () => {
    const suffix = randomUUID();
    const organization = await prismaService.organization.create({
      data: {
        name: `Constraint test ${suffix}`,
        slug: `constraint-${suffix}`,
      },
    });
    let projectId: string | undefined;
    try {
      const project = await prismaService.project.create({
        data: {
          organizationId: organization.id,
          name: 'Constraint test project',
          slug: `constraint-${suffix}`,
        },
      });
      projectId = project.id;
      const firstFlag = await prismaService.featureFlag.create({
        data: {
          organizationId: organization.id,
          projectId: project.id,
          key: 'duplicate-key',
          name: 'First flag',
        },
      });
      await prismaService.featureFlag.update({
        where: { id: firstFlag.id },
        data: { archivedAt: new Date() },
      });
      await expect(
        prismaService.featureFlag.create({
          data: {
            organizationId: organization.id,
            projectId: project.id,
            key: 'duplicate-key',
            name: 'Second flag',
          },
        }),
      ).rejects.toThrow();
    } finally {
      if (projectId) {
        await prismaService.featureFlag.deleteMany({ where: { projectId } });
        await prismaService.project.delete({ where: { id: projectId } });
      }
      await prismaService.organization.delete({
        where: { id: organization.id },
      });
    }
  });
  it('rejects a flag config linking a flag and environment from different projects', async () => {
    const suffix = randomUUID();
    const organization = await prismaService.organization.create({
      data: {
        name: `Constraint test ${suffix}`,
        slug: `constraint-${suffix}`,
      },
    });
    const projectIds: string[] = [];
    try {
      const projectA = await prismaService.project.create({
        data: {
          organizationId: organization.id,
          name: 'Project A',
          slug: `constraint-a-${suffix}`,
        },
      });
      projectIds.push(projectA.id);
      const projectB = await prismaService.project.create({
        data: {
          organizationId: organization.id,
          name: 'Project B',
          slug: `constraint-b-${suffix}`,
        },
      });
      projectIds.push(projectB.id);
      const environment = await prismaService.environment.create({
        data: {
          organizationId: organization.id,
          projectId: projectA.id,
          key: 'test',
          name: 'Test',
        },
      });
      const flag = await prismaService.featureFlag.create({
        data: {
          organizationId: organization.id,
          projectId: projectB.id,
          key: 'test-flag',
          name: 'Test flag',
        },
      });
      await expect(
        prismaService.flagEnvironmentConfig.create({
          data: {
            organizationId: organization.id,
            projectId: projectB.id,
            environmentId: environment.id,
            flagId: flag.id,
            defaultValue: false,
          },
        }),
      ).rejects.toThrow();
    } finally {
      for (const projectId of projectIds) {
        await prismaService.flagEnvironmentConfig.deleteMany({
          where: { projectId },
        });
        await prismaService.featureFlag.deleteMany({ where: { projectId } });
        await prismaService.environment.deleteMany({ where: { projectId } });
      }
      await prismaService.project.deleteMany({
        where: { id: { in: projectIds } },
      });
      await prismaService.organization.delete({
        where: { id: organization.id },
      });
    }
  });
  it('rejects two ACTIVE snapshots for the same environment', async () => {
    const suffix = randomUUID();
    const organization = await prismaService.organization.create({
      data: {
        name: `Constraint test ${suffix}`,
        slug: `constraint-${suffix}`,
      },
    });
    let projectId: string | undefined;
    try {
      const project = await prismaService.project.create({
        data: {
          organizationId: organization.id,
          name: 'Constraint test project',
          slug: `constraint-${suffix}`,
        },
      });
      projectId = project.id;
      const environment = await prismaService.environment.create({
        data: {
          organizationId: organization.id,
          projectId: project.id,
          key: 'test',
          name: 'Test',
        },
      });
      const user = await prismaService.user.create({
        data: {
          email: `snapshot-${suffix}@example.com`,
          passwordHash: 'integration-test',
        },
      });
      const snapshotData = {
        organizationId: organization.id,
        projectId: project.id,
        environmentId: environment.id,
        status: 'ACTIVE' as const,
        storageKey: `snapshots/${suffix}`,
        checksum: 'test-checksum',
        sizeBytes: 1,
        draftRevision: 1,
        createdByUserId: user.id,
        activatedAt: new Date(),
      };
      await prismaService.publishedSnapshot.create({
        data: {
          ...snapshotData,
          version: 1,
        },
      });
      await expect(
        prismaService.publishedSnapshot.create({
          data: {
            ...snapshotData,
            version: 2,
            storageKey: `snapshots/${suffix}-second`,
          },
        }),
      ).rejects.toThrow();
    } finally {
      if (projectId) {
        await prismaService.publishedSnapshot.deleteMany({
          where: { projectId },
        });
        await prismaService.environment.deleteMany({ where: { projectId } });
        await prismaService.featureFlag.deleteMany({ where: { projectId } });
        await prismaService.project.delete({ where: { id: projectId } });
      }
      await prismaService.user.deleteMany({
        where: { email: `snapshot-${suffix}@example.com` },
      });
      await prismaService.organization.delete({
        where: { id: organization.id },
      });
    }
  });
  it('rejects two PENDING snapshots for the same environment', async () => {
    const suffix = randomUUID();
    const organization = await prismaService.organization.create({
      data: {
        name: `Constraint test ${suffix}`,
        slug: `constraint-${suffix}`,
      },
    });
    let projectId: string | undefined;
    try {
      const project = await prismaService.project.create({
        data: {
          organizationId: organization.id,
          name: 'Constraint test project',
          slug: `constraint-${suffix}`,
        },
      });
      projectId = project.id;
      const environment = await prismaService.environment.create({
        data: {
          organizationId: organization.id,
          projectId: project.id,
          key: 'test',
          name: 'Test',
        },
      });
      const user = await prismaService.user.create({
        data: {
          email: `pending-${suffix}@example.com`,
          passwordHash: 'integration-test',
        },
      });
      const snapshotData = {
        organizationId: organization.id,
        projectId: project.id,
        environmentId: environment.id,
        status: 'PENDING' as const,
        checksum: 'test-checksum',
        sizeBytes: 1,
        draftRevision: 1,
        createdByUserId: user.id,
      };
      await prismaService.publishedSnapshot.create({
        data: {
          ...snapshotData,
          version: 1,
          storageKey: `snapshots/${suffix}-first`,
        },
      });
      await expect(
        prismaService.publishedSnapshot.create({
          data: {
            ...snapshotData,
            version: 2,
            storageKey: `snapshots/${suffix}-second`,
          },
        }),
      ).rejects.toThrow();
    } finally {
      if (projectId) {
        await prismaService.publishedSnapshot.deleteMany({
          where: { projectId },
        });
        await prismaService.environment.deleteMany({ where: { projectId } });
        await prismaService.featureFlag.deleteMany({ where: { projectId } });
        await prismaService.project.delete({ where: { id: projectId } });
      }
      await prismaService.user.deleteMany({
        where: { email: `pending-${suffix}@example.com` },
      });
      await prismaService.organization.delete({
        where: { id: organization.id },
      });
    }
  });
  it('rejects organization slugs with an invalid format', async () => {
    const slug = `Invalid Slug ${randomUUID()}`;
    await expect(
      prismaService.organization.create({
        data: {
          name: 'Invalid slug test',
          slug,
        },
      }),
    ).rejects.toThrow();
  });
  it('prevents deleting a project that still has environments', async () => {
    const suffix = randomUUID();
    const organization = await prismaService.organization.create({
      data: {
        name: `Constraint test ${suffix}`,
        slug: `constraint-${suffix}`,
      },
    });
    let projectId: string | undefined;
    try {
      const project = await prismaService.project.create({
        data: {
          organizationId: organization.id,
          name: 'Constraint test project',
          slug: `constraint-${suffix}`,
        },
      });
      projectId = project.id;

      await prismaService.environment.create({
        data: {
          organizationId: organization.id,
          projectId: project.id,
          key: 'test',
          name: 'Test',
        },
      });
      await expect(
        prismaService.project.delete({
          where: { id: project.id },
        }),
      ).rejects.toThrow();
    } finally {
      if (projectId) {
        await prismaService.environment.deleteMany({ where: { projectId } });
        await prismaService.featureFlag.deleteMany({ where: { projectId } });
        await prismaService.project.delete({ where: { id: projectId } });
      }
      await prismaService.organization.delete({
        where: { id: organization.id },
      });
    }
  });
  it('rejects project slugs with an invalid format', async () => {
    const suffix = randomUUID();
    const organization = await prismaService.organization.create({
      data: {
        name: `Constraint test ${suffix}`,
        slug: `constraint-${suffix}`,
      },
    });
    try {
      await expect(
        prismaService.project.create({
          data: {
            organizationId: organization.id,
            name: 'Invalid slug project',
            slug: `Invalid Slug ${suffix}`,
          },
        }),
      ).rejects.toThrow();
    } finally {
      await prismaService.organization.delete({
        where: { id: organization.id },
      });
    }
  });
  it('rejects environment keys with an invalid format', async () => {
    const suffix = randomUUID();
    const organization = await prismaService.organization.create({
      data: {
        name: `Constraint test ${suffix}`,
        slug: `constraint-${suffix}`,
      },
    });
    let projectId: string | undefined;
    try {
      const project = await prismaService.project.create({
        data: {
          organizationId: organization.id,
          name: 'Constraint test project',
          slug: `constraint-${suffix}`,
        },
      });
      projectId = project.id;
      await expect(
        prismaService.environment.create({
          data: {
            organizationId: organization.id,
            projectId: project.id,
            key: `Invalid Key ${suffix}`,
            name: 'Invalid environment key',
          },
        }),
      ).rejects.toThrow();
    } finally {
      if (projectId) {
        await prismaService.environment.deleteMany({
          where: { projectId },
        });
        await prismaService.project.delete({
          where: { id: projectId },
        });
      }
      await prismaService.organization.delete({
        where: { id: organization.id },
      });
    }
  });

  it('rejects feature flag keys with an invalid format', async () => {
    const suffix = randomUUID();
    const organization = await prismaService.organization.create({
      data: {
        name: `Constraint test ${suffix}`,
        slug: `constraint-${suffix}`,
      },
    });
    let projectId: string | undefined;
    try {
      const project = await prismaService.project.create({
        data: {
          organizationId: organization.id,
          name: 'Constraint test project',
          slug: `constraint-${suffix}`,
        },
      });
      projectId = project.id;
      await expect(
        prismaService.featureFlag.create({
          data: {
            organizationId: organization.id,
            projectId: project.id,
            key: `Invalid Key ${suffix}`,
            name: 'Invalid feature flag key',
          },
        }),
      ).rejects.toThrow();
    } finally {
      if (projectId) {
        await prismaService.featureFlag.deleteMany({
          where: { projectId },
        });
        await prismaService.project.delete({
          where: { id: projectId },
        });
      }
      await prismaService.organization.delete({
        where: { id: organization.id },
      });
    }
  });
});
