import { config as loadDotenv } from 'dotenv';
import { resolve } from 'node:path';

export default function globalSetup(): void {
  loadDotenv({
    path: resolve(__dirname, '../.env.test'),
    override: false,
    quiet: true,
  });
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
}
