import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { JobType } from 'generated/prisma/enums';

export class CreateJobDto {
  @IsString()
  @MinLength(2)
  title: string;
  @IsString()
  @MinLength(10)
  description: string;
  @IsOptional()
  @IsString()
  location?: string;
  @IsNumber()
  companyId: number;
  @IsEnum(JobType)
  jobType: JobType;
}