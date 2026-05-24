import { IsDateString, IsNumber, IsString } from "class-validator";

export class CreateExperienceDto {
  @IsDateString()
  start: string;
  @IsDateString()
  end: string;
  @IsString()
  title: string;
  @IsString()
  description: string;
  @IsString()
  location: string;
  @IsNumber()
  companyId: number;
}