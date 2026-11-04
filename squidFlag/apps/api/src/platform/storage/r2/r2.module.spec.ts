import { describe, expect, it } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { APP_ENV } from '../../config/app-env.token';
import { parseEnv } from '../../config/env.schema';
import { R2Module } from './r2.module';
import { R2Service } from './r2.service';

describe('R2Module', () => {
  it('provides and exports R2Service', async () => {
    const env = parseEnv({
      APP_ROLE: 'all',
      DATABASE_URL: 'postgresql://user:password@localhost:5432/squidflag',
      CORS_ORIGINS: 'http://localhost:3000',
      REDIS_URL: 'redis://localhost:6379',
      R2_ENDPOINT: 'https://example.r2.cloudflarestorage.com',
      R2_BUCKET: 'squidflag',
      R2_ACCESS_KEY_ID: 'test-access-key',
      R2_SECRET_ACCESS_KEY: 'test-secret-key',
      JWT_SECRET: 'test-secret-at-least-32-characters-long',
    });
    const moduleRef = await Test.createTestingModule({
      imports: [R2Module.register(env)],
    }).compile();
    expect(moduleRef.get(APP_ENV)).toBe(env);
    expect(moduleRef.get(R2Service)).toBeInstanceOf(R2Service);

    await moduleRef.close();
  });
});
