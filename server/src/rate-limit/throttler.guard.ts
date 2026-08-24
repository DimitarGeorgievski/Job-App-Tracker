import { Injectable, HttpStatus, HttpException } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return req.ip ?? req.connection?.remoteAddress;
  }

  protected async throwThrottlingException(): Promise<void> {
    throw new HttpException(
      { message: 'Too many requests', retryAfter: 60 },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}