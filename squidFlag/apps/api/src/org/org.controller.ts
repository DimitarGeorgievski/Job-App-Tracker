import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { OrgService } from './org.service';
import { CreateOrganizationDto, RenameOrganizationDto } from './dto/org.dto';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { OrgCreationResponse } from './types/org.type';
import { OrgPermissionGuard } from 'src/rbac/rbac.guard';
import { RequireOrgPermission } from 'src/rbac/org-permission.decorator';

@Controller('organizations')
@UseGuards(OrgPermissionGuard)
export class OrgController {
  constructor(private readonly orgService: OrgService) {}

  @Post()
  @HttpCode(201)
  async create(
    @Body() body: CreateOrganizationDto,
    @CurrentUser() user: { sub: string },
  ): Promise<OrgCreationResponse> {
    return this.orgService.createOrganization(body, user.sub);
  }

  @Patch(':orgId/rename')
  @RequireOrgPermission('organization:rename')
  async rename(
    @Param('orgId') orgId: string,
    @Body() body: RenameOrganizationDto,
    @CurrentUser() user: { sub: string },
  ) {
    return this.orgService.renameOrganization(orgId, body, user.sub);
  }

  @Patch(':orgId/archive')
  @RequireOrgPermission('organization:archive')
  async archive(
    @Param('orgId') orgId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.orgService.archiveOrganization(orgId, user.sub);
  }
}
