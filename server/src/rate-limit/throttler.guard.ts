import { Injectable, HttpStatus, HttpException } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ??
      req.ip ??
      req.connection?.remoteAddress;
    return ip;
  }

  protected async throwThrottlingException(): Promise<void> {
    throw new HttpException(
      { message: 'Too many requests', retryAfter: 300 },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}