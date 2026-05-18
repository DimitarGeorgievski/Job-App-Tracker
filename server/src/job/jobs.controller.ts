import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { JobService } from './job.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { Job, JobType, Prisma, Role } from 'generated/prisma/client';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/roles/roles.guard';
import { Roles } from 'src/roles/roles.decorator';

@UseGuards(AuthGuard, RolesGuard)
@Controller('jobs')
export class JobController {
  constructor(private readonly jobService: JobService) {}
  @Roles([Role.ADMIN])
  @Post()
  create(@Body() createJobDto: CreateJobDto) {
    return this.jobService.create(createJobDto);
  }
  @Roles([Role.ADMIN, Role.USER, Role.COMPANY])
  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '3',
    @Query('jobType') jobType?: JobType,
    @Query('date') date?: string,
    @Query('query') query?: string,
    @Query('location') location?: string,
  ) {
    const take = Number(limit);
    const skip = (Number(page) - 1) * take;
    let createdAt: Prisma.DateTimeFilter | undefined;
    if (date === '24h') {
      createdAt = { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) };
    } else if (date === 'week') {
      createdAt = { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
    }
    return this.jobService.findAll({
      skip,
      take,
      where: {
        ...(jobType ? { jobType } : {}),
        ...(createdAt ? { createdAt } : {}),
        ...(query
          ? {
              OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(location
          ? {
              location: { contains: location, mode: 'insensitive' },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  @Roles([Role.ADMIN, Role.USER, Role.COMPANY])
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.jobService.findOne(Number(id));
  }
  @Roles([Role.ADMIN])
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateJobDto: UpdateJobDto) {
    return this.jobService.update(Number(id), updateJobDto);
  }
  @Roles([Role.ADMIN])
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.jobService.remove(Number(id));
  }
}
