import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  Headers,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { type Response } from 'express';
import { CredentialsDto } from './dto/Credentials.dto';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { createCompanyDto } from './dto/create-company.dto';
import { type FastifyReply } from 'fastify';
import '@fastify/cookie';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  registerUser(@Body() userData: CreateUserDto) {
    return this.authService.registerUser(userData);
  }
  @Post('register/company')
  registerCompany(@Body() data: createCompanyDto) {
    return this.authService.registerCompany(data);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async loginUser(
    @Body() credentials: CredentialsDto,
    @Res() res: FastifyReply,
  ) {
    const { user, token, refreshToken } =
      await this.authService.loginUser(credentials);
    const isProd = process.env.NODE_ENV === 'production';
    res.header('Set-Cookie', [
      `access-token=${token}; HttpOnly; SameSite=Lax; Max-Age=${60 * 60}; Path=/${isProd ? '; Secure' : ''}`,
      `refresh-token=${refreshToken}; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}; Path=/${isProd ? '; Secure' : ''}`,
    ]);
    res.send(user);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('refresh-token')
  async refreshAccessToken(
    @Res() res: FastifyReply,
    @Headers('refresh-token') refreshToken: string,
  ) {
    const { token } = await this.authService.refreshAccessToken(refreshToken);
    res.header('access-token', token);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  logoutUser(@Headers('refresh-token') refreshToken: string) {
    return this.authService.logoutUser(refreshToken);
  }
}
