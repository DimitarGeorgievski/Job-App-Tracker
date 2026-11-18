import { z } from 'zod';

export const SnapshotPayloadDto = z.object({
  enabled: z.boolean(),
  defaultValue: z.boolean(),
  rules: z.array(
    z.object({
      id: z.string(),
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
      result: z.boolean(),
    }),
  ),
});

export const EnvironmentSnapshotPayloadDto = z.object({
  flags: z.array(
    z.object({
      flagId: z.string(),
      enabled: z.boolean(),
      defaultValue: z.boolean(),
      rules: z.array(
        z.object({
          id: z.string(),
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
          result: z.boolean(),
        }),
      ),
    }),
  ),
});

export type SnapshotPayload = z.infer<typeof SnapshotPayloadDto>;
export type EnvironmentSnapshotPayload = z.infer<
  typeof EnvironmentSnapshotPayloadDto
>;
