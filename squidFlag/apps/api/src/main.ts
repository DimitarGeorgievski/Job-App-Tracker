import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { type AppEnv } from './platform/config/env.schema';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get<ConfigService<AppEnv, true>>(ConfigService);
  const host = configService.getOrThrow<string>('HOST');
  const port = configService.getOrThrow<number>('PORT');
  await app.listen(port, host);
}
void bootstrap();
