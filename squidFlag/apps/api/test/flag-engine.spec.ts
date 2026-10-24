import { describe, expect, it } from '@jest/globals';
import { evaluateBooleanFlag } from '@squidflag/flag-engine';
import type { FlagRule } from '@squidflag/contracts';

const rules: FlagRule[] = [
  {
    id: 'rule_mk',
    priority: 10,
    conditions: {
      country: {
        operator: 'equals',
        value: 'MK',
      },
    },
    value: true,
  },
  {
    id: 'rule_de',
    priority: 20,
    conditions: {
      country: {
        operator: 'equals',
        value: 'DE',
      },
    },
    value: false,
  },
];
describe('evaluateBooleanFlag', () => {
  it('returns false when the flag is disabled', () => {
    expect(
      evaluateBooleanFlag({
        enabled: false,
        defaultValue: true,
        rules,
        context: { attributes: { country: 'MK' } },
      }),
    ).toBe(false);
  });
  it('evaluates rules by priority, then by id', () => {
    const unorderedRules: FlagRule[] = [
      {
        id: 'rule_b',
        priority: 10,
        conditions: {
          country: { operator: 'equals', value: 'MK' },
        },
        value: false,
      },
      {
        id: 'rule_c',
        priority: 20,
        conditions: {
          country: { operator: 'equals', value: 'MK' },
        },
        value: true,
      },
      {
        id: 'rule_a',
        priority: 10,
        conditions: {
          country: { operator: 'equals', value: 'MK' },
        },
        value: true,
      },
    ];
    expect(
      evaluateBooleanFlag({
        enabled: true,
        defaultValue: false,
        rules: unorderedRules,
        context: { attributes: { country: 'MK' } },
      }),
    ).toBe(true);
  });
  it('returns the value of the first matching rule', () => {
    expect(
      evaluateBooleanFlag({
        enabled: true,
        defaultValue: false,
        rules,
        context: { attributes: { country: 'MK' } },
      }),
    ).toBe(true);
  });
  it('returns the default value when no rule matches', () => {
    expect(
      evaluateBooleanFlag({
        enabled: true,
        defaultValue: true,
        rules,
        context: { attributes: { country: 'US' } },
      }),
    ).toBe(true);
  });
  it('matches rules only when all their conditions match', () => {
    const multiConditionRule: FlagRule = {
      id: 'rule_multi',
      priority: 1,
      conditions: {
        country: { operator: 'equals', value: 'MK' },
        plan: { operator: 'equals', value: 'premium' },
      },
      value: true,
    };
    expect(
      evaluateBooleanFlag({
        enabled: true,
        defaultValue: false,
        rules: [multiConditionRule],
        context: {
          attributes: { country: 'MK', plan: 'free' },
        },
      }),
    ).toBe(false);
  });
});
