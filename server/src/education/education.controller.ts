import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
} from '@nestjs/common';
import { EducationService } from './education.service';
import { CreateEducationDto } from './dto/create-education.dto';
import { UpdateEducationDto } from './dto/update-education.dto';
import { Education, Role } from 'generated/prisma/client';
import type { FastifyRequest } from 'fastify';
import {
  EducationOrderByWithRelationInput,
  EducationWhereUniqueInput,
} from 'generated/prisma/models';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/roles/roles.guard';
import { Roles } from 'src/roles/roles.decorator';

@Controller('education')
export class EducationController {
  constructor(private readonly educationService: EducationService) {}
  @UseGuards(AuthGuard,RolesGuard)
  @Roles([Role.USER,Role.ADMIN,Role.COMPANY])
  @Post()
  create(
    @Body() data: CreateEducationDto,
    @Req() req: FastifyRequest & { user: { userId: number } },
  ) {
    return this.educationService.create(data, req.user.userId);
  }
  @UseGuards(AuthGuard,RolesGuard)
  @Roles([Role.USER,Role.ADMIN,Role.COMPANY])
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
  @UseGuards(AuthGuard,RolesGuard)
  @Roles([Role.USER,Role.ADMIN,Role.COMPANY])
  @Get(':id')
  async getById(@Param('id') id: string): Promise<Education | null> {
    return this.educationService.findById(Number(id));
  }
  @UseGuards(AuthGuard,RolesGuard)
  @Roles([Role.USER,Role.ADMIN,Role.COMPANY])
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateEducationDto: UpdateEducationDto,
  ) {
    return this.educationService.update(Number(id), updateEducationDto);
  }
  @UseGuards(AuthGuard,RolesGuard)
  @Roles([Role.USER,Role.ADMIN,Role.COMPANY])
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.educationService.remove(Number(id));
  }
}
