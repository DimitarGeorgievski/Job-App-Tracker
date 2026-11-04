import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import { Public } from '../../auth/guards/public.decorator';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}
  @Public()
  @Get('live')
  healthCheck() {
    return { status: 'ok' as const };
  }
  @Public()
  @Get('ready')
  readinessCheck() {
    return this.healthService.checkReadiness();
  }
}
