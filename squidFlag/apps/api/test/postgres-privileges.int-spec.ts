import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { Client } from 'pg';
import { e2eConfig } from './test-config';

const appUrl = e2eConfig.APP_DATABASE_URL;
const workerUrl = e2eConfig.WORKER_DATABASE_URL;
if (!appUrl || !workerUrl) {
  throw new Error(
    'APP_DATABASE_URL and WORKER_DATABASE_URL must be configured',
  );
}
const app = new Client({ connectionString: appUrl });
const worker = new Client({ connectionString: workerUrl });
async function expectPermissionDenied(
  client: Client,
  query: string,
): Promise<void> {
  try {
    await client.query(query);
    throw new Error(`Expected PostgreSQL permission denial: ${query}`);
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === '42501') {
      return;
    }

    throw error;
  }
}
describe('PostgreSQL runtime privileges', () => {
  beforeAll(async () => {
    await app.connect();
    await worker.connect();
    const appRole = await app.query<{ role: string }>(
      'SELECT current_user AS role',
    );
    const workerRole = await worker.query<{ role: string }>(
      'SELECT current_user AS role',
    );
    expect(appRole.rows[0]?.role).toBe('app');
    expect(workerRole.rows[0]?.role).toBe('worker');
  });
  afterAll(async () => {
    await Promise.all([app.end(), worker.end()]);
  });
  it('allows app to read AuditLog but denies mutations', async () => {
    await expect(
      app.query('SELECT * FROM "AuditLog" LIMIT 0'),
    ).resolves.toBeDefined();
    await expectPermissionDenied(
      app,
      'UPDATE "AuditLog" SET "action" = \'blocked\' WHERE false',
    );
    await expectPermissionDenied(app, 'DELETE FROM "AuditLog" WHERE false');
  });
  it('restricts SdkKey updates to approved columns', async () => {
    await expect(
      app.query('UPDATE "SdkKey" SET "revokedAt" = NULL WHERE false'),
    ).resolves.toBeDefined();

    await expectPermissionDenied(
      app,
      'UPDATE "SdkKey" SET "keyHash" = \'forbidden\' WHERE false',
    );
  });
  it('restricts PublishedSnapshot updates to approved columns', async () => {
    await expect(
      app.query(
        'UPDATE "PublishedSnapshot" SET "status" = \'ACTIVE\' WHERE false',
      ),
    ).resolves.toBeDefined();
    await expectPermissionDenied(
      app,
      'UPDATE "PublishedSnapshot" SET "checksum" = \'forbidden\' WHERE false',
    );
  });
  it('allows worker to read but denies writes', async () => {
    await expect(
      worker.query('SELECT * FROM "AuditLog" LIMIT 0'),
    ).resolves.toBeDefined();
    await expectPermissionDenied(
      worker,
      'UPDATE "User" SET "email" = \'blocked@example.com\' WHERE false',
    );
    await expectPermissionDenied(
      worker,
      'INSERT INTO "AuditLog" DEFAULT VALUES',
    );
  });
});
