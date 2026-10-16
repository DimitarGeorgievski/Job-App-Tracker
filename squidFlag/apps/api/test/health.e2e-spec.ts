import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { RedisService } from '../src/platform/redis/redis.service';

describe('Health endpoint (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const { AppModule } = await import('../src/app.module');
    app = await NestFactory.create<NestFastifyApplication>(
      AppModule,
      new FastifyAdapter({
        bodyLimit: 1048576,
        trustProxy: false,
        requestIdHeader: false,
        genReqId: () => randomUUID(),
      }),
      { logger: false },
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
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
      },
    });
    healthSpy.mockRestore();
  });
});
