import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateApplicationDto {
  @IsInt()
  userId: number;
  @IsInt()
  jobId: number;
  @IsOptional()
  @IsString()
  notes?: string;
}