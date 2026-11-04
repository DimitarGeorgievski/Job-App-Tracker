import { type NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import { RedisService } from '../src/platform/redis/redis.service';
import { buildTestApp } from './helpers/build-test-app';
import type { PostgresHealthCheck } from '../src/platform/health/postgres-health.token';
import { HealthService } from '../src/platform/health/health.service';

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
  it('refuses to boot when DATABASE_URL targets a non-test database', async () => {
    await expect(
      buildTestApp({
        role: 'all',
        overrides: {
          DATABASE_URL: 'postgresql://test:test@localhost:5433/squidflag_dev',
        },
      }),
    ).rejects.toThrow(
      'Tests may only use a PostgreSQL database ending in _test',
    );
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
  it('GET /health/ready returns 503 when PostgreSQL is unhealthy', async () => {
    const healthService = app.get(HealthService);
    const postgresHealth = (
      healthService as unknown as {
        postgresHealth: PostgresHealthCheck;
      }
    ).postgresHealth;
    const healthSpy = jest
      .spyOn(postgresHealth, 'isHealthy')
      .mockResolvedValue(false);
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/health/ready',
      });
      expect(healthSpy).toHaveBeenCalled();
      expect(response.statusCode).toBe(503);
      expect(response.json()).toEqual({
        status: 'error',
        dependencies: {
          redis: 'connected',
          postgres: 'unavailable',
        },
      });
    } finally {
      healthSpy.mockRestore();
    }
  });
  it('evaluator starts without PostgreSQL and checks only Redis', async () => {
    const evaluatorApp = await buildTestApp({
      role: 'evaluator',
      overrides: {
        DATABASE_URL: undefined,
        CORS_ORIGINS: undefined,
      },
    });
    try {
      const response = await evaluatorApp.inject({
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
    } finally {
      await evaluatorApp.close();
    }
  });
});
