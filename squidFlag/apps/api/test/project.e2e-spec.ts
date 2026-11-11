import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import { HttpStatus } from '@nestjs/common';
import { type NestFastifyApplication } from '@nestjs/platform-fastify';
import { buildTestApp } from '../test/helpers/build-test-app';
import type {
  CreateProjectDto,
  RenameProjectDto,
} from 'src/project/dto/project.dto';
import { ACCESS_COOKIE } from '../src/auth/auth.constants';
import { E2E_FIXTURES, E2E_ORIGIN } from './seed/e2e-fixtures';

interface ProjectResponse {
  id: string;
  name: string;
  slug: string;
  organization: string;
}

interface ProjectArchiveResponse {
  success: boolean;
}

let app: NestFastifyApplication;
let accessCookie: string;
const { organization, archivedOrganization, project, user } = E2E_FIXTURES;
function authHeaders(): Record<string, string> {
  if (!accessCookie) {
    throw new Error('E2E access cookie has not been initialized');
  }

  return {
    cookie: accessCookie,
    origin: E2E_ORIGIN,
  };
}
function parseProjectResponse(payload: unknown): ProjectResponse {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('id' in payload) ||
    !('name' in payload) ||
    !('slug' in payload) ||
    !('organizationId' in payload) ||
    typeof payload.id !== 'string' ||
    typeof payload.name !== 'string' ||
    typeof payload.slug !== 'string' ||
    typeof payload.organizationId !== 'string'
  ) {
    throw new Error('Invalid project response');
  }

  return {
    id: payload.id,
    name: payload.name,
    slug: payload.slug,
    organization: payload.organizationId,
  };
}

function parseProjectArchiveResponse(payload: unknown): ProjectArchiveResponse {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('success' in payload) ||
    typeof payload.success !== 'boolean'
  ) {
    throw new Error('Invalid project archive response');
  }

  return { success: payload.success };
}

describe('ProjectController (e2e)', () => {
  beforeAll(async () => {
    app = await buildTestApp({ role: 'all', overrides: {} });
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
    const cookies =
      typeof setCookie === 'string' ? [setCookie] : (setCookie ?? []);
    const accessCookieHeader = cookies.find((cookie) =>
      cookie.startsWith(`${ACCESS_COOKIE}=`),
    );
    const accessCookieMatch = accessCookieHeader?.match(
      new RegExp(`^${ACCESS_COOKIE}=[^;]+`),
    );
    if (!accessCookieMatch) {
      throw new Error('Login did not return an access token cookie');
    }

    accessCookie = accessCookieMatch[0];
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /organizations/:orgId/projects', () => {
    it('should create a project successfully', async () => {
      const dto: CreateProjectDto = {
        name: 'E2E Test Project',
        slug: 'e2e-test-project',
      };

      const result = await app.inject({
        method: 'POST',
        url: `/organizations/${organization.id}/projects`,
        body: dto,
        headers: authHeaders(),
      });

      expect(result.statusCode).toBe(HttpStatus.CREATED);

      const body = parseProjectResponse(result.json());
      expect(body.name).toBe(dto.name);
      expect(body.slug).toBe(dto.slug);
      expect(body.organization).toBe(organization.id);
    });

    it('should return 404 when organization not found', async () => {
      const dto: CreateProjectDto = {
        name: 'Test',
        slug: 'test',
      };

      const result = await app.inject({
        method: 'POST',
        url: '/organizations/0197f8c0-1234-7abc-8def-0123456789ae/projects',
        body: dto,
        headers: authHeaders(),
      });

      expect(result.statusCode).toBe(HttpStatus.FORBIDDEN);
    });

    it('should return 400 when organization is archived', async () => {
      const dto: CreateProjectDto = {
        name: 'Test',
        slug: 'test',
      };

      const result = await app.inject({
        method: 'POST',
        url: `/organizations/${archivedOrganization.id}/projects`,
        body: dto,
        headers: authHeaders(),
      });

      expect(result.statusCode).toBe(HttpStatus.BAD_REQUEST);
    });
  });

  describe('GET /organizations/:orgId/projects', () => {
    it('should return projects for an organization', async () => {
      const result = await app.inject({
        method: 'GET',
        url: `/organizations/${organization.id}/projects`,
        headers: authHeaders(),
      });

      expect(result.statusCode).toBe(HttpStatus.OK);

      const body: unknown = result.json();

      expect(Array.isArray(body)).toBe(true);
    });
  });

  describe('GET /organizations/:orgId/projects/:projectId', () => {
    it('should return a project when found', async () => {
      const result = await app.inject({
        method: 'GET',
        url: `/organizations/${organization.id}/projects/${project.id}`,
        headers: authHeaders(),
      });

      expect(result.statusCode).toBe(HttpStatus.OK);

      const body = parseProjectResponse(result.json());

      expect(body.id).toBe(project.id);
      expect(body.organization).toBe(organization.id);
    });

    it('should return 404 when project not found', async () => {
      const result = await app.inject({
        method: 'GET',
        url: `/organizations/${organization.id}/projects/0197f8c0-1234-7abc-8def-0123456789af`,
        headers: authHeaders(),
      });

      expect(result.statusCode).toBe(HttpStatus.NOT_FOUND);
    });
  });

  describe('PATCH /organizations/:orgId/projects/:projectId/rename', () => {
    it('should rename a project successfully', async () => {
      const dto: RenameProjectDto = {
        name: 'Renamed Project',
      };

      const result = await app.inject({
        method: 'PATCH',
        url: `/organizations/${organization.id}/projects/${project.id}/rename`,
        body: dto,
        headers: authHeaders(),
      });

      expect(result.statusCode).toBe(HttpStatus.OK);

      const body = parseProjectResponse(result.json());

      expect(body.name).toBe('Renamed Project');
    });

    it('should return 400 when no name or slug provided', async () => {
      const result = await app.inject({
        method: 'PATCH',
        url: `/organizations/${organization.id}/projects/${project.id}/rename`,
        body: {},
        headers: authHeaders(),
      });

      expect(result.statusCode).toBe(HttpStatus.BAD_REQUEST);
    });
  });

  describe('PATCH /organizations/:orgId/projects/:projectId/archive', () => {
    it('should archive a project successfully', async () => {
      const result = await app.inject({
        method: 'PATCH',
        url: `/organizations/${organization.id}/projects/${project.id}/archive`,
        headers: authHeaders(),
      });

      expect(result.statusCode).toBe(HttpStatus.OK);

      const body = parseProjectArchiveResponse(result.json());

      expect(body).toEqual({ success: true });
    });

    it('should return 404 when organization not found', async () => {
      const result = await app.inject({
        method: 'PATCH',
        url: '/organizations/0197f8c0-1234-7abc-8def-0123456789ae/projects/0197f8c0-1234-7abc-8def-0123456789af/archive',
        headers: authHeaders(),
      });

      expect(result.statusCode).toBe(HttpStatus.FORBIDDEN);
    });

    it('should return 400 when organization is already archived', async () => {
      const result = await app.inject({
        method: 'PATCH',
        url: `/organizations/${archivedOrganization.id}/projects/${project.id}/archive`,
        headers: authHeaders(),
      });
      expect(result.statusCode).toBe(HttpStatus.BAD_REQUEST);
    });
  });
});
