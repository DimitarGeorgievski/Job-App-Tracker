import { z } from 'zod';

export const _CreateFlagDto = z.object({
  name: z.string().min(1),
  key: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    .max(63),
  defaultValue: z.boolean(),
  enabled: z.boolean(),
  rules: z
    .array(
      z.object({
        priority: z.number().int(),
        conditions: z.array(
          z.object({
            attribute: z.string(),
            operator: z.enum([
              'equals',
              'notEquals',
              'in',
              'notIn',
              'startsWith',
              'endsWith',
              'contains',
              'gt',
              'gte',
              'lt',
              'lte',
              'exists',
              'versionEquals',
              'versionGt',
              'versionGte',
              'versionLt',
              'versionLte',
            ]),
            value: z.unknown(),
          }),
        ),
        value: z.boolean(),
      }),
    )
    .optional(),
});

export type CreateFlagDto = z.infer<typeof _CreateFlagDto>;
