import { describe, expect, it } from '@jest/globals';
import type { Options } from 'pino-http';
import type { AppEnv } from '../config/env.schema';
import { createPinoConfig } from './pino.config';

const baseEnv: AppEnv = {
  NODE_ENV: 'development',
  APP_ROLE: 'evaluator',
  HOST: '127.0.0.1',
  PORT: 4000,
  LOG_LEVEL: 'debug',
  REDIS_URL: 'redis://127.0.0.1:6380',
  CORS_ORIGINS: [],
};
describe('createPinoConfig', () => {
  it('uses the validated log level and redacts sensitive headers', () => {
    const pinoHttp = createPinoConfig(baseEnv).pinoHttp as Options;
    expect(pinoHttp.level).toBe('debug');
    expect(pinoHttp.redact).toEqual({
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        "res.headers['set-cookie']",
      ],
      remove: true,
    });
  });
  it('uses pino-pretty only in development', () => {
    const development = createPinoConfig(baseEnv).pinoHttp as Options;
    const production = createPinoConfig({
      ...baseEnv,
      NODE_ENV: 'production',
      REDIS_URL: 'rediss://redis.example.com:6380',
      CORS_ORIGINS: ['https://dashboard.example.com'],
    }).pinoHttp as Options;
    expect(development.transport).toMatchObject({ target: 'pino-pretty' });
    expect(production.transport).toBeUndefined();
  });
});
