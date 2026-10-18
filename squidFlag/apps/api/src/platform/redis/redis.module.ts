import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { APP_ENV } from '../config/app-env.token';
import type { AppEnv } from '../config/env.schema';

@Module({})
export class RedisModule {
  static register(config: AppEnv) {
    return {
      module: RedisModule,
      providers: [{ provide: APP_ENV, useValue: config }, RedisService],
      exports: [RedisService],
    };
  }
}
