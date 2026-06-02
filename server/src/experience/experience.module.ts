import { Module } from '@nestjs/common';
import { ExperienceService } from './experience.service';
import { ExperienceController } from './experience.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [ExperienceController],
  providers: [ExperienceService],
  imports: [PrismaModule]
})
export class ExperienceModule {}
