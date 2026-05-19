import {
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Role } from 'generated/prisma/enums';

export class CreateUserDto {
  @IsEmail()
  email: string;
  @IsEnum(Role)
  role: Role
  @IsString()
  firstName: string;
  @IsString()
  lastName: string;
  @IsOptional()
  @IsNumber()
  phoneNumber: number;
  @IsString()
  @MinLength(6)
  password: string;
}
