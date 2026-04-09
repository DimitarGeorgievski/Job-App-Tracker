import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { redisConfig } from '../queue/redis.config';

@Injectable()
export class CoverService {
  private queue = new Queue('cover-letters', { connection: redisConfig });

  async addJob(fileName: string) {
    const job = await this.queue.add('process-cover', { fileName });
    return job.id;
  }
}