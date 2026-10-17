import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoggerModule } from 'nestjs-pino';
import { appEnv } from './platform/config/app-env';
import { createPinoConfig } from './platform/logging/pino.config';
import { HealthController } from './health/health.controller';
import { RedisModule } from './platform/redis/redis.module';
import { HealthService } from './health/health.service';
import { PrismaModule } from './platform/database/prisma.module';

@Module({
  imports: [
    LoggerModule.forRoot(createPinoConfig(appEnv)),
    RedisModule,
    PrismaModule.register(),
  ],
  controllers: [AppController, HealthController],
  providers: [AppService, HealthService],
})
export class AppModule {}
