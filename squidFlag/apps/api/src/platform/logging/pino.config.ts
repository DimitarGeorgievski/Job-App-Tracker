import type { Params } from 'nestjs-pino';
import type { AppEnv } from '../config/env.schema';

const healthPaths = new Set(['/health/live', '/health/ready']);

export function createPinoConfig(env: AppEnv): Params {
  return {
    pinoHttp: {
      level: env.LOG_LEVEL,
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          "res.headers['set-cookie']",
        ],
        remove: true,
      },
      autoLogging: {
        ignore: (request) => healthPaths.has(request.url?.split('?')[0] ?? ''),
      },
      ...(env.NODE_ENV === 'development'
        ? {
            transport: {
              target: 'pino-pretty',
              options: { colorize: true, singleLine: true },
            },
          }
        : {}),
    },
  };
}
