import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  ParseFilePipeBuilder,
  ValidationPipe,
} from '@nestjs/common';
import { CoverLetterService } from './cover-letter.service';
import { CreateCoverLetterDto } from './dto/create-cover-letter.dto';
import { UpdateCoverLetterDto } from './dto/update-cover-letter.dto';
import {
  CoverLetterOrderByWithRelationInput,
  CoverLetterWhereUniqueInput,
} from 'generated/prisma/models';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('cover-letter')
export class CoverLetterController {
  constructor(private readonly coverLetterService: CoverLetterService) {}

  @Post(':userId')
  @UseInterceptors(FileInterceptor('file'))
  create(
    @Body(new ValidationPipe({ transform: true })) data: CreateCoverLetterDto,
    @Param('userId') userId: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /(pdf|doc|docx)/,
          errorMessage: "Your file must be one of the following formats."
        })
        .addMaxSizeValidator({
          maxSize: 1024 * 1024,
          errorMessage: "Your file is too big."
        })
        .build({
          fileIsRequired: false
        }),
    )
    file?: Express.Multer.File,
  ) {
    return this.coverLetterService.create(data, Number(userId), file);
  }

  @Get()
  findAll(
    @Param('params')
    params: {
      skip?: number;
      take?: number;
      where?: CoverLetterWhereUniqueInput;
      orderBy?: CoverLetterOrderByWithRelationInput;
    },
  ) {
    return this.coverLetterService.findAll(params);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.coverLetterService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('userId') userId: string,
    @Body() updateCoverLetterDto: UpdateCoverLetterDto,
  ) {
    return this.coverLetterService.update(Number(userId), updateCoverLetterDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.coverLetterService.remove(+id);
  }
}
