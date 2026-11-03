import type {
  Condition,
  FlagSnapshot,
  Snapshot,
  EvaluationContext,
  EvaluationResult,
} from '@squidflag/contracts';

function compareSemver(a: string, b: string): number {
  const parse = (v: string): number[] => v.split('.').map(Number);
  const aParts = parse(a);
  const bParts = parse(b);
  const aMajor = aParts[0] ?? 0;
  const aMinor = aParts[1] ?? 0;
  const aPatch = aParts[2] ?? 0;
  const bMajor = bParts[0] ?? 0;
  const bMinor = bParts[1] ?? 0;
  const bPatch = bParts[2] ?? 0;
  if (aMajor !== bMajor) return aMajor - bMajor;
  if (aMinor !== bMinor) return aMinor - bMinor;
  return aPatch - bPatch;
}

function getContextValue(context: EvaluationContext, attribute: string): string | undefined {
  const value = context[attribute];
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function matchCondition(condition: Condition, context: EvaluationContext): boolean {
  const ctxValue = getContextValue(context, condition.attribute);
  const exists = ctxValue !== undefined;

  switch (condition.operator) {
    case 'exists':
      return condition.value === exists;
    case 'equals':
      return exists && ctxValue === condition.value;
    case 'notEquals':
      return exists && ctxValue !== condition.value;
    case 'in':
      return exists && condition.value.includes(ctxValue);
    case 'notIn':
      return exists && !condition.value.includes(ctxValue);
    case 'startsWith':
      return exists && ctxValue.startsWith(condition.value);
    case 'endsWith':
      return exists && ctxValue.endsWith(condition.value);
    case 'contains':
      return exists && ctxValue.includes(condition.value);
    case 'gt':
      return exists && Number(ctxValue) > condition.value;
    case 'gte':
      return exists && Number(ctxValue) >= condition.value;
    case 'lt':
      return exists && Number(ctxValue) < condition.value;
    case 'lte':
      return exists && Number(ctxValue) <= condition.value;
    case 'versionEquals':
      return exists && compareSemver(ctxValue, condition.value) === 0;
    case 'versionGt':
      return exists && compareSemver(ctxValue, condition.value) > 0;
    case 'versionGte':
      return exists && compareSemver(ctxValue, condition.value) >= 0;
    case 'versionLt':
      return exists && compareSemver(ctxValue, condition.value) < 0;
    case 'versionLte':
      return exists && compareSemver(ctxValue, condition.value) <= 0;
  }
}

function evaluateFlag(flag: FlagSnapshot, context: EvaluationContext): EvaluationResult {
  if (!flag.enabled) {
    return { value: false, reason: 'disabled', ruleId: undefined };
  }

  for (const rule of flag.rules) {
    const matches = rule.conditions.every((cond) => matchCondition(cond, context));
    if (matches) {
      return { value: rule.value, reason: 'rule-match', ruleId: rule.id };
    }
  }

  return { value: flag.defaultValue, reason: 'default-value', ruleId: undefined };
}

export function evaluate(
  snapshot: Snapshot,
  context: EvaluationContext,
  flagKey: string,
): EvaluationResult {
  const flag = snapshot.flags[flagKey];
  if (!flag) {
    throw new Error(`Flag ${flagKey} not found in snapshot`);
  }
  return evaluateFlag(flag, context);
}

export function evaluateAll(
  snapshot: Snapshot,
  context: EvaluationContext,
): Record<string, EvaluationResult> {
  const results: Record<string, EvaluationResult> = {};
  for (const flagKey of Object.keys(snapshot.flags)) {
    results[flagKey] = evaluateFlag(snapshot.flags[flagKey]!, context);
  }
  return results;
}

export type {
  Condition,
  FlagRule,
  FlagSnapshot,
  Snapshot,
  EvaluationContext,
  EvaluationResult,
} from '@squidflag/contracts';
