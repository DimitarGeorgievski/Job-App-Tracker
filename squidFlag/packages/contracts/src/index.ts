import { z } from 'zod';

export const FLAG_TYPE = {
  BOOLEAN: 'BOOLEAN',
} as const;
export const flagTypeSchema = z.literal(FLAG_TYPE.BOOLEAN);
export const ruleConditionSchema = z
  .object({
    operator: z.literal('equals'),
    value: z.string(),
  })
  .strict();
export const ruleConditionsSchema = z.record(z.string().min(1), ruleConditionSchema);
export const flagRuleSchema = z
  .object({
    id: z.string().min(1),
    priority: z.number().int(),
    conditions: ruleConditionsSchema,
    value: z.boolean(),
  })
  .strict();
export const booleanFlagSnapshotSchema = z
  .object({
    type: flagTypeSchema,
    enabled: z.boolean(),
    defaultValue: z.boolean(),
    rules: z.array(flagRuleSchema),
  })
  .strict();
export const snapshotEnvironmentSchema = z
  .object({
    id: z.string().min(1),
    key: z
      .string()
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      .max(63),
    version: z.number().int().positive(),
    draftRevision: z.number().int().nonnegative(),
  })
  .strict();
export const snapshotSchema = z
  .object({
    schemaVersion: z.literal(1),
    environment: snapshotEnvironmentSchema,
    flags: z.record(
      z
        .string()
        .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
        .max(63),
      booleanFlagSnapshotSchema,
    ),
  })
  .strict();

export type FlagType = z.infer<typeof flagTypeSchema>;
export type RuleCondition = z.infer<typeof ruleConditionSchema>;
export type RuleConditions = z.infer<typeof ruleConditionsSchema>;
export type FlagRule = z.infer<typeof flagRuleSchema>;
export type BooleanFlagSnapshot = z.infer<typeof booleanFlagSnapshotSchema>;
export type SnapshotEnvironment = z.infer<typeof snapshotEnvironmentSchema>;
export type Snapshot = z.infer<typeof snapshotSchema>;
