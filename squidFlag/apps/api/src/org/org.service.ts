import { MembershipRole } from 'generated/prisma/client';
import type { PrismaService } from '../platform/database/prisma.service';
import type {
  CreateOrganizationDto,
  RenameOrganizationDto,
} from './dto/org.dto';
import type { OrgCreationResponse } from './types/org.type';
import { BadRequestException, NotFoundException } from '@nestjs/common';

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

  async renameOrganization(
    organizationId: string,
    dto: RenameOrganizationDto,
    actorUserId: string,
  ): Promise<{
    organization: {
      id: string;
      name: string;
      slug: string;
      createdAt: Date;
      archivedAt?: Date | null;
    };
  }> {
    if (!dto.name && !dto.slug) {
      throw new BadRequestException(
        'At least one of name or slug must be provided',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        throw new NotFoundException('Organization not found');
      }
      if (organization.archivedAt !== null) {
        throw new BadRequestException('Cannot rename an archived organization');
      }
      if (dto.slug && dto.slug !== organization.slug) {
        const existing = await tx.organization.findFirst({
          where: { slug: dto.slug },
        });
        if (existing && existing.id !== organizationId) {
          throw new BadRequestException(
            'Slug must be unique among all organizations',
          );
        }
      }

      const updated = await tx.organization.update({
        where: { id: organizationId },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.slug && { slug: dto.slug }),
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: updated.id,
          actorUserId,
          actorLabel: actorUserId,
          action: 'organization.renamed',
          targetType: 'organization',
          targetId: updated.id,
          metadata: {
            previousName: organization.name,
            previousSlug: organization.slug,
            ...(dto.name && { newName: dto.name }),
            ...(dto.slug && { newSlug: dto.slug }),
          },
        },
      });

      return {
        organization: updated,
      };
    });
  }

  async archiveOrganization(
    organizationId: string,
    actorUserId: string,
  ): Promise<{ success: boolean }> {
    return this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.findUnique({
        where: { id: organizationId },
      });
      if (!organization) {
        throw new NotFoundException('Organization not found');
      }
      if (organization.archivedAt !== null) {
        throw new BadRequestException('Organization is already archived');
      }

      const updated = await tx.organization.update({
        where: { id: organizationId },
        data: {
          archivedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: updated.id,
          actorUserId,
          actorLabel: actorUserId,
          action: 'organization.archived',
          targetType: 'organization',
          targetId: updated.id,
          metadata: {},
        },
      });

      return { success: true };
    });
  }
}
