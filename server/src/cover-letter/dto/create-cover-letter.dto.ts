import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCoverLetterDto {
  @IsOptional()
  @IsString()
  @MinLength(10)
  content?: string;
  @IsOptional()
  @IsString()
  fileURL?: string;
  @IsOptional()
  @IsString()
  filePublicId?: string;
  @IsOptional()
  result?: string;
  @Type(() => Number)
  @IsInt()
  applicationId: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;
}