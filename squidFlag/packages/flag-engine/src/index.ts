import type { FlagRule, RuleConditions } from '@squidflag/contracts';

export interface EvaluationContext {
  attributes: Record<string, string>;
}
export interface FlagEvaluationInput {
  enabled: boolean;
  defaultValue: boolean;
  rules: FlagRule[];
  context: EvaluationContext;
}
export function evaluateBooleanFlag({
  enabled,
  defaultValue,
  rules,
  context,
}: FlagEvaluationInput): boolean {
  if (!enabled) {
    return false;
  }
  const orderedRules = [...rules].sort(
    (a, b) => a.priority - b.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  for (const rule of orderedRules) {
    if (matchesConditions(rule.conditions, context.attributes)) {
      return rule.value;
    }
  }
  return defaultValue;
}
function matchesConditions(
  conditions: RuleConditions,
  attributes: Record<string, string>,
): boolean {
  for (const [attribute, condition] of Object.entries(conditions)) {
    switch (condition.operator) {
      case 'equals':
        if (attributes[attribute] !== condition.value) {
          return false;
        }
        break;
    }
  }
  return true;
}
