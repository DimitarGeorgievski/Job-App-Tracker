import { DynamicModule, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MembershipRole } from '../../generated/prisma/client';
import { hash } from 'bcryptjs';
import { PrismaModule } from '../../src/platform/database/prisma.module';
import { PrismaService } from '../../src/platform/database/prisma.service';
import type { AppEnv } from '../../src/platform/config/env.schema';
import { BCRYPT_COST } from '../../src/auth/auth.constants';
import { E2E_FIXTURES } from './e2e-fixtures';

@Module({})
class E2ESeedModule {
  static register(config: AppEnv): DynamicModule {
    return {
      module: E2ESeedModule,
      imports: [PrismaModule.register(config)],
    };
  }
}
export async function seedE2eDatabase(config: AppEnv): Promise<void> {
  const app = await NestFactory.createApplicationContext(
    E2ESeedModule.register(config),
    {
      logger: false,
      abortOnError: false,
    },
  );
  try {
    const prisma = app.get(PrismaService);

    const passwordHash = await hash(E2E_FIXTURES.user.password, BCRYPT_COST);

    await prisma.user.upsert({
      where: {
        id: E2E_FIXTURES.user.id,
      },
      create: {
        id: E2E_FIXTURES.user.id,
        email: E2E_FIXTURES.user.email,
        passwordHash,
      },
      update: {
        email: E2E_FIXTURES.user.email,
        passwordHash,
        disabledAt: null,
      },
    });

    await prisma.organization.upsert({
      where: {
        id: E2E_FIXTURES.organization.id,
      },
      create: {
        id: E2E_FIXTURES.organization.id,
        name: E2E_FIXTURES.organization.name,
        slug: E2E_FIXTURES.organization.slug,
      },
      update: {
        name: E2E_FIXTURES.organization.name,
        slug: E2E_FIXTURES.organization.slug,
        archivedAt: null,
      },
    });

    await prisma.organization.upsert({
      where: {
        id: E2E_FIXTURES.archivedOrganization.id,
      },
      create: {
        id: E2E_FIXTURES.archivedOrganization.id,
        name: E2E_FIXTURES.archivedOrganization.name,
        slug: E2E_FIXTURES.archivedOrganization.slug,
        archivedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      update: {
        name: E2E_FIXTURES.archivedOrganization.name,
        slug: E2E_FIXTURES.archivedOrganization.slug,
        archivedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    });

    await prisma.membership.upsert({
      where: {
        organizationId_userId: {
          organizationId: E2E_FIXTURES.organization.id,
          userId: E2E_FIXTURES.user.id,
        },
      },
      create: {
        organizationId: E2E_FIXTURES.organization.id,
        userId: E2E_FIXTURES.user.id,
        role: MembershipRole.OWNER,
      },
      update: {
        role: MembershipRole.OWNER,
      },
    });

    await prisma.membership.upsert({
      where: {
        organizationId_userId: {
          organizationId: E2E_FIXTURES.archivedOrganization.id,
          userId: E2E_FIXTURES.user.id,
        },
      },
      create: {
        organizationId: E2E_FIXTURES.archivedOrganization.id,
        userId: E2E_FIXTURES.user.id,
        role: MembershipRole.OWNER,
      },
      update: {
        role: MembershipRole.OWNER,
      },
    });

    await prisma.project.upsert({
      where: {
        id: E2E_FIXTURES.project.id,
      },
      create: {
        id: E2E_FIXTURES.project.id,
        organizationId: E2E_FIXTURES.organization.id,
        name: E2E_FIXTURES.project.name,
        slug: E2E_FIXTURES.project.slug,
      },
      update: {
        organizationId: E2E_FIXTURES.organization.id,
        name: E2E_FIXTURES.project.name,
        slug: E2E_FIXTURES.project.slug,
        archivedAt: null,
      },
    });
    await prisma.project.deleteMany({
      where: {
        organizationId: E2E_FIXTURES.organization.id,
        slug: E2E_FIXTURES.createdProjectSlug,
      },
    });
  } finally {
    await app.close();
  }
}
