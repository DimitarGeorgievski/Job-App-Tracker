import {
  Inject,
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { APP_ENV } from '../../platform/config/app-env.token';
import type { AppEnv } from '../../platform/config/env.schema';

interface RequestWithHeaders {
  method: string;
  headers: { origin?: string; referer?: string };
}

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(@Inject(APP_ENV) private readonly config: AppEnv) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithHeaders>();
    const method = request.method;
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return true;
    }
    const origin = request.headers.origin;
    let originToCheck = origin;
    if (!originToCheck) {
      const referer = request.headers.referer;
      if (!referer) {
        throw new ForbiddenException('Missing Origin or Referer header');
      }
      try {
        const url = new URL(referer);
        originToCheck = url.origin;
      } catch {
        throw new ForbiddenException('Invalid Referer header');
      }
    }

    const corsOrigins = this.config.CORS_ORIGINS ?? [];

    if (!corsOrigins.includes(originToCheck)) {
      throw new ForbiddenException('Invalid origin');
    }

    return true;
  }
}
