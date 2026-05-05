import {
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateAnalyticsDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  score: number;
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];
  @IsInt()
  applicationId: number;
  @IsInt()
  companyId: number;
  @IsInt()
  coverLetterId: number;
}
