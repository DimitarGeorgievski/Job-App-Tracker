import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { UserService } from './user/user.service';
import { PrismaService } from './prisma/prisma.service';
import { JobModule } from './job/job.module';
import { ApplicationModule } from './application/application.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { CoverLetterModule } from './cover-letter/cover-letter.module';
import { AnalyticsModule } from './analytics/analytics.module';
import 'dotenv';
import { seconds, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { CustomThrottlerGuard } from './rate-limit/throttler.guard';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: '.env', isGlobal: true }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [{ ttl: seconds(300), limit: 50 }],
        storage: new ThrottlerStorageRedisService(
          new Redis({
            host: config.get<string>('REDIS_HOST'),
            port: config.get<number>('REDIS_PORT'),
          }),
        ),
      }),
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
      },
    }),
    AuthModule,
    UserModule,
    JobModule,
    ApplicationModule,
    CloudinaryModule,
    CoverLetterModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService, UserService, PrismaService, {
    provide: APP_GUARD,
    useClass: CustomThrottlerGuard
  }],
})
export class AppModule {}
