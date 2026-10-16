import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';
import { parseEnv, type AppEnv } from './env.schema';

export function loadEnvironment(): AppEnv {
  if ((process.env.NODE_ENV ?? 'development') === 'development') {
    loadDotenv({
      path: resolve(process.cwd(), '.env'),
      override: false,
      quiet: true,
    });
  }
  return parseEnv(process.env);
}
