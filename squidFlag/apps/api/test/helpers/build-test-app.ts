import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../../src/app.module';
import { parseEnv, type AppRole } from '../../src/platform/config/env.schema';
import { e2eConfig } from '../test-config';

interface BuildTestAppOptions {
  role: AppRole;
  overrides?: Record<string, string | undefined>;
}
export async function buildTestApp({
  role,
  overrides = {},
}: BuildTestAppOptions): Promise<NestFastifyApplication> {
  const config = parseEnv({
    ...e2eConfig,
    ...overrides,
    NODE_ENV: 'test',
    APP_ROLE: role,
  });
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule.register(config),
    new FastifyAdapter({
      bodyLimit: 1048576,
      trustProxy: false,
      requestIdHeader: false,
      forceCloseConnections: 'idle',
      genReqId: () => randomUUID(),
    }),
    { logger: false },
  );
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}
