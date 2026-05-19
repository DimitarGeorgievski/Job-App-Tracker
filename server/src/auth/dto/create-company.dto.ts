import {
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsStrongPassword,
  Length,
} from 'class-validator';
import { Role } from 'generated/prisma/enums';

export class createCompanyDto {
  @IsStrongPassword()
  @IsString()
  password: string;
  @IsEmail()
  @IsString()
  email: string;
  @IsString()
  @Length(0, 30)
  companyName: string;
  @IsString()
  @Length(0, 100)
  description: string;
  @IsString()
  @Length(0, 30)
  location: string;
  @IsString()
  @Length(0, 30)
  industry: string;
  @IsOptional()
  @IsString()
  website: string;
  @IsNumber()
  @IsOptional()
  phoneNumber: number;
  @IsOptional()
  @IsEnum(Role)
  role: Role;
}
