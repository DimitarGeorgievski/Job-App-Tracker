import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  Headers,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CredentialsDto } from './dto/Credentials.dto';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { createCompanyDto } from './dto/create-company.dto';
import { type FastifyRequest, type FastifyReply } from 'fastify';
import '@fastify/cookie';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async registerUser(@Req() req: FastifyRequest) {
    const file = await req.file();
    const data = {
      email: (file?.fields.email as any)?.value,
      password: (file?.fields.password as any)?.value,
      firstName: (file?.fields.firstName as any)?.value,
      lastName: (file?.fields.lastName as any)?.value,
      phoneNumber: (file?.fields.phoneNumber as any)?.value,
      role: (file?.fields.role as any)?.value,
    } as CreateUserDto;
    return this.authService.registerUser(data, file ?? null);
  }
  @Post('register/company')
  async registerCompany(@Req() req: FastifyRequest) {
    const file = await req.file();
    const data = {
      companyName: (file?.fields.companyName as any)?.value,
      industry: (file?.fields.industry as any)?.value,
      description: (file?.fields.description as any)?.value,
      location: (file?.fields.location as any)?.value,
      website: (file?.fields.website as any)?.value,
      email: (file?.fields.email as any)?.value,
      password: (file?.fields.password as any)?.value,
    } as createCompanyDto;
    return this.authService.registerCompany(data, file ?? null);
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
