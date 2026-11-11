import { ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/database/prisma.service';
import { hasPermission, PermissionKey } from '../rbac/permissions';
import { uuidRegex } from './uuid-regex';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { ORG_PERMISSION_KEY } from './org-permission.decorator';

interface OrgPermissionRequest extends FastifyRequest {
  params: {
    orgId: string;
  };
  user: {
    sub: string;
  };
}

@Injectable()
export class OrgPermissionGuard {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission = this.reflector.getAllAndOverride<PermissionKey>(
      ORG_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!permission) return true;
    const request = context.switchToHttp().getRequest<OrgPermissionRequest>();
    const orgId = request.params.orgId;
    if (!orgId || !uuidRegex.test(orgId)) return false;
    const userId = request.user.sub;
    if (!userId || !uuidRegex.test(userId)) return false;
    const membership = await this.prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });

    if (!membership) return false;
    return hasPermission(membership.role, permission);
  }
}
