import { PrismaService } from '../platform/database/prisma.service';
import type { CreateProjectDto, RenameProjectDto } from './dto/project.dto';
import type { ProjectResponse } from './types/project.type';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class ProjectService {
  constructor(private readonly prisma: PrismaService) {}

  async createProject(
    dto: CreateProjectDto,
    organizationId: string,
    actorUserId: string,
  ): Promise<ProjectResponse> {
    return this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.findUnique({
        where: { id: organizationId },
      });
      if (!organization) {
        throw new NotFoundException('Organization not found');
      }
      if (organization.archivedAt !== null) {
        throw new BadRequestException(
          'Cannot create project in an archived organization',
        );
      }
      const project = await tx.project.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          organizationId,
        },
      });
      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId,
          actorLabel: actorUserId,
          action: 'project.created',
          targetType: 'project',
          targetId: project.id,
          metadata: {},
        },
      });

      return project;
    });
  }

  async getProjects(organizationId: string): Promise<ProjectResponse[]> {
    return this.prisma.project.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProject(
    organizationId: string,
    projectId: string,
  ): Promise<ProjectResponse> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
      },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  async renameProject(
    organizationId: string,
    projectId: string,
    dto: RenameProjectDto,
    actorUserId: string,
  ): Promise<ProjectResponse> {
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
        throw new BadRequestException(
          'Cannot rename a project in an archived organization',
        );
      }

      const project = await tx.project.findFirst({
        where: {
          id: projectId,
          organizationId,
        },
      });

      if (!project) {
        throw new NotFoundException('Project not found');
      }

      if (dto.slug && dto.slug !== project.slug) {
        const existing = await tx.project.findFirst({
          where: {
            slug: dto.slug,
            organizationId,
          },
        });
        if (existing && existing.id !== projectId) {
          throw new BadRequestException(
            'Slug must be unique among projects in the same organization',
          );
        }
      }

      const updated = await tx.project.update({
        where: { id: projectId },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.slug && { slug: dto.slug }),
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId,
          actorLabel: actorUserId,
          action: 'project.renamed',
          targetType: 'project',
          targetId: updated.id,
          metadata: {
            previousName: project.name,
            previousSlug: project.slug,
            ...(dto.name && { newName: dto.name }),
            ...(dto.slug && { newSlug: dto.slug }),
          },
        },
      });

      return updated;
    });
  }

  async archiveProject(
    organizationId: string,
    projectId: string,
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
        throw new BadRequestException(
          'Cannot archive a project in an archived organization',
        );
      }

      const project = await tx.project.findFirst({
        where: {
          id: projectId,
          organizationId,
        },
      });

      if (!project) {
        throw new NotFoundException('Project not found');
      }

      const updated = await tx.project.update({
        where: { id: projectId },
        data: {
          archivedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId,
          actorLabel: actorUserId,
          action: 'project.archived',
          targetType: 'project',
          targetId: updated.id,
          metadata: {},
        },
      });

      return { success: true };
    });
  }
}
