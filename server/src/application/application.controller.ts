import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
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
import { type FastifyRequest } from 'fastify';
import { type MultipartFile } from '@fastify/multipart';

@UseGuards(AuthGuard, RolesGuard)
@Controller('applications')
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}
  @Roles([Role.USER])
  @Post()
  async create(@Req() req: FastifyRequest) {
    const fields: Record<string, string> = {};
    let file: MultipartFile | null = null;
    for await (const part of req.parts()) {
      if (part.type === 'file') {
        file = part as MultipartFile;
      } else {
        fields[part.fieldname] = part.value as string;
      }
    }
    const userId = (req as any).user.userId;
    const data = {
      jobId: Number(fields.jobId),
      userId: Number(userId),
      notes: fields.notes,
      phone: fields.phone,
      coverLetter: fields.coverLetter,
    } as CreateApplicationDto;

    return this.applicationService.create(data, file);
  }
  @Get()
  @Roles([Role.ADMIN])
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
  @Roles([Role.USER])
  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.applicationService.findByUser(Number(userId));
  }
  @Get(':id')
  @Roles([Role.USER])
  findOne(@Param('id') id: string) {
    return this.applicationService.findOne(Number(id));
  }
  @Roles([Role.ADMIN])
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() data: UpdateStatusDto) {
    return this.applicationService.updateStatus(Number(id), data.status);
  }
  @Roles([Role.ADMIN])
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.applicationService.remove(Number(id));
  }
}
