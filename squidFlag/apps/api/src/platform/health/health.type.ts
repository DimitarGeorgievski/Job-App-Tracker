export type DependencyStatus = 'connected' | 'unavailable';
export type HealthDependencies = {
  redis: DependencyStatus;
  postgres?: DependencyStatus;
};
export type DependencyChecks = {
  redis: boolean;
  postgres?: boolean;
};
