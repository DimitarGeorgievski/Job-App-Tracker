import {
  Inject,
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../platform/database/prisma.service';
import { R2Service } from '../platform/storage/r2/r2.service';
import {
  EnvironmentSnapshotPayloadDto,
  EnvironmentSnapshotPayload,
} from './dto/snapshot-payload.dto';
import { randomUUID, createHash } from 'node:crypto';
import { conditionSchema } from '@squidflag/contracts';
import { _CreateFlagDto, CreateFlagDto } from './dto/create-flag.dto';
import { z } from 'zod';
import { type Prisma } from 'generated/prisma/client';
import { CreateRuleDto as CreateRuleSchema } from './dto/create-rule.dto';
import { UpdateRuleDto as UpdateRuleSchema } from './dto/update-rule.dto';
import { UpdateFlagDto as UpdateFlagSchema } from './dto/update-flag.dto';
import { PinoLogger } from 'nestjs-pino';
import { uuidRegex } from 'src/rbac/uuid-regex';

@Injectable()
export class FlagService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(R2Service) private readonly r2: R2Service,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(FlagService.name);
  }

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

  async saveDraft(
    flagKey: string,
    orgId: string,
    projId: string,
    envId: string,
    userId: string,
  ): Promise<{ success: boolean }> {
    const resolvedOrgId = await this.resolveOrganizationId(orgId, projId);

    if (!uuidRegex.test(envId)) {
      throw new NotFoundException('Environment not found');
    }

    const flag = await this.prisma.featureFlag.findFirst({
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

    return this.prisma.$transaction(async (tx) => {
      const env = await tx.environment.findFirst({
        where: {
          id: envId,
          organizationId: resolvedOrgId,
          projectId: projId,
          archivedAt: null,
        },
        select: { id: true, draftRevision: true },
      });

      if (!env) {
        throw new NotFoundException('Environment not found');
      }

      await tx.environment.update({
        where: { id: env.id },
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
          action: 'draft.saved',
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

      const rule = await tx.flagRule.findFirst({
        where: {
          id: ruleId,
          organizationId: resolvedOrgId,
          flagEnvironmentConfigId: config.id,
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

  async discardDraft(
    flagKey: string,
    orgId: string,
    projId: string,
    envId: string,
  ): Promise<{ success: boolean }> {
    const resolvedOrgId = await this.resolveOrganizationId(orgId, projId);

    if (!uuidRegex.test(envId)) {
      throw new NotFoundException('Environment not found');
    }
    const flag = await this.prisma.featureFlag.findFirst({
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

    return this.prisma.$transaction(async (tx) => {
      const env = await tx.environment.findFirst({
        where: {
          id: envId,
          organizationId: resolvedOrgId,
          projectId: projId,
          archivedAt: null,
        },
        select: { id: true, draftRevision: true },
      });

      if (!env) {
        throw new NotFoundException('Environment not found');
      }

      const flags = await tx.featureFlag.findMany({
        where: {
          organizationId: resolvedOrgId,
          projectId: projId,
          archivedAt: null,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      const publishedSnapshot = await tx.publishedSnapshot.findFirst({
        where: {
          environmentId: env.id,
          status: 'ACTIVE',
        },
        orderBy: {
          version: 'desc',
        },
        select: {
          id: true,
          version: true,
          storageKey: true,
          checksum: true,
          draftRevision: true,
        },
      });

      if (!publishedSnapshot) {
        return {
          success: false,
        };
      }

      if (!this.r2) {
        throw new BadRequestException('R2Service not configured');
      }
      const { body: bodyBytes, checksum: r2Checksum } = await this.r2.getObject(
        publishedSnapshot.storageKey,
      );
      const payloadChecksum = createHash('sha256')
        .update(bodyBytes)
        .digest('hex');
      if (
        payloadChecksum !== r2Checksum ||
        payloadChecksum !== publishedSnapshot.checksum
      ) {
        throw new BadRequestException('Snapshot checksum mismatch');
      }
      const bodyString = Buffer.from(bodyBytes).toString('utf8');
      const parsedBody: unknown = JSON.parse(bodyString);
      const payload: EnvironmentSnapshotPayload =
        EnvironmentSnapshotPayloadDto.parse(parsedBody);
      return this.restoreFromSnapshot(
        tx,
        env.id,
        resolvedOrgId,
        projId,
        flags,
        payload,
      );
    });
  }
  private async restoreFromSnapshot(
    tx: Prisma.TransactionClient,
    envId: string,
    resolvedOrgId: string,
    projId: string,
    flags: Array<{ id: string }>,
    payload: EnvironmentSnapshotPayload,
  ): Promise<{ success: boolean }> {
    for (const flag of flags) {
      const config = await tx.flagEnvironmentConfig.findFirst({
        where: {
          organizationId: resolvedOrgId,
          projectId: projId,
          environmentId: envId,
          flagId: flag.id,
        },
        select: { id: true, enabled: true, defaultValue: true, rules: true },
      });

      if (!config) {
        continue;
      }
      const snapshotFlag = payload.flags.find((sf) => sf.flagId === flag.id);
      if (!snapshotFlag) {
        continue;
      }
      await tx.flagEnvironmentConfig.update({
        where: { id: config.id },
        data: {
          enabled: snapshotFlag.enabled,
          defaultValue: snapshotFlag.defaultValue,
        },
      });
      const snapshotRuleIds = new Set(snapshotFlag.rules.map((r) => r.id));
      await tx.flagRule.deleteMany({
        where: {
          flagEnvironmentConfigId: config.id,
          id: {
            notIn: [...snapshotRuleIds],
          },
        },
      });
      const existingRules = await tx.flagRule.findMany({
        where: { flagEnvironmentConfigId: config.id },
        select: {
          id: true,
          priority: true,
          conditions: true,
          result: true,
        },
      });
      const existingRuleMap = new Map<
        string,
        {
          id: string;
          priority: number;
          conditions: {
            attribute: string;
            operator: string;
            value: unknown;
          };
          result: boolean;
        }
      >(
        existingRules.map((r) => [
          r.id,
          {
            id: r.id,
            priority: r.priority,
            conditions: r.conditions as {
              attribute: string;
              operator: string;
              value: unknown;
            },
            result: r.result,
          },
        ]),
      );
      for (const payloadRule of snapshotFlag.rules) {
        if (existingRuleMap.has(payloadRule.id)) {
          const existingRule = existingRuleMap.get(payloadRule.id)!;
          await tx.flagRule.update({
            where: { id: existingRule.id },
            data: {
              priority: payloadRule.priority,
              conditions: payloadRule.conditions as Prisma.InputJsonValue,
              result: payloadRule.result,
            },
          });
        } else {
          await tx.flagRule.create({
            data: {
              id: payloadRule.id,
              organizationId: resolvedOrgId,
              flagEnvironmentConfigId: config.id,
              priority: payloadRule.priority,
              conditions: payloadRule.conditions as Prisma.InputJsonValue,
              result: payloadRule.result,
            },
          });
        }
      }
    }

    return { success: true };
  }

  async revertDraft(
    flagKey: string,
    orgId: string,
    projId: string,
    envId: string,
    body: { targetVersion: number },
  ): Promise<{ success: boolean }> {
    const resolvedOrgId = await this.resolveOrganizationId(orgId, projId);

    if (!uuidRegex.test(envId)) {
      throw new NotFoundException('Environment not found');
    }
    const flag = await this.prisma.featureFlag.findFirst({
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

    return this.prisma.$transaction(async (tx) => {
      const env = await tx.environment.findFirst({
        where: {
          id: envId,
          organizationId: resolvedOrgId,
          projectId: projId,
          archivedAt: null,
        },
        select: { id: true, draftRevision: true },
      });

      if (!env) {
        throw new NotFoundException('Environment not found');
      }
      const targetSnapshot = await tx.publishedSnapshot.findFirst({
        where: {
          environmentId: env.id,
          status: 'ACTIVE',
          version: body.targetVersion,
        },
        select: {
          id: true,
          version: true,
          storageKey: true,
          checksum: true,
          draftRevision: true,
        },
      });

      if (!targetSnapshot) {
        throw new NotFoundException('Snapshot not found');
      }

      let payload: EnvironmentSnapshotPayload;
      try {
        if (!this.r2) {
          throw new BadRequestException('R2Service not configured');
        } else {
          const { body: bodyBytes, checksum: r2Checksum } =
            await this.r2.getObject(targetSnapshot.storageKey);
          const payloadChecksum = createHash('sha256')
            .update(bodyBytes)
            .digest('hex');
          if (
            payloadChecksum !== r2Checksum ||
            payloadChecksum !== targetSnapshot.checksum
          ) {
            throw new BadRequestException('Snapshot checksum mismatch');
          }
          payload = EnvironmentSnapshotPayloadDto.parse(
            JSON.parse(Buffer.from(bodyBytes).toString('utf8')),
          );
        }
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        throw new BadRequestException('Failed to read snapshot', {
          cause: error,
        });
      }

      const flags = await tx.featureFlag.findMany({
        where: {
          organizationId: resolvedOrgId,
          projectId: projId,
          archivedAt: null,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      return this.restoreFromSnapshot(
        tx,
        env.id,
        resolvedOrgId,
        projId,
        flags,
        payload,
      );
    });
  }
  async publishSnapshot(
    orgId: string,
    projId: string,
    envId: string,
    userId: string,
  ): Promise<{
    success: boolean;
    publishedSnapshot: {
      id: string;
      version: number;
      status: 'PENDING' | 'ACTIVE' | 'SUPERSEDED' | 'FAILED';
      storageKey: string;
    };
    draftRevision: number;
  }> {
    const resolvedOrgId = await this.resolveOrganizationId(orgId, projId);

    if (!uuidRegex.test(envId)) {
      throw new NotFoundException('Environment not found');
    }

    const env = await this.prisma.environment.findFirst({
      where: {
        id: envId,
        organizationId: resolvedOrgId,
        projectId: projId,
        archivedAt: null,
      },
      select: {
        id: true,
        draftRevision: true,
        project: {
          select: {
            id: true,
            slug: true,
          },
        },
        organizationId: true,
      },
    });

    if (!env) {
      throw new NotFoundException('Environment not found');
    }
    const existingActive = await this.prisma.publishedSnapshot.findFirst({
      where: {
        environmentId: env.id,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        version: true,
        status: true,
        draftRevision: true,
        storageKey: true,
      },
    });

    // Idempotency check: only return existing ACTIVE snapshot if its
    // draftRevision matches the environment's current draftRevision.
    // If the draftRevision has changed, allow publishing a new snapshot.
    if (
      existingActive &&
      existingActive.status === 'ACTIVE' &&
      existingActive.draftRevision === env.draftRevision
    ) {
      return {
        success: true,
        publishedSnapshot: {
          id: existingActive.id,
          version: existingActive.version,
          status: existingActive.status,
          storageKey: existingActive.storageKey,
        },
        draftRevision: env.draftRevision,
      };
    }

    // Build the environment-level snapshot from all flag environments configs.
    const flagConfigs = await this.prisma.flagEnvironmentConfig.findMany({
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

    // Construct the snapshot payload matching the v1 contract.
    const snapshotFlags = flagConfigs.map((config) => {
      const flag = config.flag;
      const rules = config.rules.map((rule) => ({
        id: rule.id,
        priority: rule.priority,
        conditions: rule.conditions as Array<{
          attribute: string;
          operator:
            | 'equals'
            | 'notEquals'
            | 'in'
            | 'notIn'
            | 'startsWith'
            | 'endsWith'
            | 'contains'
            | 'gt'
            | 'gte'
            | 'lt'
            | 'lte'
            | 'exists'
            | 'versionEquals'
            | 'versionGt'
            | 'versionGte'
            | 'versionLt'
            | 'versionLte';
          value: unknown;
        }>,
        result: rule.result,
      }));

      return {
        flagId: flag.id,
        enabled: config.enabled,
        defaultValue: config.defaultValue,
        rules,
      };
    });

    const payload: EnvironmentSnapshotPayload = {
      flags: snapshotFlags,
    };

    // Serialize the snapshot to JSON.
    const body = Buffer.from(JSON.stringify(payload, null, 2));

    // Compute SHA-256 checksum.
    const checksum = createHash('sha256').update(body).digest('hex');

    // Allocate the next snapshot version safely using the maximum version
    // currently in the PublishedSnapshot table for this environment.
    // This does NOT derive version from draftRevision; versions are globally
    // unique per environment via the @@unique([environmentId, version]) index.
    const maxVersionRow = await this.prisma.publishedSnapshot.findFirst({
      where: {
        environmentId: env.id,
      },
      select: { version: true },
      orderBy: { version: 'desc' },
    });
    const newVersion = (maxVersionRow?.version ?? 0) + 1;

    // Generate the R2 key (storage key): snapshots/{environmentId}/{version}.json
    const storageKey: string = `snapshots/${env.id}/${newVersion}.json`;

    // Create the PENDING PublishedSnapshot record before uploading to R2.
    // This ensures the DB record exists first; if R2 upload fails we can
    // mark the snapshot FAILED while keeping the previous ACTIVE snapshot unchanged.
    const pendingSnapshot = await this.prisma.publishedSnapshot.create({
      data: {
        organizationId: resolvedOrgId,
        projectId: projId,
        environmentId: env.id,
        version: newVersion,
        status: 'PENDING',
        storageKey,
        checksum,
        sizeBytes: body.length,
        draftRevision: env.draftRevision,
        sourceVersion: undefined,
        comment: undefined,
        createdByUserId: userId,
      },
      select: {
        id: true,
        version: true,
        status: true,
        storageKey: true,
        checksum: true,
        sizeBytes: true,
        draftRevision: true,
      },
    });

    // Upload to R2 outside of any DB transaction.
    let r2UploadResult: { sizeBytes: number; checksum: string } | null = null;

    if (this.r2) {
      r2UploadResult = await this.r2.putObject(storageKey, body);
    }

    // If R2 upload failed, mark the snapshot as FAILED and return.
    // The previous ACTIVE snapshot remains untouched.
    if (!r2UploadResult) {
      await this.prisma.publishedSnapshot.update({
        where: { id: pendingSnapshot.id },
        data: {
          status: 'FAILED',
          failureCode: 'R2_UPLOAD_FAILED',
        },
      });

      return {
        success: false,
        publishedSnapshot: {
          id: pendingSnapshot.id,
          version: pendingSnapshot.version,
          status: 'FAILED' as const,
          storageKey: pendingSnapshot.storageKey,
        },
        draftRevision: env.draftRevision,
      };
    }

    // Within a DB transaction, activate the new snapshot:
    //   1. Transition the previous ACTIVE snapshot for this environment to SUPERSEDED.
    //   2. Transition the new PENDING snapshot to ACTIVE.
    await this.prisma.$transaction(async (tx) => {
      // Transition the previous ACTIVE snapshot for this environment to SUPERSEDED.
      // We exclude the new snapshot being activated so we don't accidentally
      // double-transition it or leave a stale ACTIVE row.
      await tx.publishedSnapshot.updateMany({
        where: {
          environmentId: env.id,
          status: 'ACTIVE',
          NOT: { id: pendingSnapshot.id },
        },
        data: {
          status: 'SUPERSEDED',
          failureCode: undefined,
        },
      });

      // Transition the new snapshot to ACTIVE.
      await tx.publishedSnapshot.update({
        where: { id: pendingSnapshot.id },
        data: {
          status: 'ACTIVE',
          activatedAt: new Date(),
        },
      });
    });

    // Do NOT increment env.draftRevision. The draft state is preserved.

    return {
      success: true,
      publishedSnapshot: {
        id: pendingSnapshot.id,
        version: pendingSnapshot.version,
        status: 'ACTIVE',
        storageKey: pendingSnapshot.storageKey,
      },
      draftRevision: env.draftRevision,
    };
  }
}
