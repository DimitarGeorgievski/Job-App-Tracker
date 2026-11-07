import { describe, expect, it, beforeEach } from '@jest/globals';
import { type ExecutionContext } from '@nestjs/common';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import { type PermissionKey } from '../rbac/permissions';
import { type MembershipRole } from 'generated/prisma/client';
import { createOrgPermissionContext } from './rbac.guard.test-utils';
import { OrgPermissionGuard } from './rbac.guard';
import { type Reflector } from '@nestjs/core';
import { type PrismaService } from 'src/platform/database/prisma.service';

const createMockExecutionContext = (
  orgId: string = '0197f8c0-1234-7abc-8def-0123456789ab',
  userId: string = '0197f8c0-1234-7abc-8def-012345678900',
) => {
  const context = createOrgPermissionContext(orgId, userId);
  return context as ExecutionContext;
};

let guard: OrgPermissionGuard;
let mockPrismaService: DeepMockProxy<PrismaService>;
let mockReflector: DeepMockProxy<Reflector>;

beforeEach(() => {
  mockPrismaService = mockDeep<PrismaService>();
  mockReflector = mockDeep<Reflector>();
  mockReflector.getAllAndOverride.mockReturnValue('organization:view');
  guard = new OrgPermissionGuard(mockPrismaService, mockReflector);
});

describe('OrgPermissionGuard — no permission metadata set', () => {
  it('should allow access when no permission metadata is set', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);
    const result = await guard.canActivate(createMockExecutionContext());
    expect(result).toBe(true);
    expect(mockPrismaService.membership.findUnique.mock.calls).toHaveLength(0);
  });
});

describe('OrgPermissionGuard — invalid orgId UUID format', () => {
  it('should deny access when orgId is not a valid UUID', async () => {
    const result = await guard.canActivate(
      createMockExecutionContext('invalid-uuid', 'user-123'),
    );
    expect(result).toBe(false);
  });
});

describe('OrgPermissionGuard — invalid userId UUID format', () => {
  it('should deny access when userId is not a valid UUID or is missing', async () => {
    const result = await guard.canActivate(
      createMockExecutionContext(
        '0197f8c0-1234-7abc-8def-0123456789ab',
        'invalid',
      ),
    );
    expect(result).toBe(false);
  });
});

describe('OrgPermissionGuard — user not a member of the organization', () => {
  it('should deny access when no Membership record exists for (orgId, userId)', async () => {
    mockPrismaService.membership.findUnique.mockResolvedValue(null);
    const result = await guard.canActivate(
      createMockExecutionContext(
        '0197f8c0-1234-7abc-8def-0123456789ab',
        '0197f8c0-1234-7abc-8def-012345678900',
      ),
    );
    expect(result).toBe(false);
  });
});

