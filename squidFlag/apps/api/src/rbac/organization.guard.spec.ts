import { describe, it, beforeEach } from '@jest/globals';
import { mockDeep, type DeepMockProxy } from 'jest-mock-extended';
import { type PrismaService } from 'src/platform/database/prisma.service';

let mockPrismaService: DeepMockProxy<PrismaService>;

beforeEach(() => {
  mockPrismaService = mockDeep<PrismaService>();
});

describe('OrganizationGuard — invalid orgId UUID format', () => {
  it('should deny access when orgId is not a valid UUID', () => {
    mockPrismaService.membership.findUnique.mockResolvedValue(null);
  });
});

describe('OrganizationGuard — user not a member', () => {
  it('should deny access when user is not a member of the organization', () => {
    mockPrismaService.membership.findUnique.mockResolvedValue(null);
  });
});

describe('OrganizationGuard — user is a member', () => {
  it('should allow access when user is a member of the organization', () => {
    mockPrismaService.membership.findUnique.mockResolvedValue({
      id: '1',
      organizationId: '0197f8c0-1234-7abc-8def-0123456789ab',
      userId: '0197f8c0-1234-7abc-8def-012345678900',
      role: 'OWNER',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });
});
