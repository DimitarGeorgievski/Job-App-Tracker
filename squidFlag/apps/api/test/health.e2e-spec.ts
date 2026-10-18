import { type NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { RedisService } from '../src/platform/redis/redis.service';
import { buildTestApp } from './helpers/build-test-app';

describe('Health endpoint (e2e)', () => {
  let app: NestFastifyApplication;
  beforeAll(async () => {
    app = await buildTestApp({ role: 'all' });
  });
  afterAll(async () => {
    await app?.close();
  });
  it('GET /health/live returns 200', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health/live',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });
  it('GET /health/ready returns 200 when Redis is healthy', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health/ready',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: 'ok',
      dependencies: {
        redis: 'connected',
        postgres: 'connected',
      },
    });
  });
  it('GET /health/ready returns 503 when Redis is unhealthy', async () => {
    const redisService = app.get(RedisService);
    const healthSpy = jest
      .spyOn(redisService, 'isHealthy')
      .mockResolvedValue(false);
    const response = await app.inject({
      method: 'GET',
      url: '/health/ready',
    });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({
      status: 'error',
      dependencies: {
        redis: 'unavailable',
        postgres: 'connected',
      },
    });
    healthSpy.mockRestore();
  });
});
