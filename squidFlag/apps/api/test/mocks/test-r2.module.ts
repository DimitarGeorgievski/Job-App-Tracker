import { Module } from '@nestjs/common';
import { APP_ENV } from '../../src/platform/config/app-env.token';
import { R2Service } from '../../src/platform/storage/r2/r2.service';
import { MockR2Service } from './mock-r2.service';

@Module({
  providers: [
    MockR2Service,
    {
      provide: R2Service,
      useExisting: MockR2Service,
    },
    {
      provide: APP_ENV,
      useValue: {
        R2_ENDPOINT: 'http://localhost:9000',
        R2_ACCESS_KEY_ID: 'test',
        R2_SECRET_ACCESS_KEY: 'test',
        R2_BUCKET: 'test-bucket',
        DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
        REDIS_URL: 'redis://localhost:6379',
        JWT_SECRET: 'test-only-secret-that-is-at-least-32-characters-long',
        CORS_ORIGINS: 'http://localhost:4001',
        APP_DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
        WORKER_DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
        NODE_ENV: 'test',
        APP_ROLE: 'all',
      },
    },
  ],
  exports: [R2Service, MockR2Service],
})
export class TestR2Module {}
