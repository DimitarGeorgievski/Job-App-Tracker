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
  Req,
  BadRequestException,
} from '@nestjs/common';
import { CoverLetterService } from './cover-letter.service';
import { CreateCoverLetterDto } from './dto/create-cover-letter.dto';
import { UpdateCoverLetterDto } from './dto/update-cover-letter.dto';
import {
  CoverLetterOrderByWithRelationInput,
  CoverLetterWhereUniqueInput,
} from 'generated/prisma/models';
import type { FastifyRequest } from 'fastify';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('cover-letter')
export class CoverLetterController {
  constructor(private readonly coverLetterService: CoverLetterService) {}

  @Post('/text/:userId')
  async createTextCoverLetter(
    @Body(new ValidationPipe({ transform: true })) data: CreateCoverLetterDto,
    @Param('userId') userId: string,
  ) {
    return this.coverLetterService.createTextCoverLetter(data, Number(userId));
  }
  @Post('/file/:userId')
  async createFileCoverLetter(
    @Body(new ValidationPipe({ transform: true })) data: CreateCoverLetterDto,
    @Req() req: FastifyRequest,
    @Param('userId') userId: string,
  ) {
    const file = await req.file();
    if (!file) throw new BadRequestException('file is required');
    return this.coverLetterService.createFileCoverLetter(
      data,
      Number(userId),
      file,
    );
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
