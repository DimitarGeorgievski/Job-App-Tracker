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
import { JobService } from './job.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import {
  JobOrderByWithRelationInput,
  JobWhereUniqueInput,
} from 'generated/prisma/models';
import { Job, Role } from 'generated/prisma/client';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/roles/roles/roles.guard';
import { Roles } from 'src/roles/roles/roles.decorator';

@UseGuards(AuthGuard,RolesGuard)
@Controller('job')
export class JobController {
  constructor(private readonly jobService: JobService) {}
  @Roles(Role.ADMIN)
  @Post()
  create(@Body() createJobDto: CreateJobDto) {
    return this.jobService.create(createJobDto);
  }

  @Get()
  findAll(
    @Param('params')
    params: {
      skip?: number;
      take?: number;
      where?: JobWhereUniqueInput;
      orderBy?: JobOrderByWithRelationInput;
    },
  ): Promise<Job[] | null> {
    return this.jobService.findAll(params);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.jobService.findOne(Number(id));
  }
  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateJobDto: UpdateJobDto) {
    return this.jobService.update(Number(id), updateJobDto);
  }
  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.jobService.remove(Number(id));
  }
}
