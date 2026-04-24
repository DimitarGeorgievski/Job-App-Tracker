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
  processed?: boolean;
  @IsOptional()
  result?: string;
  @IsInt()
  applicationId: number;
  @IsInt()
  userId: number;
}