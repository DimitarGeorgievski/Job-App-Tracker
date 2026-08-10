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
import { ExperienceService } from './experience.service';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { UpdateExperienceDto } from './dto/update-experience.dto';
import type { FastifyRequest } from 'fastify';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/roles/roles.guard';
import { Roles } from 'src/roles/roles.decorator';
import { Role } from 'generated/prisma/enums';

@Controller('experience')
export class ExperienceController {
  constructor(private readonly experienceService: ExperienceService) {}
  @UseGuards(AuthGuard,RolesGuard)
  @Roles([Role.USER,Role.ADMIN,Role.COMPANY])
  @Post()
  create(
    @Body() createExperienceDto: CreateExperienceDto,
    @Req() req: FastifyRequest & { user: { userId: number } },
  ) {
    return this.experienceService.create(createExperienceDto, req.user.userId);
  }
  @UseGuards(AuthGuard,RolesGuard)
  @Roles([Role.USER,Role.ADMIN,Role.COMPANY])
  @Get()
  findAll() {
    return this.experienceService.findAll();
  }
  @UseGuards(AuthGuard,RolesGuard)
  @Roles([Role.USER,Role.ADMIN,Role.COMPANY])
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.experienceService.findById(+id);
  }
  @UseGuards(AuthGuard,RolesGuard)
  @Roles([Role.USER,Role.ADMIN,Role.COMPANY])
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateExperienceDto: UpdateExperienceDto,
  ) {
    return this.experienceService.update(+id, updateExperienceDto);
  }
  @UseGuards(AuthGuard,RolesGuard)
  @Roles([Role.USER,Role.ADMIN,Role.COMPANY])
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.experienceService.remove(+id);
  }
}
