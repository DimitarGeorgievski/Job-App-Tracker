import { describe, expect, it, beforeEach } from '@jest/globals';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import { RbacService } from './rbac.service';
import { type PrismaService } from 'src/platform/database/prisma.service';
import { MembershipRole } from 'generated/prisma/client';

let service: RbacService;
let mockPrismaService: DeepMockProxy<PrismaService>;

beforeEach(() => {
  mockPrismaService = mockDeep<PrismaService>();
  service = new RbacService(mockPrismaService);
});

describe('RbacService — hasPermission', () => {
  it('should check role against permission matrix', () => {
    expect(
      service.hasPermission(MembershipRole.OWNER, 'organization:view'),
    ).toBe(true);
    expect(
      service.hasPermission(MembershipRole.OWNER, 'organization:rename'),
    ).toBe(true);
    expect(service.hasPermission(MembershipRole.OWNER, 'publish')).toBe(true);
    expect(
      service.hasPermission(MembershipRole.ADMIN, 'organization:view'),
    ).toBe(true);
    expect(service.hasPermission(MembershipRole.ADMIN, 'project:create')).toBe(
      true,
    );
    expect(
      service.hasPermission(MembershipRole.ADMIN, 'organization:rename'),
    ).toBe(false);
    expect(
      service.hasPermission(MembershipRole.EDITOR, 'organization:view'),
    ).toBe(true);
    expect(service.hasPermission(MembershipRole.EDITOR, 'flag:edit')).toBe(
      true,
    );
    expect(service.hasPermission(MembershipRole.EDITOR, 'flag:create')).toBe(
      false,
    );
    expect(
      service.hasPermission(MembershipRole.VIEWER, 'organization:view'),
    ).toBe(true);
    expect(
      service.hasPermission(MembershipRole.VIEWER, 'organization:rename'),
    ).toBe(false);
    expect(service.hasPermission(MembershipRole.VIEWER, 'project:create')).toBe(
      false,
    );
  });
});

describe('RbacService — userHasPermission', () => {
  beforeEach(() => {
    mockPrismaService.membership.findUnique.mockResolvedValue({
      id: '1',
      organizationId: '0197f8c0-1234-7abc-8def-0123456789ab',
      userId: '0197f8c0-1234-7abc-8def-012345678900',
      role: MembershipRole.OWNER,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('should return true when user has membership and role permits action', async () => {
    const result = await service.userHasPermission(
      '0197f8c0-1234-7abc-8def-012345678900',
      '0197f8c0-1234-7abc-8def-0123456789ab',
      'organization:view',
    );
    expect(result).toBe(true);
  });

  it('should return false when no membership exists', async () => {
    mockPrismaService.membership.findUnique.mockResolvedValue(null);
    const result = await service.userHasPermission(
      '0197f8c0-1234-7abc-8def-012345678900',
      '0197f8c0-1234-7abc-8def-0123456789ab',
      'organization:view',
    );
    expect(result).toBe(false);
  });

  it('should return false for VIEWER trying organization:rename', async () => {
    mockPrismaService.membership.findUnique.mockResolvedValue({
      id: '1',
      organizationId: '0197f8c0-1234-7abc-8def-0123456789ab',
      userId: '0197f8c0-1234-7abc-8def-012345678900',
      role: MembershipRole.VIEWER,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const result = await service.userHasPermission(
      '0197f8c0-1234-7abc-8def-012345678900',
      '0197f8c0-1234-7abc-8def-0123456789ab',
      'organization:rename',
    );
    expect(result).toBe(false);
  });

  it('should return false for EDITOR trying organization:archive', async () => {
    mockPrismaService.membership.findUnique.mockResolvedValue({
      id: '1',
      organizationId: '0197f8c0-1234-7abc-8def-0123456789ab',
      userId: '0197f8c0-1234-7abc-8def-012345678900',
      role: MembershipRole.EDITOR,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const result = await service.userHasPermission(
      '0197f8c0-1234-7abc-8def-012345678900',
      '0197f8c0-1234-7abc-8def-0123456789ab',
      'organization:archive',
    );
    expect(result).toBe(false);
  });
});

describe('RbacService — getAllowedRoles', () => {
  beforeEach(() => {
    mockPrismaService.membership.findUnique.mockResolvedValue({
      id: '1',
      organizationId: '0197f8c0-1234-7abc-8def-0123456789ab',
      userId: '0197f8c0-1234-7abc-8def-012345678900',
      role: MembershipRole.OWNER,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('should return all roles that can perform an action', () => {
    const ownerAllowed = service.getAllowedRoles('organization:view');
    expect(ownerAllowed).toContain(MembershipRole.OWNER);
    expect(ownerAllowed).toContain(MembershipRole.ADMIN);
    expect(ownerAllowed).toContain(MembershipRole.EDITOR);
    expect(ownerAllowed).toContain(MembershipRole.VIEWER);

    const viewerAllowed = service.getAllowedRoles('organization:rename');
    expect(viewerAllowed).toContain(MembershipRole.OWNER);
    expect(viewerAllowed).not.toContain(MembershipRole.ADMIN);
    expect(viewerAllowed).not.toContain(MembershipRole.EDITOR);
    expect(viewerAllowed).not.toContain(MembershipRole.VIEWER);
  });
});
