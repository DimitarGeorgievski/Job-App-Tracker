import { DynamicModule, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggerModule } from 'nestjs-pino';
import { createPinoConfig } from './platform/logging/pino.config';
import { RedisModule } from './platform/redis/redis.module';
import { PrismaModule } from './platform/database/prisma.module';
import { APP_ENV } from './platform/config/app-env.token';
import type { AppEnv } from './platform/config/env.schema';
import { HealthService } from './platform/health/health.service';
import { HealthController } from './platform/health/health.controller';

@Module({})
export class AppModule {
  static register(config: AppEnv): DynamicModule {
    return {
      module: AppModule,
      imports: [
        LoggerModule.forRoot(createPinoConfig(config)),
        RedisModule.register(config),
        PrismaModule.register(config),
      ],
      controllers: [AppController, HealthController],
      providers: [
        { provide: APP_ENV, useValue: config },
        AppService,
        HealthService,
      ],
    };
  }
}
