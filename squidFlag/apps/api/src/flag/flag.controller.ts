import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FlagService } from './flag.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateFlagDto } from './dto/create-flag.dto';
import { UpdateFlagDto } from './dto/update-flag.dto';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { RevertDraftDto } from './dto/update-flag.dto';
import { RequireOrgPermission } from 'src/rbac/org-permission.decorator';
import { OrganizationGuard } from 'src/rbac/organization.guard';
import { OrgPermissionGuard } from 'src/rbac/rbac.guard';

@Controller('flags')
@UseGuards(OrganizationGuard, OrgPermissionGuard)
export class FlagController {
  constructor(private readonly service: FlagService) {}

  @Post()
  @RequireOrgPermission('flag:create')
  async create(
    @Body() body: CreateFlagDto,
    @Query('orgId') orgId: string,
    @Query('projId') projId: string,
    @Query('envId') envId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.service.createFlag(user.sub, orgId, projId, envId, body);
  }

  @Get()
  @RequireOrgPermission('flag:view')
  async list(
    @Query('orgId') orgId: string,
    @Query('projId') projId: string,
    @Query('envId') envId: string,
    @CurrentUser() _user: { sub: string },
  ) {
    return this.service.listFlags(orgId, projId, envId);
  }

  @Get(':flagKey')
  @RequireOrgPermission('flag:view')
  async detail(
    @Param('flagKey') flagKey: string,
    @Query('orgId') orgId: string,
    @Query('projId') projId: string,
    @Query('envId') envId: string,
    @CurrentUser() _user: { sub: string },
  ) {
    return this.service.getFlag(flagKey, orgId, projId, envId);
  }

  @Patch(':flagKey')
  @RequireOrgPermission('flag:edit')
  async update(
    @Param('flagKey') flagKey: string,
    @Body() body: UpdateFlagDto,
    @Query('orgId') orgId: string,
    @Query('projId') projId: string,
    @Query('envId') envId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.service.updateFlag(
      flagKey,
      orgId,
      projId,
      envId,
      {
        name: body.name,
        enabled: body.enabled,
        defaultValue: body.defaultValue,
      },
      user.sub,
    );
  }

  @Delete(':flagKey')
  @RequireOrgPermission('flag:delete')
  async delete(
    @Param('flagKey') flagKey: string,
    @Query('orgId') orgId: string,
    @Query('projId') projId: string,
    @Query('envId') envId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.service.deleteFlag(flagKey, orgId, projId, envId, user.sub);
  }

  @Post(':flagKey/rules')
  @RequireOrgPermission('rule:create')
  async addRule(
    @Param('flagKey') flagKey: string,
    @Body() body: CreateRuleDto,
    @Query('orgId') orgId: string,
    @Query('projId') projId: string,
    @Query('envId') envId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.service.addRule(
      flagKey,
      orgId,
      projId,
      envId,
      {
        priority: body.priority,
        conditions: body.conditions,
        value: body.value,
      },
      user.sub,
    );
  }

  @Patch(':flagKey/rules/:ruleId')
  @RequireOrgPermission('rule:edit')
  async updateRule(
    @Param('flagKey') flagKey: string,
    @Param('ruleId') ruleId: string,
    @Body() body: UpdateRuleDto,
    @Query('orgId') orgId: string,
    @Query('projId') projId: string,
    @Query('envId') envId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.service.updateRule(
      flagKey,
      ruleId,
      orgId,
      projId,
      envId,
      {
        priority: body.priority,
        conditions: body.conditions,
        value: body.value,
      },
      user.sub,
    );
  }

  @Delete(':flagKey/rules/:ruleId')
  @RequireOrgPermission('rule:delete')
  async removeRule(
    @Param('flagKey') flagKey: string,
    @Param('ruleId') ruleId: string,
    @Query('orgId') orgId: string,
    @Query('projId') projId: string,
    @Query('envId') envId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.service.removeRule(
      flagKey,
      ruleId,
      orgId,
      projId,
      envId,
      user.sub,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post(':flagKey/draft/save')
  @RequireOrgPermission('flag:edit')
  async saveDraft(
    @Param('flagKey') flagKey: string,
    @Query('orgId') orgId: string,
    @Query('projId') projId: string,
    @Query('envId') envId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.service.saveDraft(flagKey, orgId, projId, envId, user.sub);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':flagKey/draft/discard')
  @RequireOrgPermission('flag:edit')
  async discardDraft(
    @Param('flagKey') flagKey: string,
    @Query('orgId') orgId: string,
    @Query('projId') projId: string,
    @Query('envId') envId: string,
  ) {
    return this.service.discardDraft(flagKey, orgId, projId, envId);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':flagKey/draft/revert')
  @RequireOrgPermission('flag:edit')
  async revertDraft(
    @Param('flagKey') flagKey: string,
    @Query('orgId') orgId: string,
    @Query('projId') projId: string,
    @Query('envId') envId: string,
    @Body() body: RevertDraftDto,
  ) {
    return this.service.revertDraft(flagKey, orgId, projId, envId, body);
  }

  @HttpCode(HttpStatus.OK)
  @Post(':flagKey/publish')
  @RequireOrgPermission('publish')
  async publish(
    @Query('orgId') orgId: string,
    @Query('projId') projId: string,
    @Query('envId') envId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.service.publishSnapshot(orgId, projId, envId, user.sub);
  }
}
