import { Module } from '@nestjs/common';
import { CoverLetterService } from './cover-letter.service';
import { CoverLetterController } from './cover-letter.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  controllers: [CoverLetterController],
  providers: [CoverLetterService],
  imports: [PrismaModule,CloudinaryModule],
})
export class CoverLetterModule {}
