import { describe, expect, it, jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { parseEnv } from '../config/env.schema';
import { AppModule } from '../../app.module';
import { EvaluatorAppModule } from '../../evaluator-app.module';
import { PrismaModule } from './prisma.module';
import { PrismaService } from './prisma.service';

jest.mock('./prisma.service', () => ({
  PrismaService: jest.fn(),
}));
describe('PrismaModule', () => {
  it('should not register PrismaService in evaluator mode', async () => {
    const config = parseEnv({
      APP_ROLE: 'evaluator',
      REDIS_URL: 'redis://localhost:6379',
    });
    const moduleRef = await Test.createTestingModule({
      imports: [PrismaModule.register(config)],
    }).compile();
    expect(PrismaService).not.toHaveBeenCalled();
    expect(() => moduleRef.get(PrismaService, { strict: false })).toThrow();
    await moduleRef.close();
  });
  it('should not instantiate PrismaService through AppModule in evaluator mode', async () => {
    const config = parseEnv({
      APP_ROLE: 'evaluator',
      REDIS_URL: 'redis://localhost:6379',
    });
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule.register(config)],
    }).compile();
    expect(PrismaService).not.toHaveBeenCalled();
    expect(() => moduleRef.get(PrismaService, { strict: false })).toThrow();
    await moduleRef.close();
  });
  it('should not import PrismaModule in EvaluatorAppModule', async () => {
    const config = parseEnv({
      APP_ROLE: 'evaluator',
      REDIS_URL: 'redis://localhost:6379',
    });
    const moduleRef = await Test.createTestingModule({
      imports: [EvaluatorAppModule.register(config)],
    }).compile();
    expect(() => moduleRef.get(PrismaService, { strict: false })).toThrow();
    expect(() => moduleRef.get(PrismaModule, { strict: false })).toThrow();
    await moduleRef.close();
  });
  it('should not instantiate PrismaService when evaluator has DATABASE_URL', async () => {
    jest.clearAllMocks();
    const config = parseEnv({
      APP_ROLE: 'evaluator',
      REDIS_URL: 'redis://localhost:6379',
      DATABASE_URL: 'postgresql://user:password@localhost:5432/squidflag',
    });
    expect(config.DATABASE_URL).toBe(
      'postgresql://user:password@localhost:5432/squidflag',
    );
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule.register(config)],
    }).compile();
    expect(PrismaService).not.toHaveBeenCalled();
    expect(() => moduleRef.get(PrismaService, { strict: false })).toThrow();
    await moduleRef.close();
  });
});
