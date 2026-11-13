import { z } from 'zod';

export const UpdateRuleDto = z.object({
  priority: z.number().int().positive().optional(),
  conditions: z
    .array(
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
    )
    .optional(),
  value: z.boolean().optional(),
});

export type UpdateRuleDto = z.infer<typeof UpdateRuleDto>;
