import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { redisConfig } from 'src/queue/redis.config';

@Injectable()
export class ApplicationReminderService {
  constructor(
    @InjectQueue('application-reminders') private reminderQueue: Queue,
  ) {}
  async scheduleFollowUp(id: number) {
    await this.reminderQueue.add(
      'follow-up-reminder',
      { id },
      {
        delay: 1000 * 60 * 60 * 24 * 3,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
      },
    );
  }
}
