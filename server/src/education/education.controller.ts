import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
} from '@nestjs/common';

import { EducationService } from './education.service';
import { CreateEducationDto } from './dto/create-education.dto';
import { UpdateEducationDto } from './dto/update-education.dto';

import { Education } from 'generated/prisma/client';

import type { FastifyRequest } from 'fastify';

import {
  EducationOrderByWithRelationInput,
  EducationWhereUniqueInput,
} from 'generated/prisma/models';

@Controller('education')
export class EducationController {
  constructor(private readonly educationService: EducationService) {}

  @Post()
  create(
    @Body() data: CreateEducationDto,
    @Req() req: FastifyRequest & { user: { id: number } },
  ) {
    return this.educationService.create(data, req.user.id);
  }
  @Get()
  findAll(
    @Param('params')
    params: {
      skip?: number;
      take?: number;
      where?: EducationWhereUniqueInput;
      orderBy?: EducationOrderByWithRelationInput;
    },
  ): Promise<Education[] | null> {
    return this.educationService.findAll(params);
  }
  @Get(':id')
  async getById(@Param('id') id: string): Promise<Education | null> {
    return this.educationService.findById(Number(id));
  }
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateEducationDto: UpdateEducationDto,
  ) {
    return this.educationService.update(Number(id), updateEducationDto);
  }
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.educationService.remove(Number(id));
  }
}
