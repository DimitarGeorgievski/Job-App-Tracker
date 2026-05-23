import { Module } from '@nestjs/common';
import { EducationService } from './education.service';
import { EducationController } from './education.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [EducationController],
  providers: [EducationService],
  imports: [PrismaService]
})
export class EducationModule {}
