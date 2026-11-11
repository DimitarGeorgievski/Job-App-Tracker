import { describe, expect, it, beforeEach } from '@jest/globals';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import { type ExecutionContext } from '@nestjs/common';
import { type RbacService } from './rbac.service';
import { type Reflector } from '@nestjs/core';
import { type PermissionKey } from './permissions';
import { RoleGuard } from './role.guard';

let guard: RoleGuard;
let mockRbacService: DeepMockProxy<RbacService>;
let mockReflector: DeepMockProxy<Reflector>;

const createMockExecutionContext = (
  orgId: string = '0197f8c0-1234-7abc-8def-0123456789ab',
  userId: string = '0197f8c0-1234-7abc-8def-012345678900',
) => {
  const context = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({
        params: { orgId },
        user: { sub: userId },
      }),
    }),
  };
  return context as ExecutionContext;
};

beforeEach(() => {
  mockRbacService = mockDeep<RbacService>();
  mockReflector = mockDeep<Reflector>();
  mockReflector.getAllAndOverride.mockReturnValue('organization:view');
  guard = new RoleGuard(mockRbacService, mockReflector);
});

describe('RoleGuard — no permission metadata set', () => {
  it('should allow access when no permission metadata is set', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined);
    const result = await guard.canActivate(createMockExecutionContext());
    expect(result).toBe(true);
  });
});

describe('RoleGuard — invalid orgId UUID format', () => {
  it('should deny access when orgId is not a valid UUID', async () => {
    const result = await guard.canActivate(
      createMockExecutionContext('invalid-uuid', 'user-123'),
    );
    expect(result).toBe(false);
  });
});

describe('RoleGuard — invalid userId UUID format', () => {
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

describe('RoleGuard — user not a member of the organization', () => {
  it('should deny access when no membership exists', async () => {
    mockRbacService.userHasPermission.mockResolvedValue(false);
    const result = await guard.canActivate(
      createMockExecutionContext(
        '0197f8c0-1234-7abc-8def-0123456789ab',
        '0197f8c0-1234-7abc-8def-012345678900',
      ),
    );
    expect(result).toBe(false);
  });
});

describe('RoleGuard — OWNER role', () => {
  beforeEach(() => {
    mockRbacService.userHasPermission.mockResolvedValue(true);
  });

  const ownerPermissions: PermissionKey[] = [
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

  it('should allow all 25 permissions for OWNER role', async () => {
    for (const permission of ownerPermissions) {
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

describe('RoleGuard — ADMIN role', () => {
  beforeEach(() => {
    mockRbacService.userHasPermission.mockImplementation(
      (userId: string, orgId: string, action: PermissionKey) => {
        if (
          action === 'organization:rename' ||
          action === 'organization:archive'
        ) {
          return Promise.resolve(false);
        }
        return Promise.resolve(true);
      },
    );
  });

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

  it('should allow most permissions for ADMIN role', async () => {
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

  it('should deny organization:rename for ADMIN', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('organization:rename');
    const result = await guard.canActivate(
      createMockExecutionContext(
        '0197f8c0-1234-7abc-8def-0123456789ab',
        '0197f8c0-1234-7abc-8def-012345678900',
      ),
    );
    expect(result).toBe(false);
  });

  it('should deny organization:archive for ADMIN', async () => {
    mockReflector.getAllAndOverride.mockReturnValue('organization:archive');
    const result = await guard.canActivate(
      createMockExecutionContext(
        '0197f8c0-1234-7abc-8def-0123456789ab',
        '0197f8c0-1234-7abc-8def-012345678900',
      ),
    );
    expect(result).toBe(false);
  });
});

describe('RoleGuard — EDITOR role', () => {
  beforeEach(() => {
    mockRbacService.userHasPermission.mockImplementation(
      (_userId: string, _orgId: string, action: PermissionKey) => {
        const editorAllowed: PermissionKey[] = [
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
        return Promise.resolve(editorAllowed.includes(action));
      },
    );
  });

  it('should deny restricted permissions for EDITOR role', async () => {
    const editorDeniedPermissions: string[] = [
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
    const editorAllowedPermissions: string[] = [
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

describe('RoleGuard — VIEWER role', () => {
  beforeEach(() => {
    mockRbacService.userHasPermission.mockImplementation(
      (_userId: string, _orgId: string, action: PermissionKey) => {
        const viewerAllowed: PermissionKey[] = [
          'organization:view',
          'project:view',
          'environment:view',
          'flag:view',
          'rule:view',
          'sdk:view',
        ];
        return Promise.resolve(viewerAllowed.includes(action));
      },
    );
  });

  it('should allow only view permissions for VIEWER role', async () => {
    const viewerViewPermissions: string[] = [
      'organization:view',
      'project:view',
      'environment:view',
      'flag:view',
      'rule:view',
      'sdk:view',
    ];

    for (const permission of viewerViewPermissions) {
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

  it('should deny all non-view permissions for VIEWER role', async () => {
    const viewerOtherPermissions: string[] = [
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

describe('RoleGuard — handler-level metadata override', () => {
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
