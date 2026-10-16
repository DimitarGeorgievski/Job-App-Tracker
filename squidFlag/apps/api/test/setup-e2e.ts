/* eslint-disable no-restricted-properties*/
process.env.NODE_ENV = 'development';
process.env.APP_ROLE = 'all';
process.env.REDIS_URL = 'redis://localhost:6380';
process.env.DATABASE_URL =
  'postgresql://squidflag:local-development-password@localhost:5433/squidflag';
process.env.CORS_ORIGINS = 'http://localhost:4001';
