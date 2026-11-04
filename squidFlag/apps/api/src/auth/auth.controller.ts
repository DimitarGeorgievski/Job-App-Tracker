import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Public } from './guards/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { loginDtoSchema, LoginDto } from './dto/login.dto';
import { registerDtoSchema, RegisterDto } from './dto/register.dto';
import type { FastifyReply, FastifyRequest } from 'fastify';

const authResponseExample = {
  user: {
    id: '018f1a2b-3c4d-7e8f-9a0b-1c2d3e4f5g6h',
    email: 'user@example.com',
  },
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  @Throttle({ long: { limit: 3, ttl: 3_600_000 } })
  @ApiOperation({ summary: 'Bootstrap registration (first user only)' })
  @ApiResponse({ status: 201, example: authResponseExample })
  @ApiResponse({ status: 409, description: 'Bootstrap already complete' })
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() body: RegisterDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const parsed = registerDtoSchema.parse(body);
    return this.authService.register(parsed, res);
  }

  @Post('login')
  @Public()
  @Throttle({ short: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, example: authResponseExample })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const parsed = loginDtoSchema.parse(body);
    return this.authService.login(parsed, res);
  }

  @Post('refresh')
  @Public()
  @Throttle({ short: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Refresh access and refresh tokens' })
  @ApiResponse({ status: 200, example: authResponseExample })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Res({ passthrough: true }) res: FastifyReply,
    @Req() req: FastifyRequest,
  ) {
    return this.authService.refresh(req.cookies?.['refresh_token'], res);
  }

  @Post('logout')
  @Public()
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 200, example: { ok: true } })
  @HttpCode(HttpStatus.OK)
  async logout(
    @Res({ passthrough: true }) res: FastifyReply,
    @Req() req: FastifyRequest,
  ) {
    return this.authService.logout(req.cookies?.['refresh_token'], res);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Get current user' })
  @ApiResponse({ status: 200, example: authResponseExample })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @HttpCode(HttpStatus.OK)
  me(@CurrentUser() user: { sub: string; email: string }) {
    return { user: { id: user.sub, email: user.email } };
  }
}
