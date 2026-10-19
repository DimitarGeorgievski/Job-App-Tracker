import {
  Inject,
  Injectable,
  OnModuleDestroy,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DependencyChecks, HealthDependencies } from './health.type';
import { RedisService } from '../redis/redis.service';
import {
  POSTGRES_HEALTH_CHECK,
  PostgresHealthCheck,
} from './postgres-health.token';
import { APP_ENV } from '../config/app-env.token';
import { AppEnv } from '../config/env.schema';

@Injectable()
export class HealthService implements OnModuleDestroy {
  private inFlightCheck: Promise<DependencyChecks> | undefined;
  private shuttingDown = false;
  constructor(
    @Inject(APP_ENV) private readonly config: AppEnv,
    private readonly redisService: RedisService,
    @Optional()
    @Inject(POSTGRES_HEALTH_CHECK)
    private readonly postgresHealth?: PostgresHealthCheck,
  ) {}
  async checkReadiness(): Promise<{
    status: 'ok';
    dependencies: HealthDependencies;
  }> {
    if (this.shuttingDown) {
      throw new ServiceUnavailableException({
        status: 'error',
        reason: 'shutting_down',
      });
    }
    let check = this.inFlightCheck;
    if (!check) {
      check = this.performChecks();
      this.inFlightCheck = check;
    }
    let results: DependencyChecks;
    try {
      results = await check;
    } finally {
      if (this.inFlightCheck === check) {
        this.inFlightCheck = undefined;
      }
    }
    if (this.shuttingDown) {
      throw new ServiceUnavailableException({
        status: 'error',
        reason: 'shutting_down',
      });
    }
    const dependencies: HealthDependencies = {
      redis: results.redis ? 'connected' : 'unavailable',
    };
    if (results.postgres !== undefined) {
      dependencies.postgres = results.postgres ? 'connected' : 'unavailable';
    }
    if (Object.values(dependencies).some((status) => status !== 'connected')) {
      throw new ServiceUnavailableException({
        status: 'error',
        dependencies,
      });
    }
    return {
      status: 'ok',
      dependencies,
    };
  }
  onModuleDestroy(): void {
    this.shuttingDown = true;
  }
  private async performChecks(): Promise<DependencyChecks> {
    const redisCheck = this.checkRedis();
    if (this.config.APP_ROLE === 'evaluator') {
      return {
        redis: await redisCheck,
      };
    }
    if (!this.postgresHealth) {
      return {
        redis: await redisCheck,
        postgres: false,
      };
    }
    const [redis, postgres] = await Promise.all([
      redisCheck,
      this.checkPostgres(),
    ]);

    return { redis, postgres };
  }
  private async checkRedis(): Promise<boolean> {
    try {
      return await this.withTimeout(this.redisService.isHealthy(), 'Redis');
    } catch {
      return false;
    }
  }
  private async checkPostgres(): Promise<boolean> {
    if (!this.postgresHealth) {
      return true;
    }
    try {
      return await this.withTimeout(
        this.postgresHealth.isHealthy(),
        'PostgreSQL',
      );
    } catch {
      return false;
    }
  }
  private async withTimeout<T>(
    operation: Promise<T>,
    dependency: string,
  ): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`${dependency} health check timed out`));
      }, 1000);
    });
    try {
      return await Promise.race([operation, timeout]);
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    }
  }
}
