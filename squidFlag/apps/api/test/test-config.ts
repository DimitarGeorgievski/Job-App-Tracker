export const e2eConfig = {
  NODE_ENV: 'test',
  APP_ROLE: 'all',
  REDIS_URL: process.env.E2E_REDIS_URL,
  DATABASE_URL: process.env.E2E_DATABASE_URL,
  CORS_ORIGINS: 'http://localhost:4001',
  APP_DATABASE_URL: process.env.APP_DATABASE_URL,
  WORKER_DATABASE_URL: process.env.WORKER_DATABASE_URL,
};
