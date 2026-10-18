import { Test, type TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { RedisModule } from '../src/platform/redis/redis.module';
import { RedisService } from '../src/platform/redis/redis.service';
import { parseEnv } from '../src/platform/config/env.schema';
import { e2eConfig } from './test-config';

describe('RedisService (integration)', () => {
  let moduleRef: TestingModule;
  let redisService: RedisService;

  beforeAll(async () => {
    const config = parseEnv(e2eConfig);
    moduleRef = await Test.createTestingModule({
      imports: [RedisModule.register(config)],
    }).compile();
    redisService = moduleRef.get(RedisService);
    await moduleRef.init();
  });
  afterAll(async () => {
    await moduleRef?.close();
  });
  it('connects to Redis and responds to PING', async () => {
    expect(await redisService.isHealthy()).toBe(true);
    expect(await redisService.getClient().ping()).toBe('PONG');
  });
  it('writes and reads a value from Redis', async () => {
    // eslint-disable-next-line no-restricted-properties
    const prefix = process.env.TEST_REDIS_PREFIX;
    if (!prefix) {
      throw new Error('TEST_REDIS_PREFIX must be configured for tests');
    }
    const key = `${prefix}:redis:${crypto.randomUUID()}`;
    try {
      await redisService.getClient().set(key, 'integration-ok');
      await expect(redisService.getClient().get(key)).resolves.toBe(
        'integration-ok',
      );
    } finally {
      await redisService.getClient().del(key);
    }
  });
});
