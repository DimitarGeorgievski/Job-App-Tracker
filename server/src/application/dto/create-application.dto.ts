import { Type } from 'class-transformer';
import {IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateApplicationDto {
  @Type(() => Number)
  @IsNumber()
  jobId: number;
  @Type(() => Number)
  @IsNumber()
  userId: number;
  @IsString()
  @IsOptional()
  notes?: string;
  @IsString()
  @IsOptional()
  coverLetter?: string;
}