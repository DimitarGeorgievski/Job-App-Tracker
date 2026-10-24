import { Module } from '@nestjs/common';
import { APP_ENV } from '../../config/app-env.token';
import type { AppEnv } from '../../config/env.schema';
import { R2Service } from './r2.service';

@Module({})
export class R2Module {
  static register(config: AppEnv) {
    return {
      module: R2Module,
      providers: [{ provide: APP_ENV, useValue: config }, R2Service],
      exports: [R2Service],
    };
  }
}
