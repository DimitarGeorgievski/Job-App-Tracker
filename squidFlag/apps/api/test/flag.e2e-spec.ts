import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import { HttpStatus } from '@nestjs/common';
import { type NestFastifyApplication } from '@nestjs/platform-fastify';
import { buildTestApp } from '../test/helpers/build-test-app';
import { E2E_FIXTURES, E2E_ORIGIN } from './seed/e2e-fixtures';
import { ACCESS_COOKIE } from '../src/auth/auth.constants';
import { PrismaService } from '../src/platform/database/prisma.service';

interface FlagCondition {
  attribute: string;
  operator: string;
  value: unknown;
}

interface FlagRule {
  id: string;
  priority: number;
  conditions: FlagCondition[];
  result: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FlagEnvironmentConfig {
  id: string;
  enabled: boolean;
  defaultValue: boolean;
  rules: FlagRule[];
}

interface FlagCreateResponse {
  key: string;
  name: string;
  organizationId: string;
  projectId: string;
  flagType: string;
  environmentConfigs: FlagEnvironmentConfig[];
}

interface FlagUpdateResponse {
  flag: {
    key: string;
    name: string | null;
    organizationId: string;
    projectId: string;
    flagType: string;
  };
  config: FlagEnvironmentConfig;
  envRevision: number;
}

interface FlagDetailResponse {
  flag: {
    key: string;
    name: string;
    organizationId: string;
    projectId: string;
    flagType: string;
  };
  config: FlagEnvironmentConfig;
  rules: {
    id: string;
    priority: number;
    conditions: FlagCondition[];
    result: boolean;
  }[];
}

interface RuleCreateResponse {
  id: string;
  priority: number;
  conditions: FlagCondition[];
  result: boolean;
}

interface RuleUpdateResponse {
  priority: number | null;
  conditions: FlagCondition[] | null;
  result: boolean | null;
}

interface ArchiveResponse {
  success: boolean;
}

function createFlagDto(
  overrides: Partial<{
    name: string;
    key: string;
    defaultValue: boolean;
    enabled: boolean;
  }> = {},
) {
  return {
    name: overrides.name ?? 'Test Flag',
    key: overrides.key ?? 'test-flag',
    defaultValue: overrides.defaultValue ?? false,
    enabled: overrides.enabled ?? true,
  };
}

describe('FlagController (e2e)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let authCookie: string = '';
  let editorCookie: string = '';
  let viewerCookie: string = '';
  function ruleDto(
    overrides: Partial<{
      priority: number;
      conditions: FlagCondition[];
      value: boolean;
    }> = {},
  ) {
    return {
      priority: overrides.priority ?? 1,
      conditions: overrides.conditions ?? [
        { attribute: 'environment', operator: 'equals', value: 'production' },
      ],
      value: overrides.value ?? true,
    };
  }

  async function loginAs(user: {
    email: string;
    password: string;
  }): Promise<string> {
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/auth/login',
      headers: { origin: E2E_ORIGIN },
      body: {
        email: user.email,
        password: user.password,
      },
    });

    expect(loginResponse.statusCode).toBe(HttpStatus.OK);

    const setCookie = loginResponse.headers['set-cookie'];
    const cookieHeader =
      typeof setCookie === 'string' ? [setCookie] : (setCookie ?? []);

    const accessCookieHeader = cookieHeader.find((cookie) =>
      cookie.startsWith(`${ACCESS_COOKIE}=`),
    );

    const accessCookieMatch = accessCookieHeader?.match(
      new RegExp(`^${ACCESS_COOKIE}=[^;]+`),
    );

    if (!accessCookieMatch) {
      throw new Error('Login did not return an access token cookie');
    }

