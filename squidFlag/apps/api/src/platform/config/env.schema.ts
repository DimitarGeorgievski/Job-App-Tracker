import { z } from 'zod';

const nodeEnvSchema = z.enum(['development', 'test', 'staging', 'production']);
const appRoleSchema = z.enum(['all', 'control', 'evaluator']);
const baseEnvSchema = z.object({
  NODE_ENV: nodeEnvSchema.default('development'),
  APP_ROLE: appRoleSchema,
  HOST: z.string().trim().min(1).default('localhost'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  REDIS_URL: z
    .url('REDIS_URL must be a valid URL')
    .refine(
      (value) => value.startsWith('redis://') || value.startsWith('rediss://'),
      'REDIS_URL must use redis:// or rediss://',
    ),
  DATABASE_URL: z.string().trim().min(1).optional(),
  CORS_ORIGINS: z.string().optional(),
});
const databaseUrlSchema = z
  .url('DATABASE_URL must be a valid URL')
  .refine(
    (value) =>
      value.startsWith('postgresql://') || value.startsWith('postgres://'),
    'DATABASE_URL must use PostgreSQL',
  );
const roleEnvSchema = z.discriminatedUnion('APP_ROLE', [
  baseEnvSchema.extend({
    APP_ROLE: z.literal('all'),
    DATABASE_URL: databaseUrlSchema,
    CORS_ORIGINS: z.string().trim().min(1),
  }),
  baseEnvSchema.extend({
    APP_ROLE: z.literal('control'),
    DATABASE_URL: databaseUrlSchema,
    CORS_ORIGINS: z.string().trim().min(1),
  }),
  baseEnvSchema.extend({
    APP_ROLE: z.literal('evaluator'),
    DATABASE_URL: databaseUrlSchema.optional(),
  }),
]);
function validateProductionConfig(env: z.infer<typeof roleEnvSchema>) {
  if (env.NODE_ENV !== 'production') return;
  if (!env.REDIS_URL.startsWith('rediss://'))
    throw new Error('Production requires a TLS-enabled REDIS_URL');
  if (!env.CORS_ORIGINS?.trim())
    throw new Error('CORS_ORIGINS is required in production');
  if (env.CORS_ORIGINS.split(',').some((origin) => origin.trim() === '*'))
    throw new Error('Wildcard CORS origins are not allowed in production');
}
function parseCorsOrigins(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value.split(',').map((origin) => {
    const normalizedOrigin = origin.trim();
    let url: URL;
    try {
      url = new URL(normalizedOrigin);
    } catch {
      throw new Error('CORS_ORIGINS must contain valid URLs');
    }
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.origin !== normalizedOrigin
    )
      throw new Error(
        'CORS_ORIGINS must contain origins without paths or trailing slashes',
      );
    return url.origin;
  });
}
export function parseEnv(env: Record<string, string | undefined>) {
  const normalizedEnv = {
    ...env,
    APP_ROLE: env.APP_ROLE ?? 'all',
  };
  const baseResult = baseEnvSchema.safeParse(normalizedEnv);
  if (!baseResult.success) {
    const details = baseResult.error.issues.map((issue) => {
      const variable = issue.path[0];
      const name = typeof variable === 'string' ? variable : 'environment';
      return `${name}: ${issue.message}`;
    });
    throw new Error(
      `Invalid environment configuration:\n${details.join('\n')}`,
    );
  }
  const roleResult = roleEnvSchema.safeParse(baseResult.data);
  if (!roleResult.success) {
    const details = roleResult.error.issues.map((issue) => {
      const variable = issue.path[0];
      const name = typeof variable === 'string' ? variable : 'environment';
      return `${name}: ${issue.message}`;
    });
    throw new Error(
      `Invalid environment configuration:\n${details.join('\n')}`,
    );
  }
  const parsedEnv = roleResult.data;
  validateProductionConfig(parsedEnv);
  const corsOrigins = parseCorsOrigins(parsedEnv.CORS_ORIGINS);
  return {
    ...parsedEnv,
    CORS_ORIGINS: corsOrigins,
  };
}

export type AppEnv = ReturnType<typeof parseEnv>;
export type NodeEnv = z.infer<typeof nodeEnvSchema>;
export type AppRole = z.infer<typeof appRoleSchema>;
