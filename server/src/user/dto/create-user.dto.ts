import {
  IsEmail,
  IsEnum,
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
  @MinLength(2)
  name: string;
  @IsString()
  @MinLength(6)
  password: string;
}
