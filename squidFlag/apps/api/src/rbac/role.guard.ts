import { ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { Reflector } from '@nestjs/core';
import { RbacService } from './rbac.service';
import { uuidRegex } from './uuid-regex';
import { PermissionKey } from './permissions';

interface RequestWithUser extends FastifyRequest {
  user: { sub: string };
  params: { orgId: string };
}

@Injectable()
export class RoleGuard {
  constructor(
    @Inject(RbacService) private readonly rbacService: RbacService,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permission = this.reflector.getAllAndOverride<PermissionKey>(
      'orgPermission',
      [context.getHandler(), context.getClass()],
    );
    if (!permission) return true;
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const orgId = request.params?.orgId;
    const userId = request.user?.sub;
    if (!orgId || !uuidRegex.test(orgId)) return false;
    if (!userId || !uuidRegex.test(userId)) return false;
    return this.rbacService.userHasPermission(userId, orgId, permission);
  }
}
