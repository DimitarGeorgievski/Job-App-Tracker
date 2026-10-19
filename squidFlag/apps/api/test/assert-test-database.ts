import type { AppEnv } from '../src/platform/config/env.schema';

export function assertTestDatabase(config: AppEnv): void {
  if (config.APP_ROLE === 'evaluator') {
    return;
  }
  const databaseUrl = new URL(config.DATABASE_URL);
  const databaseName = decodeURIComponent(databaseUrl.pathname.slice(1));
  if (!databaseName.endsWith('_test')) {
    throw new Error('Tests may only use a PostgreSQL database ending in _test');
  }
}
