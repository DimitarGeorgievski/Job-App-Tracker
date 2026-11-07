import { DynamicModule, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { APP_ENV } from '../platform/config/app-env.token';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CsrfGuard } from './guards/csrf.guard';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../platform/database/prisma.module';
import type { AppEnv } from '../platform/config/env.schema';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

@Module({})
export class AuthModule {
  static register(config: AppEnv): DynamicModule {
    return {
      module: AuthModule,
      imports: [
        PrismaModule.register(config),
        ConfigModule,
        JwtModule.registerAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => ({
            secret: configService.get<string>('JWT_SECRET'),
            signOptions: { algorithm: 'HS256' },
          }),
          inject: [ConfigService],
        }),
        ThrottlerModule.forRoot([
          { name: 'short', ttl: 60000, limit: 100 },
          { name: 'long', ttl: 3600000, limit: 1000 },
        ]),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        JwtAuthGuard,
        CsrfGuard,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: CsrfGuard },
        { provide: APP_ENV, useValue: config },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
      exports: [AuthService, JwtModule],
    };
  }
}
