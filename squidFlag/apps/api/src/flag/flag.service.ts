import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../platform/database/prisma.service';
import { randomUUID } from 'node:crypto';
import { conditionSchema } from '@squidflag/contracts';
import { _CreateFlagDto, CreateFlagDto } from './dto/create-flag.dto';
import { z } from 'zod';
import { type Prisma } from 'generated/prisma/client';
import { CreateRuleDto as CreateRuleSchema } from './dto/create-rule.dto';
import { UpdateRuleDto as UpdateRuleSchema } from './dto/update-rule.dto';
import { UpdateFlagDto as UpdateFlagSchema } from './dto/update-flag.dto';

@Injectable()
export class FlagService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveOrganizationId(
    orgId: string | undefined,
    projId: string | undefined,
  ): Promise<string> {
    let resolvedOrgId: string;

    if (projId) {
      const project = await this.prisma.project.findFirst({
        where: {
          id: projId,
          archivedAt: null,
          ...(orgId ? { organizationId: orgId } : {}),
        },
        select: {
          organizationId: true,
        },
      });

      if (!project) {
        throw new NotFoundException('Project not found');
      }

      resolvedOrgId = project.organizationId;
    } else if (orgId) {
      resolvedOrgId = orgId;
    } else {
      throw new NotFoundException('Either orgId or projId must be provided');
    }
    const organization = await this.prisma.organization.findFirst({
      where: {
        id: resolvedOrgId,
        archivedAt: null,
      },
      select: {
        id: true,
      },
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }
    return organization.id;
  }

  async createFlag(
    userId: string,
    orgId: string,
    projId: string,
    envId: string,
    dto: CreateFlagDto,
  ): Promise<{
    key: string;
    name: string;
    organizationId: string;
    projectId: string;
    flagType: string;
    environmentConfigs: unknown[];
    envRevision: number;
  }> {
    const validation = _CreateFlagDto.safeParse(dto);
    if (!validation.success) {
      throw new BadRequestException('Invalid flag data');
    }
    const validatedDto = validation.data;
    const resolvedOrgId = await this.resolveOrganizationId(orgId, projId);
    return this.prisma.$transaction(async (tx) => {
      const env = await tx.environment.findFirst({
        where: {
          id: envId,
          organizationId: resolvedOrgId,
          projectId: projId,
          archivedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (!env) {
        throw new NotFoundException('Environment not found');
      }
      let flag;
      try {
        flag = await tx.featureFlag.create({
          data: {
            id: randomUUID(),
            organizationId: resolvedOrgId,
            projectId: projId,
            key: validatedDto.key,
            name: validatedDto.name,
            flagType: 'BOOLEAN',
          },
        });
      } catch (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 'P2002'
        ) {
          throw new ConflictException('Flag key already exists');
        }

        throw error;
      }

      const config = await tx.flagEnvironmentConfig.create({
        data: {
          id: randomUUID(),
          organizationId: resolvedOrgId,
          projectId: projId,
          environmentId: env.id,
          flagId: flag.id,
          enabled: validatedDto.enabled,
          defaultValue: validatedDto.defaultValue,
        },
      });
      if (validatedDto.rules?.length) {
        const rules = validatedDto.rules.map((rule) => ({
          id: randomUUID(),
          organizationId: resolvedOrgId,
          flagEnvironmentConfigId: config.id,
          priority: rule.priority,
          conditions: rule.conditions as Prisma.InputJsonValue,
          result: rule.value,
        }));

        await tx.flagRule.createMany({
          data: rules,
        });
      }

      const updatedEnv = await tx.environment.update({
        where: {
          id: env.id,
        },
        data: {
          draftRevision: {
            increment: 1,
          },
        },
        select: {
          draftRevision: true,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: resolvedOrgId,
          actorUserId: userId,
          actorLabel: userId,
          action: 'flag.created',
          targetType: 'featureFlag',
          targetId: flag.id,
          metadata: {},
        },
      });

      return {
        key: flag.key,
        name: flag.name,
        organizationId: flag.organizationId,
        projectId: flag.projectId,
        flagType: flag.flagType,
        environmentConfigs: [config],
        envRevision: updatedEnv.draftRevision,
      };
    });
  }

  async listFlags(
    orgId: string,
    projId: string,
    envId: string,
  ): Promise<{ flags: unknown[]; configs: unknown[] }> {
    const resolvedOrgId = await this.resolveOrganizationId(orgId, projId);

    const env = await this.prisma.environment.findFirst({
      where: {
        id: envId,
        organizationId: resolvedOrgId,
        projectId: projId,
        archivedAt: null,
      },
      select: {
        id: true,
      },
    });
    if (!env) {
      throw new NotFoundException('Environment not found');
    }
    const flags = await this.prisma.featureFlag.findMany({
      where: {
        organizationId: resolvedOrgId,
        projectId: projId,
        archivedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    const configs = await this.prisma.flagEnvironmentConfig.findMany({
      where: {
        organizationId: resolvedOrgId,
        projectId: projId,
        environmentId: env.id,
        flag: {
          archivedAt: null,
        },
      },
      include: {
        flag: true,
        rules: {
          orderBy: {
            priority: 'asc',
          },
        },
      },
    });
    return {
      flags,
      configs,
    };
  }

  async getFlag(
    flagKey: string,
    orgId: string,
    projId: string,
    envId: string,
  ): Promise<{ flag: unknown; config: unknown; rules: unknown[] }> {
    const resolvedOrgId = await this.resolveOrganizationId(orgId, projId);
    const env = await this.prisma.environment.findFirst({
      where: {
        id: envId,
        organizationId: resolvedOrgId,
        projectId: projId,
        archivedAt: null,
      },
      select: {
        id: true,
      },
    });
    if (!env) {
      throw new NotFoundException('Environment not found');
    }
    const flag = await this.prisma.featureFlag.findFirst({
      where: {
        key: flagKey,
        organizationId: resolvedOrgId,
        projectId: projId,
        archivedAt: null,
      },
    });
    if (!flag) {
      throw new NotFoundException('Flag not found');
    }
    const config = await this.prisma.flagEnvironmentConfig.findFirst({
      where: {
        organizationId: resolvedOrgId,
        projectId: projId,
        environmentId: env.id,
        flagId: flag.id,
      },
      include: {
        rules: {
          orderBy: {
            priority: 'asc',
          },
        },
      },
    });
    if (!config) {
      throw new NotFoundException('Flag configuration not found');
    }
    return {
      flag,
      config,
      rules: config.rules.map((rule) => ({
        id: rule.id,
        priority: rule.priority,
        conditions: rule.conditions,
        value: rule.result,
      })),
    };
  }

  async updateFlag(
    flagKey: string,
    orgId: string,
    projId: string,
    envId: string,
    dto: { name?: string; enabled?: boolean; defaultValue?: boolean },
    userId: string,
  ): Promise<{ flag: unknown; config: unknown; envRevision: number }> {
    const validation = UpdateFlagSchema.safeParse(dto);
    if (!validation.success) {
      throw new BadRequestException('Invalid flag data');
    }
    const validatedDto = validation.data;
    const resolvedOrgId = await this.resolveOrganizationId(orgId, projId);

    return this.prisma.$transaction(async (tx) => {
      const env = await tx.environment.findFirst({
        where: {
          id: envId,
          organizationId: resolvedOrgId,
          projectId: projId,
          archivedAt: null,
        },
        select: { id: true },
      });

      if (!env) {
        throw new NotFoundException('Environment not found');
      }

      const flag = await tx.featureFlag.findFirst({
        where: {
          key: flagKey,
          organizationId: resolvedOrgId,
          projectId: projId,
          archivedAt: null,
        },
        select: { id: true },
      });

      if (!flag) {
        throw new NotFoundException('Flag not found');
      }

      const config = await tx.flagEnvironmentConfig.findFirst({
        where: {
          organizationId: resolvedOrgId,
          projectId: projId,
          environmentId: env.id,
          flagId: flag.id,
        },
        select: { id: true },
      });

      if (!config) {
        throw new NotFoundException('Flag configuration not found');
      }

      const flagData =
        validatedDto.name !== undefined
          ? { name: validatedDto.name }
          : undefined;

      const configData = {
        ...(validatedDto.enabled !== undefined
          ? { enabled: validatedDto.enabled }
          : {}),
        ...(validatedDto.defaultValue !== undefined
          ? { defaultValue: validatedDto.defaultValue }
          : {}),
      };

      if (!flagData && Object.keys(configData).length === 0) {
        throw new BadRequestException('At least one field must be provided');
      }

      const updatedFlag = flagData
        ? await tx.featureFlag.update({
            where: { id: flag.id },
            data: flagData,
          })
        : await tx.featureFlag.findUniqueOrThrow({
            where: { id: flag.id },
          });

      const updatedConfig =
        Object.keys(configData).length > 0
          ? await tx.flagEnvironmentConfig.update({
              where: { id: config.id },
              data: configData,
              include: {
                rules: {
                  orderBy: { priority: 'asc' },
                },
              },
            })
          : await tx.flagEnvironmentConfig.findUniqueOrThrow({
              where: { id: config.id },
              include: {
                rules: {
                  orderBy: { priority: 'asc' },
                },
              },
            });
      const updatedEnv = await tx.environment.update({
        where: { id: env.id },
        data: {
          draftRevision: { increment: 1 },
        },
        select: {
          draftRevision: true,
        },
      });
      await tx.auditLog.create({
        data: {
          organizationId: resolvedOrgId,
          actorUserId: userId,
          actorLabel: userId,
          action: 'flag.updated',
          targetType: 'featureFlag',
          targetId: flag.id,
          metadata: {
            name: validatedDto.name ?? null,
            enabled: validatedDto.enabled ?? null,
            defaultValue: validatedDto.defaultValue ?? null,
          },
        },
      });
      return {
        flag: updatedFlag,
        config: updatedConfig,
        envRevision: updatedEnv.draftRevision,
      };
    });
  }

  async deleteFlag(
    flagKey: string,
    orgId: string,
    projId: string,
    envId: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    const resolvedOrgId = await this.resolveOrganizationId(orgId, projId);

    return this.prisma.$transaction(async (tx) => {
      const env = await tx.environment.findFirst({
        where: {
          id: envId,
          organizationId: resolvedOrgId,
          projectId: projId,
          archivedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (!env) {
        throw new NotFoundException('Environment not found');
      }

      const flag = await tx.featureFlag.findFirst({
        where: {
          key: flagKey,
          organizationId: resolvedOrgId,
          projectId: projId,
          archivedAt: null,
        },
        select: {
          id: true,
        },
      });

      if (!flag) {
        throw new NotFoundException('Flag not found');
      }

      const config = await tx.flagEnvironmentConfig.findFirst({
        where: {
          organizationId: resolvedOrgId,
          projectId: projId,
          environmentId: env.id,
          flagId: flag.id,
        },
        select: {
          id: true,
        },
      });

      if (!config) {
        throw new NotFoundException('Flag configuration not found');
      }

      await tx.featureFlag.update({
        where: {
          id: flag.id,
        },
        data: {
          archivedAt: new Date(),
        },
      });
      await tx.environment.update({
        where: {
          id: env.id,
        },
        data: {
          draftRevision: {
            increment: 1,
          },
        },
      });
      await tx.auditLog.create({
        data: {
          organizationId: resolvedOrgId,
          actorUserId: userId,
          actorLabel: userId,
          action: 'flag.archived',
          targetType: 'featureFlag',
          targetId: flag.id,
          metadata: {},
        },
      });
      return {
        success: true,
      };
    });
  }

  async addRule(
    flagKey: string,
    orgId: string,
    projId: string,
    envId: string,
    dto: {
      priority: number;
      conditions: { attribute: string; operator: string; value: unknown }[];
      value: boolean;
    },
    userId: string,
  ): Promise<{
    id: string;
    priority: number;
    conditions: Prisma.JsonValue;
    result: boolean;
  }> {
    const validation = CreateRuleSchema.safeParse(dto);
    if (!validation.success) {
      throw new BadRequestException('Invalid rule data');
    }
    const validatedDto = validation.data;
    const resolvedOrgId = await this.resolveOrganizationId(orgId, projId);
    return this.prisma.$transaction(async (tx) => {
      const env = await tx.environment.findFirst({
        where: {
          id: envId,
          organizationId: resolvedOrgId,
          projectId: projId,
          archivedAt: null,
        },
        select: { id: true },
      });

      if (!env) {
        throw new NotFoundException('Environment not found');
      }

      const flag = await tx.featureFlag.findFirst({
        where: {
          key: flagKey,
          organizationId: resolvedOrgId,
          projectId: projId,
          archivedAt: null,
        },
        select: { id: true },
      });

      if (!flag) {
        throw new NotFoundException('Flag not found');
      }

      const config = await tx.flagEnvironmentConfig.findFirst({
        where: {
          organizationId: resolvedOrgId,
          projectId: projId,
          environmentId: env.id,
          flagId: flag.id,
        },
        select: { id: true },
      });

      if (!config) {
        throw new NotFoundException('Flag configuration not found');
      }
      const conditionsValidation = z
        .array(conditionSchema)
        .safeParse(validatedDto.conditions);

      if (!conditionsValidation.success) {
        throw new BadRequestException('Invalid rule conditions');
      }

      const rule = await tx.flagRule.create({
        data: {
          id: randomUUID(),
          organizationId: resolvedOrgId,
          flagEnvironmentConfigId: config.id,
          priority: validatedDto.priority,
          conditions: conditionsValidation.data,
          result: validatedDto.value,
        },
      });

      await tx.environment.update({
        where: { id: env.id },
        data: {
          draftRevision: { increment: 1 },
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: resolvedOrgId,
          actorUserId: userId,
          actorLabel: userId,
          action: 'rule.created',
          targetType: 'flagRule',
          targetId: rule.id,
          metadata: {},
        },
      });
      return {
        id: rule.id,
        priority: rule.priority,
        conditions: rule.conditions,
        result: rule.result,
      };
    });
  }

  async updateRule(
    flagKey: string,
    ruleId: string,
    orgId: string,
    projId: string,
    envId: string,
    dto: {
      priority?: number;
      conditions?: { attribute: string; operator: string; value: unknown }[];
      value?: boolean;
    },
    userId: string,
  ): Promise<{
    priority: number;
    envRevision: number;
    conditions: Prisma.JsonValue;
    result: boolean;
  }> {
    const validation = UpdateRuleSchema.safeParse(dto);
    if (!validation.success) {
      throw new BadRequestException('Invalid rule data');
    }
    const validatedDto = validation.data;
    const resolvedOrgId = await this.resolveOrganizationId(orgId, projId);
    return this.prisma.$transaction(async (tx) => {
      const env = await tx.environment.findFirst({
        where: {
          id: envId,
          organizationId: resolvedOrgId,
          projectId: projId,
          archivedAt: null,
        },
        select: { id: true },
      });

      if (!env) {
        throw new NotFoundException('Environment not found');
      }

      const flag = await tx.featureFlag.findFirst({
        where: {
          key: flagKey,
          organizationId: resolvedOrgId,
          projectId: projId,
          archivedAt: null,
        },
        select: { id: true },
      });

      if (!flag) {
        throw new NotFoundException('Flag not found');
      }

      const rule = await tx.flagRule.findFirst({
        where: {
          id: ruleId,
          organizationId: resolvedOrgId,
          flagEnvironmentConfig: {
            is: {
              organizationId: resolvedOrgId,
              projectId: projId,
              environmentId: env.id,
              flagId: flag.id,
            },
          },
        },
      });

      if (!rule) {
        throw new NotFoundException('Rule not found');
      }

      const updateData: Prisma.FlagRuleUpdateInput = {};

      if (dto.priority !== undefined) {
        updateData.priority = dto.priority;
      }

      if (dto.conditions !== undefined) {
        const conditionsValidation = z
          .array(conditionSchema)
          .safeParse(validatedDto.conditions);
        if (!conditionsValidation.success) {
          throw new BadRequestException('Invalid rule conditions');
        }
        updateData.conditions = conditionsValidation.data;
      }

      if (dto.value !== undefined) {
        updateData.result = dto.value;
      }

      if (Object.keys(updateData).length === 0) {
        throw new BadRequestException('At least one field must be provided');
      }

      const updatedRule = await tx.flagRule.update({
        where: { id: rule.id },
        data: updateData,
      });

      const updatedEnv = await tx.environment.update({
        where: { id: env.id },
        data: {
          draftRevision: { increment: 1 },
        },
        select: {
          draftRevision: true,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: resolvedOrgId,
          actorUserId: userId,
          actorLabel: userId,
          action: 'rule.updated',
          targetType: 'flagRule',
          targetId: rule.id,
          metadata: {},
        },
      });
      return {
        priority: updatedRule.priority,
        conditions: updatedRule.conditions,
        result: updatedRule.result,
        envRevision: updatedEnv.draftRevision,
      };
    });
  }

  async removeRule(
    flagKey: string,
    ruleId: string,
    orgId: string,
    projId: string,
    envId: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    const resolvedOrgId = await this.resolveOrganizationId(orgId, projId);

    return this.prisma.$transaction(async (tx) => {
      const env = await tx.environment.findFirst({
        where: {
          id: envId,
          organizationId: resolvedOrgId,
          projectId: projId,
          archivedAt: null,
        },
        select: { id: true },
      });

      if (!env) {
        throw new NotFoundException('Environment not found');
      }

      const flag = await tx.featureFlag.findFirst({
        where: {
          key: flagKey,
          organizationId: resolvedOrgId,
          projectId: projId,
          archivedAt: null,
        },
        select: { id: true },
      });

      if (!flag) {
        throw new NotFoundException('Flag not found');
      }

      const rule = await tx.flagRule.findFirst({
        where: {
          id: ruleId,
          organizationId: resolvedOrgId,
          flagEnvironmentConfig: {
            is: {
              organizationId: resolvedOrgId,
              projectId: projId,
              environmentId: env.id,
              flagId: flag.id,
            },
          },
        },
        select: {
          id: true,
        },
      });

      if (!rule) {
        throw new NotFoundException('Rule not found');
      }

      await tx.flagRule.delete({
        where: { id: rule.id },
      });

      await tx.environment.update({
        where: { id: env.id },
        data: {
          draftRevision: { increment: 1 },
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: resolvedOrgId,
          actorUserId: userId,
          actorLabel: userId,
          action: 'rule.deleted',
          targetType: 'flagRule',
          targetId: rule.id,
          metadata: {},
        },
      });
      return {
        success: true,
      };
    });
  }
}
