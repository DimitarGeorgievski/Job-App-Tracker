import dotenv from 'dotenv';
import { resolve } from 'node:path';
import { defineConfig } from 'prisma/config';

dotenv.config({
  path: resolve(
    process.cwd().replace(/\\/g, '/').endsWith('/apps/api')
      ? '.env'
      : 'apps/api/.env',
  ),
});

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.MIGRATOR_DATABASE_URL,
  },
});
