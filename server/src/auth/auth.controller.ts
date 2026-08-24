import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  Headers,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CredentialsDto } from './dto/Credentials.dto';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { createCompanyDto } from './dto/create-company.dto';
import { type FastifyRequest, type FastifyReply } from 'fastify';
import '@fastify/cookie';
import { seconds, Throttle } from '@nestjs/throttler';

@Throttle({ default: { ttl: seconds(300), limit: 10 } })
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
    res.setCookie('access-token', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60,
      secure: isProd,
    });
    res.setCookie('refresh-token', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      secure: isProd,
    });
    res.send(user);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('refresh-token')
  async refresh(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    const refreshTokenFromCookies = req.cookies['refresh-token'];
    if (!refreshTokenFromCookies) {
      throw new UnauthorizedException('Refresh token missing');
    }
    const { accessToken, refreshToken } =
      await this.authService.refreshAccessToken(refreshTokenFromCookies);
    res.setCookie('access-token', accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60,
    });
    res.setCookie('refresh-token', refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    res.send();
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logoutUser(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    const refreshToken = req.cookies?.['refresh-token'];
    if (refreshToken) {
      await this.authService.logoutUser(refreshToken);
    }
    res.clearCookie('access-token');
    res.clearCookie('refresh-token');
    res.send();
  }
}
