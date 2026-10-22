import { describe, expect, it, jest } from '@jest/globals';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  it('reports healthy when the database query succeeds', async () => {
    const service = Object.create(PrismaService.prototype) as PrismaService;
    jest
      .spyOn(service, '$queryRaw')
      .mockResolvedValue([{ result: 1 }] as never);
    await expect(service.isHealthy()).resolves.toBe(true);
  });
  it('reports unhealthy when the database query fails', async () => {
    const service = Object.create(PrismaService.prototype) as PrismaService;
    jest
      .spyOn(service, '$queryRaw')
      .mockRejectedValue(new Error('Database connection failed'));
    await expect(service.isHealthy()).resolves.toBe(false);
  });
});
