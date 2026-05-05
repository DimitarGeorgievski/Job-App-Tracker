import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { UserModule } from 'src/user/user.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  imports: [PrismaModule, UserModule],
})
export class AnalyticsModule {}
