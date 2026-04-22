import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { AppStatus } from 'generated/prisma/enums';
import { MailService } from 'src/mail/mail.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
@Processor('application-reminders')
export class ApplicationReminderProcessor extends WorkerHost {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {
    super();
  }
  async process(job: Job<{ applicationId: number }>) {
    const { applicationId } = job.data;
    const app = await this.prisma.application.findUniqueOrThrow({
      where: { id: applicationId },
      include: {
        user: true,
        job: true,
      },
    });
    if (app.status !== AppStatus.APPLIED) return;
    await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        status: AppStatus.FOLLOW_UP_DUE,
      },
    });
    await this.mailService.sendFollowUpReminder(
      app.user.email,
      app.user.name,
      app.job.title,
    );
  }
}
