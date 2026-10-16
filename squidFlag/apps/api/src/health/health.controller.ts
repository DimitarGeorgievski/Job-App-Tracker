import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { RedisService } from '../platform/redis/redis.service';

@Controller('health')
export class HealthController {
  constructor(private readonly redisService: RedisService) {}
  @Get('live')
  healthCheck() {
    return { status: 'ok' };
  }
  @Get('ready')
  async readinessCheck() {
    const redisHealthy = await this.redisService.isHealthy();
    if (!redisHealthy) {
      throw new ServiceUnavailableException({
        status: 'error',
        dependencies: {
          redis: 'unavailable',
        },
      });
    }
    return {
      status: 'ok',
      dependencies: {
        redis: 'connected',
      },
    };
  }
}
