import { Module } from '@nestjs/common';
import { OrgController } from './org.controller';
import { OrgService } from './org.service';
import { OrgPermissionGuard } from '../rbac/rbac.guard';

@Module({
  controllers: [OrgController],
  providers: [OrgService, OrgPermissionGuard],
  exports: [OrgService],
})
export class OrgModule {}
