import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';
import { parseEnv } from '../src/platform/config/env.schema';
import { assertTestDatabase } from './assert-test-database';
import { seedE2eDatabase } from './seed/e2e-seed';

export default async function globalSetup(): Promise<void> {
  loadDotenv({
    path: resolve(__dirname, '../.env.test'),
    override: false,
    quiet: true,
  });

  // Import only after dotenv has loaded the environment.
  const { e2eConfig } = await import('./test-config');

  const config = parseEnv({
    ...e2eConfig,
    NODE_ENV: 'test',
    APP_ROLE: 'all',
  });
  assertTestDatabase(config);
  const databaseUrl = process.env.E2E_DATABASE_URL;
  const redisUrl = process.env.E2E_REDIS_URL;
  if (!databaseUrl || !redisUrl) {
    throw new Error(
      'E2E_DATABASE_URL and E2E_REDIS_URL must be configured before running tests',
    );
  }
  const parsedDatabaseUrl = new URL(databaseUrl);
  const databaseName = decodeURIComponent(parsedDatabaseUrl.pathname.slice(1));

  if (!databaseName.endsWith('_test')) {
    throw new Error('E2E_DATABASE_URL must target a database ending in _test');
  }
  const parsedRedisUrl = new URL(redisUrl);
  if (parsedRedisUrl.pathname !== '/1') {
    throw new Error('E2E_REDIS_URL must target Redis database 1');
  }
  await seedE2eDatabase(config);
}
