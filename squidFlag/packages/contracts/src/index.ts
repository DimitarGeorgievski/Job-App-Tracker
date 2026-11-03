import { z } from 'zod';

export const uuidSchema = z.string().uuid({ version: 'v7' });
export const environmentKeySchema = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  .max(63);
export const flagKeySchema = environmentKeySchema;
export const schemaVersionSchema = z.literal(1);
export const snapshotEnvironmentSchema = z
  .object({
    id: uuidSchema,
    key: environmentKeySchema,
    version: z.number().int().positive(),
    draftRevision: z.number().int().nonnegative(),
  })
  .strict();
const stringValue = z.string().min(1);
const stringArrayValue = z.array(z.string().min(1)).min(1);
const numberValue = z.number();
const booleanValue = z.boolean();
const versionValue = z.string().regex(/^\d+\.\d+\.\d+$/);
export const conditionSchema = z.discriminatedUnion('operator', [
  z.object({ operator: z.literal('equals'), attribute: stringValue, value: stringValue }),
  z.object({ operator: z.literal('notEquals'), attribute: stringValue, value: stringValue }),
  z.object({ operator: z.literal('in'), attribute: stringValue, value: stringArrayValue }),
  z.object({ operator: z.literal('notIn'), attribute: stringValue, value: stringArrayValue }),
  z.object({ operator: z.literal('startsWith'), attribute: stringValue, value: stringValue }),
  z.object({ operator: z.literal('endsWith'), attribute: stringValue, value: stringValue }),
  z.object({ operator: z.literal('contains'), attribute: stringValue, value: stringValue }),
  z.object({ operator: z.literal('gt'), attribute: stringValue, value: numberValue }),
  z.object({ operator: z.literal('gte'), attribute: stringValue, value: numberValue }),
  z.object({ operator: z.literal('lt'), attribute: stringValue, value: numberValue }),
  z.object({ operator: z.literal('lte'), attribute: stringValue, value: numberValue }),
  z.object({ operator: z.literal('exists'), attribute: stringValue, value: booleanValue }),
  z.object({ operator: z.literal('versionEquals'), attribute: stringValue, value: versionValue }),
  z.object({ operator: z.literal('versionGt'), attribute: stringValue, value: versionValue }),
  z.object({ operator: z.literal('versionGte'), attribute: stringValue, value: versionValue }),
  z.object({ operator: z.literal('versionLt'), attribute: stringValue, value: versionValue }),
  z.object({ operator: z.literal('versionLte'), attribute: stringValue, value: versionValue }),
]);
export type Condition = z.infer<typeof conditionSchema>;
export const flagRuleSchema = z
  .object({
    id: uuidSchema,
    priority: z.number().int(),
    conditions: z.array(conditionSchema),
    value: z.boolean(),
  })
  .strict();
export type FlagRule = z.infer<typeof flagRuleSchema>;
export const flagSnapshotSchema = z
  .object({
    type: z.literal('BOOLEAN'),
    enabled: z.boolean(),
    defaultValue: z.boolean(),
    rules: z.array(flagRuleSchema),
  })
  .strict();
export type FlagSnapshot = z.infer<typeof flagSnapshotSchema>;
export const flagsSchema = z.record(flagKeySchema, flagSnapshotSchema);
export type Flags = z.infer<typeof flagsSchema>;

export const snapshotSchema = z
  .object({
    schemaVersion: schemaVersionSchema,
    environment: snapshotEnvironmentSchema,
    flags: flagsSchema,
  })
  .strict();

export type SnapshotEnvironment = z.infer<typeof snapshotEnvironmentSchema>;
export type Snapshot = z.infer<typeof snapshotSchema>;

export class UnsupportedSchemaVersionError extends Error {
  constructor(public readonly version: number) {
    super(`Unsupported schema version: ${version}. This client supports schemaVersion 1.`);
    this.name = 'UnsupportedSchemaVersionError';
  }
}
export function parseSnapshot(json: string): Snapshot {
  const parsed = JSON.parse(json) as Record<string, unknown>;
  const version = parsed.schemaVersion;
  if (typeof version === 'number' && version !== 1) {
    throw new UnsupportedSchemaVersionError(version);
  }
  return snapshotSchema.parse(parsed);
}
export const evaluationContextSchema = z.record(z.string(), z.unknown()).default({});
export type EvaluationContext = z.infer<typeof evaluationContextSchema>;
export const evaluationResultSchema = z.object({
  value: z.boolean(),
  reason: z.enum(['rule-match', 'default-value', 'disabled']),
  ruleId: z.string().optional(),
});
export type EvaluationResult = z.infer<typeof evaluationResultSchema>;
export type FlagType = 'BOOLEAN';
export const FLAG_TYPE = {
  BOOLEAN: 'BOOLEAN' as const,
};
