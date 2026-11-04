import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from './public.decorator';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { ACCESS_COOKIE } from '../auth.constants';
import { Inject } from '@nestjs/common';
import { APP_ENV } from '../../platform/config/app-env.token';
import type { AppEnv } from '../../platform/config/env.schema';

interface RequestWithCookies {
  cookies?: Record<string, string>;
  user?: JwtPayload;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(APP_ENV) private readonly config: AppEnv,
    private readonly reflector: Reflector,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      context.getHandler
        ? [context.getHandler(), context.getClass()]
        : [context.getClass()],
    );
    if (isPublic !== undefined && isPublic) {
      return true;
    }
    const request = context.switchToHttp().getRequest<RequestWithCookies>();
    const accessToken = request.cookies?.[ACCESS_COOKIE];
    if (!accessToken) {
      throw new UnauthorizedException('Access token not found');
    }
    try {
      const jwtSecret = this.config.JWT_SECRET;
      if (!jwtSecret) {
        throw new UnauthorizedException('JWT secret not configured');
      }
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        accessToken,
        {
          secret: jwtSecret,
        },
      );
      request.user = payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
    return true;
  }
}
