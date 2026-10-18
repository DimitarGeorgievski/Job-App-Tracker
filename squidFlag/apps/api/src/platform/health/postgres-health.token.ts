export const POSTGRES_HEALTH_CHECK = Symbol('POSTGRES_HEALTH_CHECK');

export interface PostgresHealthCheck {
  isHealthy(): Promise<boolean>;
}
