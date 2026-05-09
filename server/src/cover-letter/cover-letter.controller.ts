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
  UseGuards,
} from '@nestjs/common';
import { CoverLetterService } from './cover-letter.service';
import { CreateCoverLetterDto } from './dto/create-cover-letter.dto';
import { UpdateCoverLetterDto } from './dto/update-cover-letter.dto';
import {
  CoverLetterOrderByWithRelationInput,
  CoverLetterWhereUniqueInput,
} from 'generated/prisma/models';
import type { FastifyRequest } from 'fastify';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/roles/roles.guard';
import { Roles } from 'src/roles/roles.decorator';
import { Role } from 'generated/prisma/enums';

@UseGuards(AuthGuard,RolesGuard)
@Controller('cover-letters')
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
    @Req() req: FastifyRequest,
    @Param('userId') userId: string,
  ) {
    const file = await req.file();
    if (!file) throw new BadRequestException('file is required');
    const data = {
      applicationId: Number((file.fields.applicationId as any)?.value),
      result: (file.fields.result as any)?.value,
    } as CreateCoverLetterDto;
    return this.coverLetterService.createFileCoverLetter(
      data,
      Number(userId),
      file,
    );
  }
  @Roles(Role.ADMIN)
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
  
  @Roles(Role.COMPANY)
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
