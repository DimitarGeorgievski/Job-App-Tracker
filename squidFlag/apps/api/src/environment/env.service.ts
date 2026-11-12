import { PrismaService } from '../platform/database/prisma.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  Injectable,
} from '@nestjs/common';
import {
  CreateEnvironmentDto,
  EnvironmentResponse,
  RenameEnvironmentDto,
} from './dto/env.dto';
import { Prisma } from 'generated/prisma/client';

@Injectable()
export class EnvService {
  constructor(private readonly prisma: PrismaService) {}

  async createEnvironment(
    organizationId: string,
    projectId: string,
    dto: CreateEnvironmentDto,
    actorUserId: string,
  ): Promise<EnvironmentResponse> {
    return this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.findUnique({
        where: { id: organizationId },
      });
      if (!organization) {
        throw new NotFoundException('Organization not found');
      }
      if (organization.archivedAt !== null) {
        throw new BadRequestException(
          'Cannot create environment in an archived organization',
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
      if (project.archivedAt !== null) {
        throw new BadRequestException(
          'Cannot create environment in an archived project',
        );
      }

      try {
        const environment = await tx.environment.create({
          data: {
            key: dto.key,
            name: dto.name,
            organizationId,
            projectId,
          },
        });

        await tx.auditLog.create({
          data: {
            organizationId,
            actorUserId,
            actorLabel: actorUserId,
            action: 'environment.created',
            targetType: 'environment',
            targetId: environment.id,
            metadata: {},
          },
        });

        return this.mapToEnvironmentResponse(environment);
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          const target = error.meta?.target;
          if (
            Array.isArray(target) &&
            target.includes('projectId') &&
            target.includes('key')
          ) {
            throw new ConflictException(
              'Environment with this key already exists in the project',
            );
          }
        }

        throw error;
      }
    });
  }

  async listEnvironments(
    organizationId: string,
    projectId: string,
  ): Promise<EnvironmentResponse[]> {
    const environments = await this.prisma.environment.findMany({
      where: {
        organizationId,
        projectId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return environments.map((env) => this.mapToEnvironmentResponse(env));
  }

  async getEnvironment(
    organizationId: string,
    projectId: string,
    environmentId: string,
  ): Promise<EnvironmentResponse> {
    const environment = await this.prisma.environment.findFirst({
      where: {
        id: environmentId,
        organizationId,
        projectId,
      },
    });
    if (!environment) {
      throw new NotFoundException('Environment not found');
    }
    return this.mapToEnvironmentResponse(environment);
  }

  async renameEnvironment(
    organizationId: string,
    projectId: string,
    environmentId: string,
    dto: RenameEnvironmentDto,
    actorUserId: string,
  ): Promise<EnvironmentResponse> {
    return this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.findUnique({
        where: { id: organizationId },
      });
      if (!organization) {
        throw new NotFoundException('Organization not found');
      }
      if (organization.archivedAt !== null) {
        throw new BadRequestException(
          'Cannot rename environment in an archived organization',
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
      if (project.archivedAt !== null) {
        throw new BadRequestException(
          'Cannot rename environment in an archived project',
        );
      }

      const environment = await tx.environment.findFirst({
        where: {
          id: environmentId,
          organizationId,
          projectId,
        },
      });
      if (!environment) {
        throw new NotFoundException('Environment not found');
      }
      if (environment.archivedAt !== null) {
        throw new BadRequestException('Cannot rename an archived environment');
      }

      const updated = await tx.environment.update({
        where: { id: environmentId },
        data: {
          name: dto.name,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId,
          actorLabel: actorUserId,
          action: 'environment.renamed',
          targetType: 'environment',
          targetId: updated.id,
          metadata: {
            previousName: environment.name,
            newName: dto.name,
          },
        },
      });

      return this.mapToEnvironmentResponse(updated);
    });
  }

  async archiveEnvironment(
    organizationId: string,
    projectId: string,
    environmentId: string,
    actorUserId: string,
  ): Promise<EnvironmentResponse> {
    return this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.findUnique({
        where: { id: organizationId },
      });
      if (!organization) {
        throw new NotFoundException('Organization not found');
      }
      if (organization.archivedAt !== null) {
        throw new BadRequestException(
          'Cannot archive environment in an archived organization',
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
      if (project.archivedAt !== null) {
        throw new BadRequestException(
          'Cannot archive environment in an archived project',
        );
      }

      const environment = await tx.environment.findFirst({
        where: {
          id: environmentId,
          organizationId,
          projectId,
        },
      });
      if (!environment) {
        throw new NotFoundException('Environment not found');
      }
      if (environment.archivedAt !== null) {
        throw new BadRequestException('Environment is already archived');
      }

      const updated = await tx.environment.update({
        where: { id: environmentId },
        data: {
          archivedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId,
          actorLabel: actorUserId,
          action: 'environment.archived',
          targetType: 'environment',
          targetId: updated.id,
          metadata: {},
        },
      });

      return this.mapToEnvironmentResponse(updated);
    });
  }

  private mapToEnvironmentResponse(environment: {
    id: string;
    key: string;
    name: string;
    organizationId: string;
    projectId: string;
    createdAt: Date;
    updatedAt: Date;
    archivedAt: Date | null;
  }): EnvironmentResponse {
    return {
      id: environment.id,
      key: environment.key,
      name: environment.name,
      organizationId: environment.organizationId,
      projectId: environment.projectId,
      createdAt: environment.createdAt,
      updatedAt: environment.updatedAt,
      archivedAt: environment.archivedAt,
    };
  }
}
