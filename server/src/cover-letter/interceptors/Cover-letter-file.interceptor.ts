import { FileInterceptor } from '@nestjs/platform-express';

export const CoverLetterFileInterceptor = () =>
  FileInterceptor('file', {
    limits: {
      fileSize: 1024,
    },
  });
