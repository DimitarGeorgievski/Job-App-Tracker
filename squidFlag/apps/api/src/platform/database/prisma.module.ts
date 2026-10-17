import { DynamicModule, Module } from '@nestjs/common';
import { appEnv } from '../config/app-env';
import { PrismaService } from './prisma.service';

@Module({})
export class PrismaModule {
  static register(): DynamicModule {
    if (appEnv.APP_ROLE === 'evaluator') {
      return {
        module: PrismaModule,
      };
    }
    return {
      module: PrismaModule,
      providers: [PrismaService],
      exports: [PrismaService],
    };
  }
}
