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
interface IndexDefRow {
  indexdef: string;
}
interface ConstraintRow {
  conname: string;
}
interface PrivilegeRow {
  has_column_privilege: boolean;
  has_table_privilege: boolean;
}
interface FkRow {
  constraint_name: string;
  update_rule: string;
}
interface RoleRow {
  role: string;
}

function tableIdentifier(table: string): string {
  return `"public"."${table}"`;
}

function regclassIdentifier(table: string): string {
  return `public."${table}"`;
}

async function queryIndex(client: Client, sql: string, params: unknown[] = []) {
  const result = await client.query<IndexDefRow>(sql, params);
  return result.rows;
}
async function queryConstraint(
  client: Client,
  sql: string,
  params: unknown[] = [],
) {
  const result = await client.query<ConstraintRow>(sql, params);
  return result.rows;
}
async function queryPrivilege(
  client: Client,
  sql: string,
  params: unknown[] = [],
) {
  const result = await client.query<PrivilegeRow>(sql, params);
  return result.rows;
}
async function queryFk(client: Client, sql: string, params: unknown[] = []) {
  const result = await client.query<FkRow>(sql, params);
  return result.rows;
}
async function queryRole(client: Client, sql: string, params: unknown[] = []) {
  const result = await client.query<RoleRow>(sql, params);
  return result.rows;
}

