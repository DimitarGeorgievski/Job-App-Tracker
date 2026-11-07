import { MembershipRole } from 'generated/prisma/client';
import type { PrismaService } from '../platform/database/prisma.service';
import type { CreateOrganizationDto } from './dto/org.dto';

export interface OrgCreationResponse {
  organization: {
    id: string;
    name: string;
    slug: string;
    createdAt: Date;
  };
  membership: {
    id: string;
    role: MembershipRole;
    createdAt: Date;
  };
}

export class OrgService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrganization(
    dto: CreateOrganizationDto,
    actorUserId: string,
  ): Promise<OrgCreationResponse> {
    return this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: dto.name,
          slug: dto.slug,
        },
      });

      const membership = await tx.membership.create({
        data: {
          organizationId: organization.id,
          userId: actorUserId,
          role: MembershipRole.OWNER,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: organization.id,
          actorUserId,
          actorLabel: actorUserId,
          action: 'organization.created',
          targetType: 'organization',
          targetId: organization.id,
          metadata: {},
        },
      });

      return { organization, membership };
    });
  }
}
