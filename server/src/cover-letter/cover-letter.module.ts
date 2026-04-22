import { Module } from '@nestjs/common';
import { CoverLetterService } from './cover-letter.service';
import { CoverLetterController } from './cover-letter.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [CoverLetterController],
  providers: [CoverLetterService],
  imports: [PrismaService],
})
export class CoverLetterModule {}
