import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { createPinoConfig } from './platform/logging/pino.config';
import { APP_ENV } from './platform/config/app-env.token';
import type { AppEnv } from './platform/config/env.schema';
import { RedisModule } from './platform/redis/redis.module';
import { HealthService } from './platform/health/health.service';
import { HealthController } from './platform/health/health.controller';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({})
export class EvaluatorAppModule {
  static register(config: AppEnv) {
    return {
      module: EvaluatorAppModule,
      imports: [
        LoggerModule.forRoot(createPinoConfig(config)),
        RedisModule.register(config),
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
