import { Injectable } from '@nestjs/common';
import { Application, AppStatus, Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { ApplicationReminderService } from './application-reminder.service';
import { CreateApplicationDto } from '../dto/create-application.dto';

@Injectable()
export class ApplicationService {
  constructor(
    private prisma: PrismaService,
    private reminderService: ApplicationReminderService,
  ) {}
  async create(data: CreateApplicationDto) {
    const app = await this.prisma.application.create({
      data: {
        notes: data.notes,
        status: AppStatus.APPLIED,
        user: {
          connect: {
            id: data.userId,
          },
        },
        // coverLetters: {
        //   connect: {
        //     id: data.coverLetterId,
        //   },
        // },
        // Analytics: {
        //   connect: {
        //     id: data.analyticsId,
        //   },
        // },
        job: {
          connect: {
            id: data.jobId,
          },
        },
      },
      include: {
        user: true,
        job: true,
      },
    });
    await this.reminderService.scheduleFollowUp(app.id);
    return app;
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.ApplicationWhereInput;
    orderBy?: Prisma.ApplicationOrderByWithRelationInput;
  }): Promise<Application[]> {
    const { orderBy, skip, take, where } = params;
    return await this.prisma.application.findMany({
      skip,
      take,
      where,
      orderBy,
    });
  }
  async findByUser(userId: number): Promise<Application[] | null> {
    return await this.prisma.application.findMany({
      where: { userId },
      include: { job: true },
    });
  }
  async findOne(id: number): Promise<Application | null> {
    return await this.prisma.application.findUnique({
      where: { id },
      include: { job: true, user: true },
    });
  }

  async updateStatus(id: number, status: AppStatus): Promise<Application> {
    return await this.prisma.application.update({
      data: { status },
      where: { id },
    });
  }

  async remove(id: number) {
    return await this.prisma.application.delete({
      where: { id },
    });
  }
}
