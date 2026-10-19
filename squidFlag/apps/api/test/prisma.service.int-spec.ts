import { Test, type TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { parseEnv } from '../src/platform/config/env.schema';
import { PrismaModule } from '../src/platform/database/prisma.module';
import { PrismaService } from '../src/platform/database/prisma.service';
import { e2eConfig } from './test-config';
import { assertTestDatabase } from './assert-test-database';

describe('PrismaService (integration)', () => {
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
  it('connects to PostgreSQL and executes a query', async () => {
    await expect(prismaService.$queryRaw`SELECT 1`).resolves.toEqual([
      { '?column?': 1 },
    ]);
  });
});
