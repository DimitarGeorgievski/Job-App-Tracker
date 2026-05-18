import { Injectable } from '@nestjs/common';
import { Application, AppStatus, Prisma } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { ApplicationReminderService } from './application-reminder.service';
import { CreateApplicationDto } from '../dto/create-application.dto';
import { CoverLetterService } from 'src/cover-letter/cover-letter.service';
import { MultipartFile } from '@fastify/multipart';

@Injectable()
export class ApplicationService {
  constructor(
    private prisma: PrismaService,
    private reminderService: ApplicationReminderService,
    private coverLetterService: CoverLetterService,
  ) {}
  async create(data: CreateApplicationDto, file?: MultipartFile | null) {
    return await this.prisma.$transaction(async (tx) => {
      const app = await tx.application.create({
        data: {
          user: { connect: { id: data.userId } },
          job: { connect: { id: data.jobId } },
          notes: data.notes,
          status: AppStatus.APPLIED,
        },
      });
      if (file) {
        await this.coverLetterService.createFileCoverLetter(
          {
            applicationId: app.id,
            result: data.coverLetter,
            userId: data.userId,
          },
          data.userId,
          file,
        );
      } else if (data.coverLetter) {
        await this.coverLetterService.createTextCoverLetter(
          {
            applicationId: app.id,
            content: data.coverLetter,
            result: data.coverLetter,
            userId: data.userId,
          },
          data.userId,
        );
      }
      await this.reminderService.scheduleFollowUp(app.id);
      return app;
    });
  }

  async findAll(
    params: {
      skip?: number;
      take?: number;
      where?: Prisma.ApplicationWhereInput;
      orderBy?: Prisma.ApplicationOrderByWithRelationInput;
    } = {},
  ): Promise<Application[]> {
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
