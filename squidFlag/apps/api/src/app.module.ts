import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggerModule } from 'nestjs-pino';
import { appEnv } from './platform/config/app-env';
import { createPinoConfig } from './platform/logging/pino.config';
import { HealthController } from './health/health.controller';
import { RedisModule } from './platform/redis/redis.module';

@Module({
  imports: [LoggerModule.forRoot(createPinoConfig(appEnv)), RedisModule],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule {}
