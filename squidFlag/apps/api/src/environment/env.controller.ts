import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { EnvService } from './env.service';
import {
  CreateEnvironmentDto,
  EnvironmentResponse,
  RenameEnvironmentDto,
} from './dto/env.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { OrgPermissionGuard } from 'src/rbac/rbac.guard';
import { RequireOrgPermission } from 'src/rbac/org-permission.decorator';

@Controller('organizations')
@UseGuards(OrgPermissionGuard)
export class EnvController {
  constructor(private readonly envService: EnvService) {}

  @Post(':orgId/projects/:projectId/environments')
  @RequireOrgPermission('environment:create')
  async create(
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string,
    @Body() body: CreateEnvironmentDto,
    @CurrentUser() user: { sub: string },
  ): Promise<EnvironmentResponse> {
    return this.envService.createEnvironment(orgId, projectId, body, user.sub);
  }

  @Get(':orgId/projects/:projectId/environments')
  @RequireOrgPermission('environment:view')
  async list(
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string,
  ): Promise<EnvironmentResponse[]> {
    return this.envService.listEnvironments(orgId, projectId);
  }

  @Get(':orgId/projects/:projectId/environments/:envId')
  @RequireOrgPermission('environment:view')
  async retrieve(
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string,
    @Param('envId') envId: string,
  ): Promise<EnvironmentResponse> {
    return this.envService.getEnvironment(orgId, projectId, envId);
  }

  @Patch(':orgId/projects/:projectId/environments/:envId')
  @RequireOrgPermission('environment:rename')
  async rename(
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string,
    @Param('envId') envId: string,
    @Body() body: RenameEnvironmentDto,
    @CurrentUser() user: { sub: string },
  ): Promise<EnvironmentResponse> {
    return this.envService.renameEnvironment(
      orgId,
      projectId,
      envId,
      body,
      user.sub,
    );
  }

  @Patch(':orgId/projects/:projectId/environments/:envId/archive')
  @RequireOrgPermission('environment:archive')
  @HttpCode(HttpStatus.OK)
  async archive(
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string,
    @Param('envId') envId: string,
    @CurrentUser() user: { sub: string },
  ): Promise<EnvironmentResponse & { success: boolean }> {
    const environment = await this.envService.archiveEnvironment(
      orgId,
      projectId,
      envId,
      user.sub,
    );
    return {
      ...environment,
      success: true,
    };
  }
}
