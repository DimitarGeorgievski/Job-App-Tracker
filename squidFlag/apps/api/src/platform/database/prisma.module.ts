import { DynamicModule, Module } from '@nestjs/common';
import { APP_ENV } from '../config/app-env.token';
import type { AppEnv } from '../config/env.schema';
import { PrismaService } from './prisma.service';
import { POSTGRES_HEALTH_CHECK } from '../health/postgres-health.token';

@Module({})
export class PrismaModule {
  static register(config: AppEnv): DynamicModule {
    if (config.APP_ROLE === 'evaluator') {
      return {
        module: PrismaModule,
      };
    }
    return {
      module: PrismaModule,
      providers: [
        { provide: APP_ENV, useValue: config },
        PrismaService,
        {
          provide: POSTGRES_HEALTH_CHECK,
          useExisting: PrismaService,
        },
      ],
      exports: [PrismaService, POSTGRES_HEALTH_CHECK],
    };
  }
}
