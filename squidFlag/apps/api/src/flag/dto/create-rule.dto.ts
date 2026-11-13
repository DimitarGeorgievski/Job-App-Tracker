import { z } from 'zod';

export const CreateRuleDto = z.object({
  priority: z.number().int().positive(),
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
});

export type CreateRuleDto = z.infer<typeof CreateRuleDto>;
