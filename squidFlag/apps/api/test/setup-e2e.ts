/* eslint-disable no-restricted-properties */
const databaseUrl = process.env.E2E_DATABASE_URL;
const redisUrl = process.env.E2E_REDIS_URL;

if (!databaseUrl || !redisUrl) {
  throw new Error(
    'E2E_DATABASE_URL and E2E_REDIS_URL must be configured before running E2E tests',
  );
}
const parsedDatabaseUrl = new URL(databaseUrl);
if (parsedDatabaseUrl.pathname !== '/squidflag_test') {
  throw new Error('E2E_DATABASE_URL must target squidflag_test');
}
const parsedRedisUrl = new URL(redisUrl);
if (parsedRedisUrl.pathname !== '/1') {
  throw new Error('E2E_REDIS_URL must target Redis database 1');
}
process.env.NODE_ENV = 'test';
process.env.APP_ROLE = 'all';
process.env.REDIS_URL = redisUrl;
process.env.DATABASE_URL = databaseUrl;
process.env.CORS_ORIGINS = 'http://localhost:4001';