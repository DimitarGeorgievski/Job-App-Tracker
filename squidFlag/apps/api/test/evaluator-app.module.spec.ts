import { describe, expect, it } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { parseEnv } from '../src/platform/config/env.schema';
import { EvaluatorAppModule } from '../src/evaluator-app.module';

describe('EvaluatorAppModule', () => {
  it('boots without registering Prisma dependencies', async () => {
    const config = parseEnv({
      APP_ROLE: 'evaluator',
      REDIS_URL: 'redis://localhost:6379',
    });
    expect(config.DATABASE_URL).toBeUndefined();
    const moduleRef = await Test.createTestingModule({
      imports: [EvaluatorAppModule.register(config)],
    }).compile();
    await moduleRef.close();
  });
});
