import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { type AppEnv } from './platform/config/env.schema';
import { loadEnvironment } from './platform/config/env.loader';
import { Logger, PinoLogger } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import { GlobalExceptionFilter } from './platform/logging/global-exception.filter';

async function bootstrap() {
  const env = loadEnvironment();
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule.register(env),
    new FastifyAdapter({
      trustProxy: false,
      requestIdHeader: false,
      genReqId: () => randomUUID(),
    }),
    { bufferLogs: true },
  );
  app.useLogger(app.get(Logger));
  app.useGlobalFilters(
    new GlobalExceptionFilter(await app.resolve(PinoLogger)),
  );
  const fastify = app.getHttpAdapter().getInstance();
  fastify.addHook('onRequest', (request, reply, done) => {
    reply.header('x-request-id', request.id);
    done();
  });
  const configService = app.get<ConfigService<AppEnv, true>>(ConfigService);
  const host = configService.getOrThrow<string>('HOST');
  const port = configService.getOrThrow<number>('PORT');
  await app.listen({host,port});
}
void bootstrap();
