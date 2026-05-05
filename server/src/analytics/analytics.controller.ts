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
import { AnalyticsService } from './analytics.service';
import { CreateAnalyticsDto } from './dto/create-analytics.dto';
import { UpdateAnalyticsDto } from './dto/update-analytics.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/roles/roles.guard';
import { Roles } from 'src/roles/roles.decorator';
import { Role } from 'generated/prisma/enums';

@UseGuards(AuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}
  @Post()
  @Roles(Role.COMPANY)
  create(@Body() data: CreateAnalyticsDto) {
    return this.analyticsService.create(data);
  }

  @Get()
  @Roles(Role.ADMIN)
  findAll() {
    return this.analyticsService.findAll();
  }
  @Get('company/:id')
  @Roles(Role.COMPANY)
  findAllForCompany(@Param('id') companyId: string) {
    return this.analyticsService.findAllForCompany(companyId);
  }

  @Get(':id')
  @Roles(Role.COMPANY)
  findOne(@Param('id') id: string) {
    return this.analyticsService.findOne(+id);
  }

  @Roles(Role.COMPANY)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAnalyticsDto: UpdateAnalyticsDto,
  ) {
    return this.analyticsService.update(+id, updateAnalyticsDto);
  }

  @Delete(':id')
  @Roles(Role.COMPANY)
  remove(@Param('id') id: string) {
    return this.analyticsService.remove(+id);
  }
}
