import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { Logger, PinoLogger } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import { GlobalExceptionFilter } from './platform/logging/global-exception.filter';
import { appEnv } from './platform/config/app-env';

async function bootstrap() {
  const config = appEnv;
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule.register(config),
    new FastifyAdapter({
      bodyLimit: 1048576,
      trustProxy: false,
      requestIdHeader: false,
      forceCloseConnections: 'idle',
      genReqId: () => randomUUID(),
    }),
    { bufferLogs: true },
  );
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();
  app.useGlobalFilters(
    new GlobalExceptionFilter(await app.resolve(PinoLogger)),
  );
  const fastify = app.getHttpAdapter().getInstance();
  fastify.addHook('onRequest', (request, reply, done) => {
    reply.header('x-request-id', request.id);
    done();
  });
  await app.listen({
    host: appEnv.HOST,
    port: appEnv.PORT,
  });
}
void bootstrap();
