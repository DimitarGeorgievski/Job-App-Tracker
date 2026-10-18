import { ServiceUnavailableException } from '@nestjs/common';
import { HealthService } from '../src/platform/health/health.service';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { RedisService } from '../src/platform/redis/redis.service';

type RedisServiceMock = {
  isHealthy: jest.Mock<() => Promise<boolean>>;
};
type PostgresHealthCheckMock = {
  isHealthy: jest.Mock<() => Promise<boolean>>;
};
const postgresHealth: PostgresHealthCheckMock = {
  isHealthy: jest.fn<() => Promise<boolean>>(),
};
describe('HealthService', () => {
  let service: HealthService;
  const redisService: RedisServiceMock = {
    isHealthy: jest.fn<() => Promise<boolean>>(),
  };
  beforeEach(() => {
    jest.clearAllMocks();
    redisService.isHealthy.mockResolvedValue(true);
    postgresHealth.isHealthy.mockResolvedValue(true);

    service = new HealthService(
      redisService as unknown as RedisService,
      postgresHealth,
    );
  });
  async function expectUnavailable(
    promise: Promise<unknown>,
  ): Promise<unknown> {
    const error = await promise.then(
      () => undefined,
      (reason: unknown) => reason,
    );
    expect(error).toBeInstanceOf(ServiceUnavailableException);
    if (!(error instanceof ServiceUnavailableException)) {
      return undefined;
    }
    expect(error.getStatus()).toBe(503);
    return error.getResponse();
  }
  it('returns ready when Redis and PostgreSQL are healthy', async () => {
    await expect(service.checkReadiness()).resolves.toEqual({
      status: 'ok',
      dependencies: {
        redis: 'connected',
        postgres: 'connected',
      },
    });
    expect(redisService.isHealthy).toHaveBeenCalledTimes(1);
    expect(postgresHealth.isHealthy).toHaveBeenCalledTimes(1);
  });
  it('returns 503 when a dependency is unavailable', async () => {
    redisService.isHealthy.mockResolvedValue(false);
    const response = await expectUnavailable(service.checkReadiness());
    expect(response).toEqual({
      status: 'error',
      dependencies: {
        redis: 'unavailable',
        postgres: 'connected',
      },
    });
  });
  it('returns 503 when a dependency check times out', async () => {
    jest.useFakeTimers();

    try {
      redisService.isHealthy.mockReturnValue(new Promise<boolean>(() => {}));
      const readiness = service.checkReadiness();
      const result = expectUnavailable(readiness);
      await jest.advanceTimersByTimeAsync(1000);
      const response = await result;
      expect(response).toEqual({
        status: 'error',
        dependencies: {
          redis: 'unavailable',
          postgres: 'connected',
        },
      });
    } finally {
      jest.useRealTimers();
    }
  });
  it('returns 503 when the application is shutting down', async () => {
    service.onModuleDestroy();
    const response = await expectUnavailable(service.checkReadiness());
    expect(response).toEqual({
      status: 'error',
      reason: 'shutting_down',
    });
    expect(redisService.isHealthy).not.toHaveBeenCalled();
  });
  it('shares one in-flight check between concurrent callers', async () => {
    let resolveRedis!: (value: boolean) => void;
    const redisPromise = new Promise<boolean>((resolve) => {
      resolveRedis = resolve;
    });
    redisService.isHealthy.mockReturnValue(redisPromise);
    const first = service.checkReadiness();
    const second = service.checkReadiness();
    expect(redisService.isHealthy).toHaveBeenCalledTimes(1);
    expect(postgresHealth.isHealthy).toHaveBeenCalledTimes(1);
    resolveRedis(true);
    const results = await Promise.all([first, second]);
    expect(results[0]).toEqual(results[1]);
    expect(results[0]).toEqual({
      status: 'ok',
      dependencies: {
        redis: 'connected',
        postgres: 'connected',
      },
    });
    expect(redisService.isHealthy).toHaveBeenCalledTimes(1);
    expect(postgresHealth.isHealthy).toHaveBeenCalledTimes(1);
  });
  it('returns 503 when PostgreSQL is unavailable', async () => {
    postgresHealth.isHealthy.mockRejectedValue(
      new Error('Database unavailable'),
    );
    const response = await expectUnavailable(service.checkReadiness());
    expect(response).toEqual({
      status: 'error',
      dependencies: {
        redis: 'connected',
        postgres: 'unavailable',
      },
    });
  });

  it('checks only Redis when PostgreSQL is not configured', async () => {
    service = new HealthService(redisService as unknown as RedisService);
    await expect(service.checkReadiness()).resolves.toEqual({
      status: 'ok',
      dependencies: {
        redis: 'connected',
      },
    });
    expect(redisService.isHealthy).toHaveBeenCalledTimes(1);
    expect(postgresHealth.isHealthy).not.toHaveBeenCalled();
  });
});