    return accessCookieMatch[0];
  }
  function headersFor(user: {
    email: string;
    password: string;
  }): Record<string, string> {
    const cookie =
      user.email === E2E_FIXTURES.editorUser.email
        ? editorCookie
        : viewerCookie;
    return {
      cookie,
      origin: E2E_ORIGIN,
    };
  }

  beforeAll(async () => {
    app = await buildTestApp({ role: 'all' });
    prisma = app.get(PrismaService);
    authCookie = await loginAs(E2E_FIXTURES.user);
    editorCookie = await loginAs(E2E_FIXTURES.editorUser);
    viewerCookie = await loginAs(E2E_FIXTURES.viewerUser);
  });

  afterAll(async () => {
    await app.close();
  });

  function headers(): Record<string, string> {
    // authCookie stores ACCESS_COOKIE=token without Set-Cookie attributes
    return { cookie: authCookie, origin: E2E_ORIGIN };
  }

  describe('POST /flags', () => {
    it('creates a flag successfully', async () => {
      const result = await app.inject({
        method: 'POST',
        url:
          '/flags?orgId=' +
          E2E_FIXTURES.organization.id +
          '&projId=' +
          E2E_FIXTURES.project.id +
          '&envId=' +
          E2E_FIXTURES.environment.id,
        body: createFlagDto(),
        headers: headers(),
      });
      expect(result.statusCode).toBe(HttpStatus.CREATED);
      const body = result.json<FlagCreateResponse>();
      expect(body.key).toBe('test-flag');
      expect(body.name).toBe('Test Flag');
      expect(body.organizationId).toBeDefined();
      expect(body.projectId).toBeDefined();
      expect(body.flagType).toBe('BOOLEAN');
      expect(body.environmentConfigs).toBeDefined();
      expect(body.environmentConfigs.length).toBeGreaterThan(0);
    });

    it('returns 401 when not authenticated', async () => {
      const result = await app.inject({
        method: 'POST',
        url:
          '/flags?orgId=' +
          E2E_FIXTURES.organization.id +
          '&projId=' +
          E2E_FIXTURES.project.id +
          '&envId=' +
          E2E_FIXTURES.environment.id,
        body: createFlagDto(),
      });
      expect(result.statusCode).toBe(HttpStatus.UNAUTHORIZED);
    });
    it('returns 403 when user lacks flag:create permission', async () => {
      const result = await app.inject({
        method: 'POST',
        url:
          '/flags?orgId=' +
          E2E_FIXTURES.organization.id +
          '&projId=' +
          E2E_FIXTURES.project.id +
          '&envId=' +
          E2E_FIXTURES.environment.id,
        body: createFlagDto({ key: 'editor-create-flag' }),
        headers: headersFor(E2E_FIXTURES.editorUser),
      });

      expect(result.statusCode).toBe(HttpStatus.FORBIDDEN);
    });

    it('returns 409 when flag key is duplicate', async () => {
      await app.inject({
        method: 'POST',
        url:
          '/flags?orgId=' +
          E2E_FIXTURES.organization.id +
          '&projId=' +
          E2E_FIXTURES.project.id +
          '&envId=' +
          E2E_FIXTURES.environment.id,
        body: { ...createFlagDto(), key: 'dup-key' },
        headers: headers(),
      });
      const result = await app.inject({
        method: 'POST',
        url:
          '/flags?orgId=' +
          E2E_FIXTURES.organization.id +
          '&projId=' +
          E2E_FIXTURES.project.id +
          '&envId=' +
          E2E_FIXTURES.environment.id,
        body: { ...createFlagDto(), key: 'dup-key' },
        headers: headers(),
      });
      expect(result.statusCode).toBe(HttpStatus.CONFLICT);
    });

    it('returns 400 when flag key is invalid', async () => {
      const result = await app.inject({
        method: 'POST',
        url:
          '/flags?orgId=' +
          E2E_FIXTURES.organization.id +
          '&projId=' +
          E2E_FIXTURES.project.id +
          '&envId=' +
          E2E_FIXTURES.environment.id,
        body: { ...createFlagDto(), key: 'Invalid Key' },
        headers: headers(),
      });
      expect(result.statusCode).toBe(HttpStatus.BAD_REQUEST);
    });
  });

  describe('GET /flags', () => {
    it('lists flags for an organization', async () => {
      await app.inject({
        method: 'POST',
        url:
          '/flags?orgId=' +
          E2E_FIXTURES.organization.id +
          '&projId=' +
          E2E_FIXTURES.project.id +
          '&envId=' +
          E2E_FIXTURES.environment.id,
        body: createFlagDto({
          name: 'List Test Flag',
          key: 'list-test-flag',
          defaultValue: true,
          enabled: true,
        }),
        headers: headers(),
      });
      const result = await app.inject({
        method: 'GET',
        url: `/flags?orgId=${E2E_FIXTURES.organization.id}&projId=${E2E_FIXTURES.project.id}&envId=${E2E_FIXTURES.environment.id}`,
        headers: headers(),
      });
      expect(result.statusCode).toBe(HttpStatus.OK);
      const body = result.json<{ flags: FlagCreateResponse[] }>();
      expect(Array.isArray(body.flags)).toBe(true);
    });

    it('returns 404 when organization not found', async () => {
      const result = await app.inject({
        method: 'GET',
        url: `/flags?orgId=00000000-0000-0000-0000-000000000000&projId=${E2E_FIXTURES.project.id}&envId=${E2E_FIXTURES.environment.id}`,
        headers: headers(),
      });
      expect(result.statusCode).toBe(HttpStatus.NOT_FOUND);
    });

    it('returns 404 when project not found', async () => {
      const result = await app.inject({
        method: 'GET',
        url: `/flags?orgId=${E2E_FIXTURES.organization.id}&projId=00000000-0000-0000-0000-000000000000&envId=${E2E_FIXTURES.environment.id}`,
        headers: headers(),
      });
      expect(result.statusCode).toBe(HttpStatus.NOT_FOUND);
    });
  });

  describe('GET /flags/:flagKey', () => {
    it('gets a flag detail successfully', async () => {
      const createResult = await app.inject({
        method: 'POST',
        url:
          '/flags?orgId=' +
          E2E_FIXTURES.organization.id +
          '&projId=' +
          E2E_FIXTURES.project.id +
          '&envId=' +
          E2E_FIXTURES.environment.id,
        body: createFlagDto({
          name: 'Detail Test Flag',
          key: 'detail-test-flag',
          defaultValue: false,
          enabled: true,
        }),
        headers: headers(),
      });
      const createdKey = createResult.json<{ key: string }>().key;

      const result = await app.inject({
        method: 'GET',
        url: `/flags/${createdKey}?orgId=${E2E_FIXTURES.organization.id}&projId=${E2E_FIXTURES.project.id}&envId=${E2E_FIXTURES.environment.id}`,
        headers: headers(),
      });
      expect(result.statusCode).toBe(HttpStatus.OK);
      const body = result.json<FlagDetailResponse>();
      expect(body.flag.key).toBe('detail-test-flag');
      expect(body.flag.name).toBe('Detail Test Flag');
    });

    it('returns 404 when flag not found', async () => {
      const result = await app.inject({
        method: 'GET',
        url: `/flags/nonexistent-key?orgId=${E2E_FIXTURES.organization.id}&projId=${E2E_FIXTURES.project.id}&envId=${E2E_FIXTURES.environment.id}`,
        headers: headers(),
      });
      expect(result.statusCode).toBe(HttpStatus.NOT_FOUND);
    });
  });

  describe('PATCH /flags/:flagKey', () => {
    it('updates a flag successfully', async () => {
      const createResult = await app.inject({
        method: 'POST',
        url:
          '/flags?orgId=' +
          E2E_FIXTURES.organization.id +
          '&projId=' +
          E2E_FIXTURES.project.id +
          '&envId=' +
          E2E_FIXTURES.environment.id,
        body: createFlagDto({
          name: 'Update Test Flag',
          key: 'update-test-flag',
          defaultValue: true,
          enabled: false,
        }),
        headers: headers(),
      });
      const createdKey = createResult.json<{ key: string }>().key;

      const result = await app.inject({
        method: 'PATCH',
        url:
          `/flags/${createdKey}?orgId=` +
          E2E_FIXTURES.organization.id +
          `&projId=` +
          E2E_FIXTURES.project.id +
          `&envId=` +
          E2E_FIXTURES.environment.id,
        body: { name: 'Updated Flag Name' },
        headers: headers(),
      });
      expect(result.statusCode).toBe(HttpStatus.OK);
      const body = result.json<FlagUpdateResponse>();
      expect(body.flag.name).toBe('Updated Flag Name');
    });

    it('returns 400 when updating with invalid data', async () => {
      await app.inject({
        method: 'POST',
        url:
          '/flags?orgId=' +
          E2E_FIXTURES.organization.id +
          '&projId=' +
          E2E_FIXTURES.project.id +
          '&envId=' +
          E2E_FIXTURES.environment.id,
        body: createFlagDto({
          name: 'Test',
          key: 'invalid-key-update',
          defaultValue: true,
          enabled: true,
        }),
        headers: headers(),
      });
      const result = await app.inject({
        method: 'PATCH',
        url:
          '/flags/invalid-key-update?orgId=' +
          E2E_FIXTURES.organization.id +
          '&projId=' +
          E2E_FIXTURES.project.id +
          '&envId=' +
          E2E_FIXTURES.environment.id,
        body: { name: '' },
        headers: headers(),
      });
      expect(result.statusCode).toBe(HttpStatus.BAD_REQUEST);
    });

    it('returns 404 when flag not found', async () => {
      const result = await app.inject({
        method: 'PATCH',
        url:
          '/flags/nonexistent-key?orgId=' +
          E2E_FIXTURES.organization.id +
          '&projId=' +
          E2E_FIXTURES.project.id +
          '&envId=' +
          E2E_FIXTURES.environment.id,
        body: { name: 'Test' },
        headers: headers(),
      });
      expect(result.statusCode).toBe(HttpStatus.NOT_FOUND);
    });
  });

  describe('POST /flags/:flagKey/rules', () => {
    it('adds a rule successfully', async () => {
      await app.inject({
        method: 'POST',
        url:
          '/flags?orgId=' +
          E2E_FIXTURES.organization.id +
          '&projId=' +
          E2E_FIXTURES.project.id +
          '&envId=' +
          E2E_FIXTURES.environment.id,
        body: createFlagDto({
          name: 'Rule Test Flag',
          key: 'rule-test-flag',
          defaultValue: true,
          enabled: true,
        }),
        headers: headers(),
      });
      const result = await app.inject({
        method: 'POST',
        url:
          '/flags/rule-test-flag/rules?orgId=' +
          E2E_FIXTURES.organization.id +
          '&projId=' +
          E2E_FIXTURES.project.id +
          '&envId=' +
          E2E_FIXTURES.environment.id,
        body: ruleDto(),
        headers: headers(),
      });
      expect(result.statusCode).toBe(HttpStatus.CREATED);
      const body = result.json<RuleCreateResponse>();
      expect(body.priority).toBe(1);
      expect(body.conditions).toBeDefined();
      expect(body.result).toBe(true);
    });

    it('returns 401 when not authenticated', async () => {
      const result = await app.inject({
        method: 'POST',
        url: '/flags/rule-test-flag/rules',
        body: ruleDto(),
      });
      expect(result.statusCode).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('returns 403 when user lacks rule:create permission', async () => {
      const result = await app.inject({
        method: 'POST',
        url:
          '/flags/rule-test-flag/rules?orgId=' +
          E2E_FIXTURES.organization.id +
          '&projId=' +
          E2E_FIXTURES.project.id +
          '&envId=' +
          E2E_FIXTURES.environment.id,
        body: ruleDto(),
        headers: headersFor(E2E_FIXTURES.editorUser),
      });

      expect(result.statusCode).toBe(HttpStatus.FORBIDDEN);
    });

    it('returns 404 when flag not found', async () => {
      const result = await app.inject({
        method: 'POST',
        url:
          '/flags/nonexistent-key/rules?orgId=' +
          E2E_FIXTURES.organization.id +
          '&projId=' +
          E2E_FIXTURES.project.id +
          '&envId=' +
          E2E_FIXTURES.environment.id,
        body: ruleDto(),
        headers: headers(),
      });
      expect(result.statusCode).toBe(HttpStatus.NOT_FOUND);
    });

    it('returns 400 when rule conditions are invalid', async () => {
      await app.inject({
        method: 'POST',
        url:
          '/flags?orgId=' +
          E2E_FIXTURES.organization.id +
          '&projId=' +
          E2E_FIXTURES.project.id +
          '&envId=' +
          E2E_FIXTURES.environment.id,
        body: createFlagDto({
          name: 'Invalid Rule Flag',
          key: 'invalid-rule-flag',
          defaultValue: true,
          enabled: true,
        }),
        headers: headers(),
      });
      const result = await app.inject({
        method: 'POST',
        url:
          '/flags/invalid-rule-flag/rules?orgId=' +
          E2E_FIXTURES.organization.id +
          '&projId=' +
          E2E_FIXTURES.project.id +
          '&envId=' +
          E2E_FIXTURES.environment.id,
        body: ruleDto({
          conditions: [
            {
              attribute: 'invalid-attribute',
              operator: 'invalid-operator',
              value: 'test',
            },
          ],
        }),
        headers: headers(),
      });
      expect(result.statusCode).toBe(HttpStatus.BAD_REQUEST);
    });

    it('increments draftRevision on successful rule addition', async () => {
      await app.inject({
        method: 'POST',
        url:
          '/flags?orgId=' +
          E2E_FIXTURES.organization.id +
          '&projId=' +
          E2E_FIXTURES.project.id +
          '&envId=' +
          E2E_FIXTURES.environment.id,
        body: createFlagDto({
          name: 'Rule Draft Revision Test',
          key: 'rule-draft-revision-test',
          defaultValue: false,
          enabled: true,
        }),
        headers: headers(),
      });
      const addRuleResult = await app.inject({
        method: 'POST',
        url:
          '/flags/rule-draft-revision-test/rules?orgId=' +
          E2E_FIXTURES.organization.id +
          '&projId=' +
          E2E_FIXTURES.project.id +
          '&envId=' +
          E2E_FIXTURES.environment.id,
        body: ruleDto(),
        headers: headers(),
      });
      expect(addRuleResult.statusCode).toBe(HttpStatus.CREATED);
    });

    it('returns 400 when rule priority is invalid', async () => {
      await app.inject({
        method: 'POST',
        url:
          '/flags?orgId=' +
          E2E_FIXTURES.organization.id +
          '&projId=' +
          E2E_FIXTURES.project.id +
          '&envId=' +
          E2E_FIXTURES.environment.id,
        body: createFlagDto({
          name: 'Invalid Priority Flag',
          key: 'invalid-priority-flag',
          defaultValue: true,
          enabled: true,
        }),
        headers: headers(),
      });
      const result = await app.inject({
        method: 'POST',
        url:
          '/flags/invalid-priority-flag/rules?orgId=' +
          E2E_FIXTURES.organization.id +
          '&projId=' +
          E2E_FIXTURES.project.id +
          '&envId=' +
          E2E_FIXTURES.environment.id,
        body: ruleDto({ priority: -1 }),
        headers: headers(),
      });
      expect(result.statusCode).toBe(HttpStatus.BAD_REQUEST);
    });
  });

  describe('PATCH /flags/:flagKey/rules/:ruleId', () => {
    it('updates a rule successfully', async () => {
      await app.inject({
        method: 'POST',
        url:
          '/flags?orgId=' +
          E2E_FIXTURES.organization.id +
          '&projId=' +
          E2E_FIXTURES.project.id +
          '&envId=' +
          E2E_FIXTURES.environment.id,
        body: createFlagDto({
          name: 'Rule Update Test Flag',
          key: 'rule-update-test-flag',
          defaultValue: true,
          enabled: true,
        }),
        headers: headers(),
      });
      const addRuleResult = await app.inject({
        method: 'POST',
        url:
          '/flags/rule-update-test-flag/rules?orgId=' +
          E2E_FIXTURES.organization.id +
          '&projId=' +
          E2E_FIXTURES.project.id +
          '&envId=' +
          E2E_FIXTURES.environment.id,
        body: ruleDto(),
        headers: headers(),
      });

      expect(addRuleResult.statusCode).toBe(HttpStatus.CREATED);

      const ruleId = addRuleResult.json<RuleCreateResponse>().id;
      expect(ruleId).toBeDefined();

      const result = await app.inject({
        method: 'PATCH',
        url:
          `/flags/rule-update-test-flag/rules/${ruleId}?orgId=` +
          E2E_FIXTURES.organization.id +
          `&projId=` +
          E2E_FIXTURES.project.id +
          `&envId=` +
          E2E_FIXTURES.environment.id,
        body: { priority: 2, value: false },
        headers: headers(),
      });
      expect(result.statusCode).toBe(HttpStatus.OK);
      const body = result.json<RuleUpdateResponse>();
      expect(body.priority).toBe(2);
      expect(body.result).toBe(false);
    });

    it('returns 403 when user lacks rule:edit permission', async () => {
      const result = await app.inject({
        method: 'PATCH',
        url:
          '/flags/rule-update-test-flag/rules/00000000-0000-0000-0000-000000000000?orgId=' +
          E2E_FIXTURES.organization.id +
          '&projId=' +
          E2E_FIXTURES.project.id +
          '&envId=' +
          E2E_FIXTURES.environment.id,
        body: { priority: 1 },
        headers: headersFor(E2E_FIXTURES.viewerUser),
      });

      expect(result.statusCode).toBe(HttpStatus.FORBIDDEN);
    });

    it('returns 404 when rule not found', async () => {
      const result = await app.inject({
        method: 'PATCH',
        url:
          '/flags/rule-update-test-flag/rules/00000000-0000-0000-0000-000000000000?orgId=' +
          E2E_FIXTURES.organization.id +
          '&projId=' +
          E2E_FIXTURES.project.id +
          '&envId=' +
          E2E_FIXTURES.environment.id,
        body: { priority: 1 },
        headers: headers(),
      });
      expect(result.statusCode).toBe(HttpStatus.NOT_FOUND);
    });

    it('increments draftRevision on successful rule update', async () => {
      await app.inject({
        method: 'POST',
        url:
          '/flags?orgId=' +
          E2E_FIXTURES.organization.id +
          '&projId=' +
          E2E_FIXTURES.project.id +
          '&envId=' +
          E2E_FIXTURES.environment.id,
        body: createFlagDto({
          name: 'Rule Update Draft Revision Test Flag',
          key: 'rule-draft-revision-test-flag',
          defaultValue: true,
          enabled: true,
        }),
        headers: headers(),
      });
      const addRuleResult = await app.inject({
        method: 'POST',
        url:
          '/flags/rule-draft-revision-test-flag/rules?orgId=' +
          E2E_FIXTURES.organization.id +
          '&projId=' +
          E2E_FIXTURES.project.id +
          '&envId=' +
          E2E_FIXTURES.environment.id,
        body: ruleDto(),
        headers: headers(),
      });
      const ruleId = addRuleResult.json<{ id: string }>().id;

      const prisma = app.get(PrismaService);
      const initialEnv = await prisma.environment.findFirst({
        where: { key: 'test-env' },
      });
      const initialRev = initialEnv?.draftRevision ?? 0;

      await app.inject({
        method: 'PATCH',
        url:
          `/flags/rule-draft-revision-test-flag/rules/${ruleId}?orgId=` +
          E2E_FIXTURES.organization.id +
          `&projId=` +
          E2E_FIXTURES.project.id +
          `&envId=` +
          E2E_FIXTURES.environment.id,
        body: { priority: 2 },
        headers: headers(),
      });

      const updatedEnv = await prisma.environment.findFirst({
        where: { key: 'test-env' },
      });
      const updatedRev = updatedEnv?.draftRevision ?? 0;
      expect(updatedRev).toBe(initialRev + 1);
    });
  });

  describe('DELETE /flags/:flagKey/rules/:ruleId', () => {
    it('deletes a rule successfully', async () => {
      await app.inject({
        method: 'POST',
        url:
          '/flags?orgId=' +
          E2E_FIXTURES.organization.id +
          '&projId=' +
          E2E_FIXTURES.project.id +
          '&envId=' +
          E2E_FIXTURES.environment.id,
        body: createFlagDto({
          name: 'Rule Delete Test Flag',
          key: 'rule-delete-test-flag',
          defaultValue: true,
          enabled: true,
        }),
        headers: headers(),
      });
      const addRuleResult = await app.inject({
        method: 'POST',
        url:
          '/flags/rule-delete-test-flag/rules?orgId=' +
          E2E_FIXTURES.organization.id +
          '&projId=' +
          E2E_FIXTURES.project.id +
          '&envId=' +
          E2E_FIXTURES.environment.id,
        body: ruleDto(),
        headers: headers(),
      });

      expect(addRuleResult.statusCode).toBe(HttpStatus.CREATED);

      const ruleId = addRuleResult.json<RuleCreateResponse>().id;
      expect(ruleId).toBeDefined();

      const result = await app.inject({
        method: 'DELETE',
        url:
          `/flags/rule-delete-test-flag/rules/${ruleId}?orgId=` +
          E2E_FIXTURES.organization.id +
          `&projId=` +
          E2E_FIXTURES.project.id +
          `&envId=` +
          E2E_FIXTURES.environment.id,
        headers: headers(),
      });
      expect(result.statusCode).toBe(HttpStatus.OK);
      const body = result.json<ArchiveResponse>();
      expect(body.success).toBe(true);
    });

    it('returns 403 when user lacks rule:delete permission', async () => {
      const result = await app.inject({
        method: 'DELETE',
        url:
          '/flags/rule-delete-test-flag/rules/00000000-0000-0000-0000-000000000000?orgId=' +
          E2E_FIXTURES.organization.id +
          '&projId=' +
          E2E_FIXTURES.project.id +
          '&envId=' +
          E2E_FIXTURES.environment.id,
        headers: headersFor(E2E_FIXTURES.editorUser),
      });

      expect(result.statusCode).toBe(HttpStatus.FORBIDDEN);
    });

    it('returns 404 when rule not found', async () => {
      const result = await app.inject({
        method: 'DELETE',
        url:
          '/flags/rule-delete-test-flag/rules/00000000-0000-0000-0000-000000000000?orgId=' +
          E2E_FIXTURES.organization.id +
          '&projId=' +
          E2E_FIXTURES.project.id +
          '&envId=' +
          E2E_FIXTURES.environment.id,
        headers: headers(),
      });
      expect(result.statusCode).toBe(HttpStatus.NOT_FOUND);
    });

    it('increments draftRevision after rule deletion', async () => {
      await app.inject({
        method: 'POST',
        url:
          '/flags?orgId=' +
          E2E_FIXTURES.organization.id +
          '&projId=' +
          E2E_FIXTURES.project.id +
          '&envId=' +
          E2E_FIXTURES.environment.id,
        body: createFlagDto({
          name: 'Rule Delete Draft Revision Test Flag',
          key: 'rule-delete-draft-revision-test-flag',
          defaultValue: true,
          enabled: true,
        }),
        headers: headers(),
      });
      const addRuleResult = await app.inject({
        method: 'POST',
        url:
          '/flags/rule-delete-draft-revision-test-flag/rules?orgId=' +
          E2E_FIXTURES.organization.id +
          '&projId=' +
          E2E_FIXTURES.project.id +
          '&envId=' +
          E2E_FIXTURES.environment.id,
        body: ruleDto(),
        headers: headers(),
      });
      const ruleId = addRuleResult.json<{ id: string }>().id;

      const prisma = app.get(PrismaService);
      const beforeEnv = await prisma.environment.findFirst({
        where: { key: 'test-env' },
      });
      const beforeRev = beforeEnv?.draftRevision ?? 0;

      await app.inject({
        method: 'DELETE',
        url:
          `/flags/rule-delete-draft-revision-test-flag/rules/${ruleId}?orgId=` +
          E2E_FIXTURES.organization.id +
          `&projId=` +
          E2E_FIXTURES.project.id +
          `&envId=` +
          E2E_FIXTURES.environment.id,
        headers: headers(),
      });

      const afterEnv = await prisma.environment.findFirst({
        where: { key: 'test-env' },
      });
      const afterRev = afterEnv?.draftRevision ?? 0;
      expect(afterRev).toBe(beforeRev + 1);
    });
  });

  describe('DELETE /flags/:flagKey', () => {
    it('archives a flag successfully', async () => {
      await app.inject({
        method: 'POST',
        url:
          '/flags?orgId=' +
          E2E_FIXTURES.organization.id +
          '&projId=' +
          E2E_FIXTURES.project.id +
          '&envId=' +
          E2E_FIXTURES.environment.id,
        body: createFlagDto({
          name: 'Archive Test Flag',
          key: 'archive-test-flag',
          defaultValue: true,
          enabled: true,
        }),
        headers: headers(),
      });
      const result = await app.inject({
        method: 'DELETE',
        url:
          '/flags/archive-test-flag?orgId=' +
          E2E_FIXTURES.organization.id +
          '&projId=' +
          E2E_FIXTURES.project.id +
          '&envId=' +
          E2E_FIXTURES.environment.id,
        headers: headers(),
      });
      expect(result.statusCode).toBe(HttpStatus.OK);
      const body = result.json<ArchiveResponse>();
      expect(body.success).toBe(true);
    });

    it('returns 401 when not authenticated', async () => {
      const result = await app.inject({
        method: 'DELETE',
        url: '/flags/archive-test-flag',
      });
      expect(result.statusCode).toBe(HttpStatus.UNAUTHORIZED);
    });

    it('returns 404 when flag not found', async () => {
      const result = await app.inject({
        method: 'DELETE',
        url:
          '/flags/nonexistent-key?orgId=' +
          E2E_FIXTURES.organization.id +
          '&projId=' +
          E2E_FIXTURES.project.id +
          '&envId=' +
          E2E_FIXTURES.environment.id,
        headers: headers(),
      });
      expect(result.statusCode).toBe(HttpStatus.NOT_FOUND);
    });

    it('increments draftRevision on flag archive', async () => {
      const createResult = await app.inject({
        method: 'POST',
        url:
          '/flags?orgId=' +
          E2E_FIXTURES.organization.id +
          '&projId=' +
          E2E_FIXTURES.project.id +
          '&envId=' +
          E2E_FIXTURES.environment.id,
        body: createFlagDto({
          name: 'Archive Draft Revision Test',
          key: 'archive-draft-revision-test',
          defaultValue: true,
          enabled: true,
        }),
        headers: headers(),
      });
      expect(createResult.statusCode).toBe(HttpStatus.CREATED);
      const initialEnv = await prisma.environment.findUniqueOrThrow({
        where: { id: E2E_FIXTURES.environment.id },
        select: { draftRevision: true },
      });

      const archiveResult = await app.inject({
        method: 'DELETE',
        url:
          '/flags/archive-draft-revision-test?orgId=' +
          E2E_FIXTURES.organization.id +
          '&projId=' +
          E2E_FIXTURES.project.id +
          '&envId=' +
          E2E_FIXTURES.environment.id,
        headers: headers(),
      });
      expect(archiveResult.statusCode).toBe(HttpStatus.OK);
      const finalEnv = await prisma.environment.findUniqueOrThrow({
        where: { id: E2E_FIXTURES.environment.id },
        select: { draftRevision: true },
      });

      expect(finalEnv.draftRevision).toBe(initialEnv.draftRevision + 1);
    });

    it('returns 403 when user lacks flag:delete permission', async () => {
      const result = await app.inject({
        method: 'DELETE',
        url:
          '/flags/archive-test-flag?orgId=' +
          E2E_FIXTURES.organization.id +
          '&projId=' +
          E2E_FIXTURES.project.id +
          '&envId=' +
          E2E_FIXTURES.environment.id,
        headers: headersFor(E2E_FIXTURES.editorUser),
      });

      expect(result.statusCode).toBe(HttpStatus.FORBIDDEN);
    });
  });
});
