import { IsOptional, IsString, MinLength } from 'class-validator';

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
}