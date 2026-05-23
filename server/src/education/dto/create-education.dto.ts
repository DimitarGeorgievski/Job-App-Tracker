import { IsDateString, IsString } from "class-validator";

export class CreateEducationDto {
  @IsDateString()
  start: string;
  @IsDateString()
  end: string;
  @IsString()
  title: string;
  @IsString()
  department: string;
}