import { Module } from '@nestjs/common';
import { FlagService } from './flag.service';
import { FlagController } from './flag.controller';
import { PrismaModule } from '../platform/database/prisma.module';
import { OrgPermissionGuard } from 'src/rbac/rbac.guard';

@Module({
  imports: [PrismaModule],
  controllers: [FlagController],
  providers: [FlagService, OrgPermissionGuard],
  exports: [FlagService],
})
export class FlagModule {}
