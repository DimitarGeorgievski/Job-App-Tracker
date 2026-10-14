import { DynamicModule, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { parseEnv, type AppEnv } from './platform/config/env.schema';
import { LoggerModule } from 'nestjs-pino';
import { createPinoConfig } from './platform/logging/pino.config';

@Module({})
export class AppModule {
  static register(env: AppEnv): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          validate: parseEnv,
        }),
        LoggerModule.forRoot(createPinoConfig(env)),
      ],
      controllers: [AppController],
      providers: [AppService],
    };
  }
}
