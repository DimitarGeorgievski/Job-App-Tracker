import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApplicationService } from './services/application.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import {
  ApplicationOrderByWithRelationInput,
  ApplicationWhereUniqueInput,
} from 'generated/prisma/models';
import { Application, Role } from 'generated/prisma/client';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/roles/roles.guard';
import { Roles } from 'src/roles/roles.decorator';

@UseGuards(AuthGuard,RolesGuard)
@Controller('application')
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}
  @Roles(Role.USER)
  @Post()
  create(@Body() data: CreateApplicationDto) {
    return this.applicationService.create(data);
  }
  @Get()
  @Roles(Role.ADMIN)
  findAll(
    @Param('params')
    params: {
      skip?: number;
      take?: number;
      where?: ApplicationWhereUniqueInput;
      orderBy?: ApplicationOrderByWithRelationInput;
    },
  ): Promise<Application[] | null> {
    return this.applicationService.findAll(params);
  }
  @Roles(Role.USER)
  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.applicationService.findByUser(Number(userId));
  }
  @Get(':id')
  @Roles(Role.USER)
  findOne(@Param('id') id: string) {
    return this.applicationService.findOne(Number(id));
  }
  @Roles(Role.ADMIN)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() data: UpdateStatusDto) {
    return this.applicationService.updateStatus(Number(id), data.status);
  }
  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.applicationService.remove(Number(id));
  }
}
