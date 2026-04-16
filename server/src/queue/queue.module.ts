import { Module } from '@nestjs/common';
import { CoverLetterProducer } from './producers/cover-letter.producer';

@Module({
  providers: [CoverLetterProducer],
  exports: [CoverLetterProducer],
})
export class QueueModule {}