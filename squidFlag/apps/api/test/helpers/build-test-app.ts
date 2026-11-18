import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../../src/app.module';
import { EvaluatorAppModule } from '../../src/evaluator-app.module';
import { parseEnv, type AppRole } from '../../src/platform/config/env.schema';
import { e2eConfig } from '../test-config';
import { assertTestDatabase } from '../assert-test-database';
import fastifyCookie from '@fastify/cookie';
import { MockR2Service } from '../mocks/mock-r2.service';
import { R2Service } from '../../src/platform/storage/r2/r2.service';

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
  assertTestDatabase(config);
  const mockR2Service = new MockR2Service();
  const moduleBuilder = Test.createTestingModule({
    imports: [
      role === 'evaluator'
        ? EvaluatorAppModule.register(config)
        : AppModule.register(config),
    ],
    providers: [
      {
        provide: MockR2Service,
        useValue: mockR2Service,
      },
    ],
  });

  if (role !== 'evaluator') {
    moduleBuilder.overrideProvider(R2Service).useValue(mockR2Service);
  }
  const moduleRef = await moduleBuilder.compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter({
      bodyLimit: 1048576,
      trustProxy: false,
      requestIdHeader: false,
      forceCloseConnections: 'idle',
      genReqId: () => randomUUID(),
    }),
    {
      logger: ['error', 'warn'],
      abortOnError: false,
    },
  );
  await app.register(fastifyCookie);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}
