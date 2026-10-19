export const e2eConfig = {
  NODE_ENV: 'test',
  APP_ROLE: 'all',
  REDIS_URL: process.env.E2E_REDIS_URL,
  DATABASE_URL: process.env.E2E_DATABASE_URL,
  CORS_ORIGINS: 'http://localhost:4001',
};
