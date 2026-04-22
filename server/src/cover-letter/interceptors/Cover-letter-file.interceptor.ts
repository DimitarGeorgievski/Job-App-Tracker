import { BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const CoverLetterFileInterceptor = () =>
  FileInterceptor('file', {
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (req, file, callback) => {
      if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
        callback(null, true);
      } else {
        callback(new BadRequestException('Only PDF/DOC/DOCX allowed'), false);
      }
    },
  });
