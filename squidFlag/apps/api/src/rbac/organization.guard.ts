import {
  ExecutionContext,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../platform/database/prisma.service';
import { FastifyRequest } from 'fastify';
import { uuidRegex } from './uuid-regex';

interface RequestWithUser extends FastifyRequest<{
  Params: { orgId?: string };
  Querystring: { orgId?: string };
}> {
  user: { sub: string };
}

@Injectable()
export class OrganizationGuard {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const orgId = request.query.orgId ?? request.params.orgId;
    if (!orgId || !uuidRegex.test(orgId)) return false;
    const userId = request.user?.sub;
    if (!userId || !uuidRegex.test(userId)) return false;
    const membership = await this.prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });
    if (!membership) {
      throw new NotFoundException('Organization not found');
    }
    return true;
  }
}
