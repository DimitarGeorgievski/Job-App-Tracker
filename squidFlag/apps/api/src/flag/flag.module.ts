import { Module } from '@nestjs/common';
import { FlagService } from './flag.service';
import { FlagController } from './flag.controller';
import { PrismaModule } from '../platform/database/prisma.module';
import { OrgPermissionGuard } from 'src/rbac/rbac.guard';
import { R2Module } from '../platform/storage/r2/r2.module';

@Module({
  imports: [PrismaModule, R2Module],
  controllers: [FlagController],
  providers: [FlagService, OrgPermissionGuard],
  exports: [FlagService],
})
export class FlagModule {}
