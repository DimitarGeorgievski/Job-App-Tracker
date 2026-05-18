import { Module } from '@nestjs/common';
import { ApplicationService } from './services/application.service';
import { ApplicationController } from './application.controller';
import { MailModule } from 'src/mail/mail.module';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ApplicationReminderProcessor } from './workers/application-reminder.processor';
import { ApplicationReminderService } from './services/application-reminder.service';
import { UserModule } from 'src/user/user.module';
import { CoverLetterModule } from 'src/cover-letter/cover-letter.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'application-reminders',
    }),
    MailModule,
    PrismaModule,
    UserModule,
    CoverLetterModule
  ],
  controllers: [ApplicationController],
  providers: [
    ApplicationService,
    ApplicationReminderProcessor,
    ApplicationReminderService,
  ],
})
export class ApplicationModule {}
