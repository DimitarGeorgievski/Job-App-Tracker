import {IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateApplicationDto {
  @IsNumber()
  jobId: number;
  @IsNumber()
  userId: number;
  @IsString()
  @IsOptional()
  notes?: string;
  @IsString()
  @IsOptional()
  coverLetter?: string;
}