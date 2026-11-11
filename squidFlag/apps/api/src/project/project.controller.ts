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
import { ProjectService } from './project.service';
import { CreateProjectDto, RenameProjectDto } from './dto/project.dto';
import { ProjectResponse } from './types/project.type';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { OrgPermissionGuard } from 'src/rbac/rbac.guard';
import { RequireOrgPermission } from 'src/rbac/org-permission.decorator';

@Controller('organizations')
@UseGuards(OrgPermissionGuard)
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post(':orgId/projects')
  @RequireOrgPermission('project:create')
  async create(
    @Param('orgId') orgId: string,
    @Body() body: CreateProjectDto,
    @CurrentUser() user: { sub: string },
  ): Promise<ProjectResponse> {
    return this.projectService.createProject(body, orgId, user.sub);
  }

  @Get(':orgId/projects')
  @RequireOrgPermission('project:view')
  async list(@Param('orgId') orgId: string): Promise<ProjectResponse[]> {
    return this.projectService.getProjects(orgId);
  }

  @Get(':orgId/projects/:projectId')
  @RequireOrgPermission('project:view')
  async retrieve(
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string,
  ): Promise<ProjectResponse> {
    return this.projectService.getProject(orgId, projectId);
  }

  @Patch(':orgId/projects/:projectId/rename')
  @RequireOrgPermission('project:rename')
  async rename(
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string,
    @Body() body: RenameProjectDto,
    @CurrentUser() user: { sub: string },
  ): Promise<ProjectResponse> {
    return this.projectService.renameProject(orgId, projectId, body, user.sub);
  }

  @Patch(':orgId/projects/:projectId/archive')
  @RequireOrgPermission('project:archive')
  @HttpCode(HttpStatus.OK)
  async archive(
    @Param('orgId') orgId: string,
    @Param('projectId') projectId: string,
    @CurrentUser() user: { sub: string },
  ): Promise<{ success: boolean }> {
    return this.projectService.archiveProject(orgId, projectId, user.sub);
  }
}
