import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApplicationService } from './application.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import {
  ApplicationOrderByWithRelationInput,
  ApplicationWhereUniqueInput,
} from 'generated/prisma/models';
import { Application } from 'generated/prisma/client';

@Controller('application')
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}
  @Post()
  create(@Body() data: CreateApplicationDto) {
    return this.applicationService.create(data);
  }
  @Get()
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
  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.applicationService.findByUser(Number(userId));
  }
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.applicationService.findOne(Number(id));
  }
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() data: UpdateStatusDto) {
    return this.applicationService.updateStatus(Number(id), data.status);
  }
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.applicationService.remove(Number(id));
  }
}
