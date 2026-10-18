import { describe, expect, it, jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { parseEnv } from '../config/env.schema';
import { AppModule } from '../../app.module';
import { PrismaService } from './prisma.service';

jest.mock('./prisma.service', () => ({
  PrismaService: jest.fn(),
}));

describe('PrismaModule', () => {
  it('should not instantiate PrismaService in evaluator mode', async () => {
    const config = parseEnv({
      APP_ROLE: 'evaluator',
      REDIS_URL: 'redis://localhost:6379',
    });
    expect(config.DATABASE_URL).toBeUndefined();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule.register(config)],
    }).compile();
    expect(PrismaService).not.toHaveBeenCalled();
    expect(() => moduleRef.get(PrismaService, { strict: false })).toThrow();
    await moduleRef.close();
  });
});
