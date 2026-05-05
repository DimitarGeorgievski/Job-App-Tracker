import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateApplicationDto {
  @IsInt()
  userId: number;
  @IsInt()
  jobId: number;
  @IsInt()
  analyticsId: number;
  @IsInt()
  coverLetterId: number;
  @IsOptional()
  @IsString()
  notes?: string;
}