import { Module } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { OrgPermissionGuard } from 'src/rbac/rbac.guard';

@Module({
  controllers: [ProjectController],
  providers: [ProjectService, OrgPermissionGuard],
  exports: [ProjectService],
})
export class ProjectModule {}