describe('OrgPermissionGuard — OWNER role', () => {
  const permissions: PermissionKey[] = [
    'organization:view',
    'organization:rename',
    'organization:archive',
    'project:create',
    'project:view',
    'project:rename',
    'project:archive',
    'environment:create',
    'environment:view',
    'environment:rename',
    'environment:archive',
    'flag:create',
    'flag:view',
    'flag:edit',
    'flag:delete',
    'rule:create',
    'rule:view',
    'rule:edit',
    'rule:delete',
    'sdk:create',
    'sdk:view',
    'sdk:rotate',
    'sdk:revoke',
    'publish',
  ];

  beforeEach(() => {
    mockPrismaService.membership.findUnique.mockResolvedValue({
      id: '1',
      organizationId: '0197f8c0-1234-7abc-8def-0123456789ab',
      userId: '0197f8c0-1234-7abc-8def-012345678900',
      role: 'OWNER' as MembershipRole,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('should allow all 26 permissions for OWNER role', async () => {
    for (const permission of permissions) {
      mockReflector.getAllAndOverride.mockReturnValue(permission);
      const result = await guard.canActivate(
        createMockExecutionContext(
          '0197f8c0-1234-7abc-8def-0123456789ab',
          '0197f8c0-1234-7abc-8def-012345678900',
        ),
      );
      expect(result).toBe(true);
    }
  });
});

describe('OrgPermissionGuard — ADMIN role', () => {
  const adminAllowedPermissions: PermissionKey[] = [
    'organization:view',
    'project:create',
    'project:view',
    'project:rename',
    'project:archive',
    'environment:create',
    'environment:view',
    'environment:rename',
    'environment:archive',
    'flag:create',
    'flag:view',
    'flag:edit',
    'flag:delete',
    'rule:create',
    'rule:view',
    'rule:edit',
    'rule:delete',
    'sdk:create',
    'sdk:view',
    'sdk:rotate',
    'sdk:revoke',
    'publish',
  ];

  beforeEach(() => {
    mockPrismaService.membership.findUnique.mockResolvedValue({
      id: '1',
      organizationId: '0197f8c0-1234-7abc-8def-0123456789ab',
      userId: '0197f8c0-1234-7abc-8def-012345678900',
      role: 'ADMIN' as MembershipRole,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('should allow most permissions for ADMIN role; org:view and proj:view always true', async () => {
    for (const permission of adminAllowedPermissions) {
      mockReflector.getAllAndOverride.mockReturnValue(permission);
      const result = await guard.canActivate(
        createMockExecutionContext(
          '0197f8c0-1234-7abc-8def-0123456789ab',
          '0197f8c0-1234-7abc-8def-012345678900',
        ),
      );
      expect(result).toBe(true);
    }
  });
});

describe('OrgPermissionGuard — EDITOR role', () => {
  it('should deny restricted permissions for EDITOR role', async () => {
    const editorDeniedPermissions: PermissionKey[] = [
      'organization:rename',
      'organization:archive',
      'project:create',
      'project:rename',
      'project:archive',
      'flag:create',
      'flag:delete',
      'rule:create',
      'rule:delete',
      'sdk:create',
      'sdk:rotate',
      'sdk:revoke',
      'publish',
    ];
    for (const permission of editorDeniedPermissions) {
      mockReflector.getAllAndOverride.mockReturnValue(permission);

      const result = await guard.canActivate(
        createMockExecutionContext(
          '0197f8c0-1234-7abc-8def-0123456789ab',
          '0197f8c0-1234-7abc-8def-012345678900',
        ),
      );

      expect(result).toBe(false);
    }
  });
  it('should allow view and permitted edit permissions for EDITOR role', async () => {
    const editorAllowedPermissions: PermissionKey[] = [
      'organization:view',
      'project:view',
      'environment:view',
      'flag:view',
      'rule:view',
      'sdk:view',
      'environment:create',
      'environment:rename',
      'environment:archive',
      'flag:edit',
      'rule:edit',
    ];

    for (const permission of editorAllowedPermissions) {
      mockPrismaService.membership.findUnique.mockResolvedValue({
        id: '1',
        organizationId: '0197f8c0-1234-7abc-8def-0123456789ab',
        userId: '0197f8c0-1234-7abc-8def-012345678900',
        role: 'EDITOR' as MembershipRole,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockReflector.getAllAndOverride.mockReturnValue(permission);

      const result = await guard.canActivate(
        createMockExecutionContext(
          '0197f8c0-1234-7abc-8def-0123456789ab',
          '0197f8c0-1234-7abc-8def-012345678900',
        ),
      );

      expect(result).toBe(true);
    }
  });
});

describe('OrgPermissionGuard — VIEWER role', () => {
  it('should allow only view permissions for VIEWER role; all others return false', async () => {
    const viewerViewPermissions: PermissionKey[] = [
      'organization:view',
      'project:view',
      'environment:view',
      'flag:view',
      'rule:view',
      'sdk:view',
    ];

    for (const permission of viewerViewPermissions) {
      mockPrismaService.membership.findUnique.mockResolvedValue({
        id: '1',
        organizationId: '0197f8c0-1234-7abc-8def-0123456789ab',
        userId: '0197f8c0-1234-7abc-8def-012345678900',
        role: 'VIEWER' as MembershipRole,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockReflector.getAllAndOverride.mockReturnValue(permission);

      const result = await guard.canActivate(
        createMockExecutionContext(
          '0197f8c0-1234-7abc-8def-0123456789ab',
          '0197f8c0-1234-7abc-8def-012345678900',
        ),
      );
      expect(result).toBe(true);
    }

    const viewerOtherPermissions: PermissionKey[] = [
      'organization:rename',
      'organization:archive',
      'project:create',
      'project:rename',
      'project:archive',
      'environment:create',
      'environment:rename',
      'environment:archive',
      'flag:create',
      'flag:edit',
      'flag:delete',
      'rule:create',
      'rule:edit',
      'rule:delete',
      'sdk:create',
      'sdk:rotate',
      'sdk:revoke',
      'publish',
    ];

    for (const permission of viewerOtherPermissions) {
      mockPrismaService.membership.findUnique.mockResolvedValue({
        id: '1',
        organizationId: '0197f8c0-1234-7abc-8def-0123456789ab',
        userId: '0197f8c0-1234-7abc-8def-012345678900',
        role: 'VIEWER' as MembershipRole,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockReflector.getAllAndOverride.mockReturnValue(permission);

      const result = await guard.canActivate(
        createMockExecutionContext(
          '0197f8c0-1234-7abc-8def-0123456789ab',
          '0197f8c0-1234-7abc-8def-012345678900',
        ),
      );
      expect(result).toBe(false);
    }
  });
});

describe('OrgPermissionGuard — handler-level metadata override', () => {
  it('should use handler-level @SetMetadata override over class-level', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('organization:view');
    const context = createMockExecutionContext(
      '0197f8c0-1234-7abc-8def-0123456789ab',
      '0197f8c0-1234-7abc-8def-012345678900',
    );
    await guard.canActivate(context);
    expect(mockReflector.getAllAndOverride.mock.calls).toContainEqual([
      'orgPermission',
      [context.getHandler(), context.getClass()],
    ]);
  });
});

describe('OrgPermissionGuard — membership lookup', () => {
  it('should correctly find membership using organizationId_userId composite key', async () => {
    mockPrismaService.membership.findUnique.mockResolvedValue({
      id: '1',
      organizationId: '0197f8c0-1234-7abc-8def-0123456789ab',
      userId: '0197f8c0-1234-7abc-8def-012345678900',
      role: 'ADMIN' as MembershipRole,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await guard.canActivate(
      createMockExecutionContext(
        '0197f8c0-1234-7abc-8def-0123456789ab',
        '0197f8c0-1234-7abc-8def-012345678900',
      ),
    );
    expect(result).toBe(true);
  });
});
