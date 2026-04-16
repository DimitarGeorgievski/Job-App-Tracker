import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BullModule } from '@nestjs/bullmq';
import { redisConfig } from './queue/redis.config';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { UserService } from './user/user.service';
import { PrismaService } from './prisma/prisma.service';
import { JobModule } from './job/job.module';
import { ApplicationModule } from './application/application.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({envFilePath: '.env', isGlobal: true}),
    BullModule.forRoot({
      connection: redisConfig,
    }),
    AuthModule,
    UserModule,
    JobModule,
    ApplicationModule,
  ],
  controllers: [AppController],
  providers: [AppService,UserService,PrismaService],
})
export class AppModule {}
