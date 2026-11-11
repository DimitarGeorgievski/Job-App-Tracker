import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/database/prisma.service';
import { MembershipRole } from 'generated/prisma/client';
import { PERMISSION_MATRIX, hasPermission } from './permissions';

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}
  hasPermission(
    role: MembershipRole,
    action: keyof typeof PERMISSION_MATRIX,
  ): boolean {
    return hasPermission(role, action);
  }

  async userHasPermission(
    userId: string,
    organizationId: string,
    action: keyof typeof PERMISSION_MATRIX,
  ): Promise<boolean> {
    const membership = await this.prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });
    if (!membership) return false;
    return hasPermission(membership.role, action);
  }

  getAllowedRoles(action: keyof typeof PERMISSION_MATRIX): MembershipRole[] {
    const allowed: MembershipRole[] = [];
    for (const role of [
      MembershipRole.OWNER,
      MembershipRole.ADMIN,
      MembershipRole.EDITOR,
      MembershipRole.VIEWER,
    ]) {
      if (hasPermission(role, action)) {
        allowed.push(role);
      }
    }
    return allowed;
  }
}
