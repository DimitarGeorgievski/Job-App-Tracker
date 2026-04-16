import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { redisConfig } from '../redis.config';
import { QUEUE_NAMES } from '../queue.constants';

@Injectable()
export class CoverLetterProducer {
  private queue = new Queue(QUEUE_NAMES.FILES, {
    connection: redisConfig,
  });

  async addCoverProcessingJob(fileName: string) {
    const job = await this.queue.add('process-cover', { fileName });
    return job.id;
  }
}