describe('Database invariants (hand-written objects preserved)', () => {
  beforeAll(async () => {
    await Promise.all([app.connect(), worker.connect()]);
    const appRole = await queryRole(app, 'SELECT current_user AS role');
    const workerRole = await queryRole(worker, 'SELECT current_user AS role');
    expect(appRole[0]?.role).toBe('app');
    expect(workerRole[0]?.role).toBe('worker');
  });

  afterAll(async () => {
    await Promise.all([app.end(), worker.end()]);
  });
  const expectedPartialIndexes = [
    {
      name: 'PublishedSnapshot_one_active_per_environment',
      table: 'PublishedSnapshot',
      predicate: "status = 'ACTIVE'",
      columns: ['environmentId'],
      unique: true,
    },
    {
      name: 'PublishedSnapshot_one_pending_per_environment',
      table: 'PublishedSnapshot',
      predicate: "status = 'PENDING'",
      columns: ['environmentId'],
      unique: true,
    },
  ];
  for (const idx of expectedPartialIndexes) {
    it(`has partial unique index ${idx.name}`, async () => {
      const rows = await queryIndex(
        app,
        `
        SELECT indexdef FROM pg_indexes
        WHERE schemaname = 'public' AND indexname = $1
      `,
        [idx.name],
      );
      expect(rows).toHaveLength(1);
      const def = rows[0]?.indexdef;
      expect(def).toContain(idx.predicate);
      expect(def).toContain('UNIQUE');
      for (const col of idx.columns) {
        expect(def).toContain(col);
      }
    });
  }
  const expectedChecks = [
    { table: 'User', name: 'User_email_lowercase_check' },
    { table: 'Organization', name: 'Organization_slug_format_check' },
    { table: 'Project', name: 'Project_slug_format_check' },
    { table: 'Environment', name: 'Environment_key_format_check' },
    { table: 'FeatureFlag', name: 'FeatureFlag_key_format_check' },
    {
      table: 'PublishedSnapshot',
      name: 'PublishedSnapshot_version_positive_check',
    },
    {
      table: 'PublishedSnapshot',
      name: 'PublishedSnapshot_draftRevision_nonnegative_check',
    },
    {
      table: 'PublishedSnapshot',
      name: 'PublishedSnapshot_sizeBytes_positive_check',
    },
    {
      table: 'PublishedSnapshot',
      name: 'PublishedSnapshot_checksum_hex64_check',
    },
    {
      table: 'PublishedSnapshot',
      name: 'PublishedSnapshot_active_implies_activatedAt_check',
    },
    {
      table: 'PublishedSnapshot',
      name: 'PublishedSnapshot_failed_implies_failureCode_check',
    },
    {
      table: 'PublishedSnapshot',
      name: 'PublishedSnapshot_sourceVersion_lt_version_check',
    },
    { table: 'SdkKey', name: 'SdkKey_last4_length4_check' },
  ];
  for (const chk of expectedChecks) {
    it(`has CHECK constraint ${chk.name} on ${chk.table}`, async () => {
      const rows = await queryConstraint(
        app,
        `
          SELECT conname FROM pg_constraint
          WHERE conrelid = to_regclass($1)
          AND contype = 'c'
          AND conname = $2
  `,
        [regclassIdentifier(chk.table), chk.name],
      );
      expect(rows).toHaveLength(1);
    });
  }
  const appPrivileges = [
    {
      table: 'PublishedSnapshot',
      columns: ['status', 'activatedAt', 'failureCode'],
    },
    { table: 'SdkKey', columns: ['revokedAt', 'lastUsedAt'] },
    { table: 'AuditLog', columns: [], noUpdate: true },
  ];
  for (const p of appPrivileges) {
    it(`app role has UPDATE on ${p.table}(${p.columns.join(', ')})`, async () => {
      for (const col of p.columns) {
        const rows = await queryPrivilege(
          app,
          `
          SELECT has_column_privilege('app', $1, $2, 'UPDATE')
        `,
          [tableIdentifier(p.table), col],
        );
        expect(rows[0]?.has_column_privilege).toBe(true);
      }
      if (p.noUpdate) {
        const rows = await queryPrivilege(
          app,
          `
          SELECT has_column_privilege('app', $1, 'createdAt', 'UPDATE')
        `,
          [tableIdentifier(p.table)],
        );
        expect(rows[0]?.has_column_privilege).toBe(false);
      }
    });
  }
  const workerPrivileges = [
    { table: 'PublishedSnapshot', columns: ['status', 'failureCode'] },
    { table: 'RefreshToken', columns: ['revokedAt'] },
  ];
  for (const p of workerPrivileges) {
    it(`worker role has UPDATE on ${p.table}(${p.columns.join(', ')})`, async () => {
      for (const col of p.columns) {
        const rows = await queryPrivilege(
          worker,
          `
          SELECT has_column_privilege('worker', $1, $2, 'UPDATE')
        `,
          [tableIdentifier(p.table), col],
        );
        expect(rows[0]?.has_column_privilege).toBe(true);
      }
    });
  }
  const workerReadOnlyTables = [
    'User',
    'Organization',
    'Membership',
    'Project',
    'Environment',
    'FeatureFlag',
    'FlagEnvironmentConfig',
    'FlagRule',
    'AuditLog',
    'SdkKey',
  ];
  for (const table of workerReadOnlyTables) {
    it(`worker role has NO INSERT on ${table}`, async () => {
      const rows = await queryPrivilege(
        worker,
        `
        SELECT has_table_privilege('worker', $1, 'INSERT')
      `,
        [tableIdentifier(table)],
      );
      expect(rows[0]?.has_table_privilege).toBe(false);
    });
    it(`worker role has NO UPDATE on ${table}`, async () => {
      const rows = await queryPrivilege(
        worker,
        `
        SELECT has_table_privilege('worker', $1, 'UPDATE')
      `,
        [tableIdentifier(table)],
      );
      expect(rows[0]?.has_table_privilege).toBe(false);
    });
    it(`worker role has NO DELETE on ${table}`, async () => {
      const rows = await queryPrivilege(
        worker,
        `
        SELECT has_table_privilege('worker', $1, 'DELETE')
      `,
        [tableIdentifier(table)],
      );
      expect(rows[0]?.has_table_privilege).toBe(false);
    });
  }
  it('worker role has DELETE on RefreshToken', async () => {
    const rows = await queryPrivilege(
      worker,
      `
      SELECT has_table_privilege('worker', $1, 'DELETE')
    `,
      [tableIdentifier('RefreshToken')],
    );
    expect(rows[0]?.has_table_privilege).toBe(true);
  });
  it('all foreign keys have ON UPDATE RESTRICT', async () => {
    const rows = await queryFk(
      app,
      `
      SELECT conname AS constraint_name,
             CASE confupdtype
               WHEN 'a' THEN 'NO ACTION'
               WHEN 'r' THEN 'RESTRICT'
               WHEN 'c' THEN 'CASCADE'
               WHEN 'n' THEN 'SET NULL'
               WHEN 'd' THEN 'SET DEFAULT'
             END AS update_rule
      FROM pg_constraint
      WHERE contype = 'f' AND connamespace = 'public'::regnamespace
    `,
    );
    const cascadeFks = rows.filter((r) => r.update_rule === 'CASCADE');
    expect(cascadeFks).toHaveLength(0);
  });
});
