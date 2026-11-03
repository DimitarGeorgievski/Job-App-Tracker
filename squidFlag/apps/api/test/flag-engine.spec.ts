import { describe, expect, it } from '@jest/globals';
import { evaluate, evaluateAll } from '@squidflag/flag-engine';
import type {
  Snapshot,
  FlagRule,
  EvaluationContext,
} from '@squidflag/contracts';

const mkRule: FlagRule = {
  id: '0197f8c0-1234-7abc-8def-0123456789ab',
  priority: 10,
  conditions: [{ operator: 'equals', attribute: 'country', value: 'MK' }],
  value: true,
};

const deRule: FlagRule = {
  id: '0197f8c0-1234-7abc-8def-0123456789ac',
  priority: 20,
  conditions: [{ operator: 'equals', attribute: 'country', value: 'DE' }],
  value: false,
};

const premiumRule: FlagRule = {
  id: '0197f8c0-1234-7abc-8def-0123456789ad',
  priority: 5,
  conditions: [
    { operator: 'equals', attribute: 'country', value: 'MK' },
    { operator: 'equals', attribute: 'plan', value: 'premium' },
  ],
  value: true,
};

const snapshot: Snapshot = {
  schemaVersion: 1,
  environment: {
    id: '0197f8c0-1234-7abc-8def-012345678900',
    key: 'production',
    version: 42,
    draftRevision: 17,
  },
  flags: {
    'new-checkout': {
      type: 'BOOLEAN',
      enabled: true,
      defaultValue: false,
      rules: [mkRule, deRule],
    },
    'premium-feature': {
      type: 'BOOLEAN',
      enabled: true,
      defaultValue: false,
      rules: [premiumRule],
    },
    'maintenance-banner': {
      type: 'BOOLEAN',
      enabled: false,
      defaultValue: false,
      rules: [],
    },
  },
};

describe('evaluate', () => {
  it('returns disabled when flag is disabled', () => {
    const result = evaluate(snapshot, { country: 'MK' }, 'maintenance-banner');
    expect(result).toEqual({
      value: false,
      reason: 'disabled',
      ruleId: undefined,
    });
  });

  it('evaluates rules by priority, then by id (array order assumed pre-sorted)', () => {
    const result = evaluate(snapshot, { country: 'MK' }, 'new-checkout');
    expect(result).toEqual({
      value: true,
      reason: 'rule-match',
      ruleId: mkRule.id,
    });
  });

  it('returns the value of the first matching rule', () => {
    const result = evaluate(snapshot, { country: 'MK' }, 'new-checkout');
    expect(result.value).toBe(true);
    expect(result.reason).toBe('rule-match');
    expect(result.ruleId).toBe(mkRule.id);
  });

  it('returns the default value when no rule matches', () => {
    const result = evaluate(snapshot, { country: 'US' }, 'new-checkout');
    expect(result).toEqual({
      value: false,
      reason: 'default-value',
      ruleId: undefined,
    });
  });

  it('matches rules only when all their conditions match', () => {
    const context: EvaluationContext = { country: 'MK', plan: 'free' };
    const result = evaluate(snapshot, context, 'premium-feature');
    expect(result).toEqual({
      value: false,
      reason: 'default-value',
      ruleId: undefined,
    });
  });

  it('matches when all conditions match', () => {
    const context: EvaluationContext = { country: 'MK', plan: 'premium' };
    const result = evaluate(snapshot, context, 'premium-feature');
    expect(result).toEqual({
      value: true,
      reason: 'rule-match',
      ruleId: premiumRule.id,
    });
  });

  it('handles in operator', () => {
    const inRule: FlagRule = {
      id: '0197f8c0-1234-7abc-8def-0123456789ae',
      priority: 1,
      conditions: [
        { operator: 'in', attribute: 'country', value: ['MK', 'AL', 'RS'] },
      ],
      value: true,
    };
    const testSnapshot: Snapshot = {
      ...snapshot,
      flags: {
        'balkan-feature': {
          type: 'BOOLEAN',
          enabled: true,
          defaultValue: false,
          rules: [inRule],
        },
      },
    };
    expect(
      evaluate(testSnapshot, { country: 'MK' }, 'balkan-feature').value,
    ).toBe(true);
    expect(
      evaluate(testSnapshot, { country: 'AL' }, 'balkan-feature').value,
    ).toBe(true);
    expect(
      evaluate(testSnapshot, { country: 'US' }, 'balkan-feature').value,
    ).toBe(false);
  });

  it('handles notIn operator', () => {
    const notInRule: FlagRule = {
      id: '0197f8c0-1234-7abc-8def-0123456789af',
      priority: 1,
      conditions: [
        { operator: 'notIn', attribute: 'country', value: ['MK', 'AL'] },
      ],
      value: true,
    };
    const testSnapshot: Snapshot = {
      ...snapshot,
      flags: {
        'non-balkan': {
          type: 'BOOLEAN',
          enabled: true,
          defaultValue: false,
          rules: [notInRule],
        },
      },
    };
    expect(evaluate(testSnapshot, { country: 'US' }, 'non-balkan').value).toBe(
      true,
    );
    expect(evaluate(testSnapshot, { country: 'MK' }, 'non-balkan').value).toBe(
      false,
    );
  });

  it('handles startsWith operator', () => {
    const rule: FlagRule = {
      id: '0197f8c0-1234-7abc-8def-0123456789b0',
      priority: 1,
      conditions: [
        { operator: 'startsWith', attribute: 'userId', value: 'admin-' },
      ],
      value: true,
    };
    const testSnapshot: Snapshot = {
      ...snapshot,
      flags: {
        'admin-feature': {
          type: 'BOOLEAN',
          enabled: true,
          defaultValue: false,
          rules: [rule],
        },
      },
    };
    expect(
      evaluate(testSnapshot, { userId: 'admin-123' }, 'admin-feature').value,
    ).toBe(true);
    expect(
      evaluate(testSnapshot, { userId: 'user-123' }, 'admin-feature').value,
    ).toBe(false);
  });

  it('handles endsWith operator', () => {
    const rule: FlagRule = {
      id: '0197f8c0-1234-7abc-8def-0123456789b1',
      priority: 1,
      conditions: [
        { operator: 'endsWith', attribute: 'email', value: '@example.com' },
      ],
      value: true,
    };
    const testSnapshot: Snapshot = {
      ...snapshot,
      flags: {
        'example-user': {
          type: 'BOOLEAN',
          enabled: true,
          defaultValue: false,
          rules: [rule],
        },
      },
    };
    expect(
      evaluate(testSnapshot, { email: 'user@example.com' }, 'example-user')
        .value,
    ).toBe(true);
    expect(
      evaluate(testSnapshot, { email: 'user@other.com' }, 'example-user').value,
    ).toBe(false);
  });

  it('handles contains operator', () => {
    const rule: FlagRule = {
      id: '0197f8c0-1234-7abc-8def-0123456789b2',
      priority: 1,
      conditions: [
        { operator: 'contains', attribute: 'userAgent', value: 'Mobile' },
      ],
      value: true,
    };
    const testSnapshot: Snapshot = {
      ...snapshot,
      flags: {
        'mobile-feature': {
          type: 'BOOLEAN',
          enabled: true,
          defaultValue: false,
          rules: [rule],
        },
      },
    };
    expect(
      evaluate(
        testSnapshot,
        { userAgent: 'Mozilla Mobile Safari' },
        'mobile-feature',
      ).value,
    ).toBe(true);
    expect(
      evaluate(testSnapshot, { userAgent: 'Mozilla Desktop' }, 'mobile-feature')
        .value,
    ).toBe(false);
  });

  it('handles numeric gt/gte/lt/lte operators', () => {
    const rule: FlagRule = {
      id: '0197f8c0-1234-7abc-8def-0123456789b3',
      priority: 1,
      conditions: [
        { operator: 'gte', attribute: 'age', value: 18 },
        { operator: 'lt', attribute: 'age', value: 65 },
      ],
      value: true,
    };
    const testSnapshot: Snapshot = {
      ...snapshot,
      flags: {
        'adult-feature': {
          type: 'BOOLEAN',
          enabled: true,
          defaultValue: false,
          rules: [rule],
        },
      },
    };
    expect(evaluate(testSnapshot, { age: 25 }, 'adult-feature').value).toBe(
      true,
    );
    expect(evaluate(testSnapshot, { age: 17 }, 'adult-feature').value).toBe(
      false,
    );
    expect(evaluate(testSnapshot, { age: 65 }, 'adult-feature').value).toBe(
      false,
    );
  });

  it('handles exists operator', () => {
    const rule: FlagRule = {
      id: '0197f8c0-1234-7abc-8def-0123456789b4',
      priority: 1,
      conditions: [{ operator: 'exists', attribute: 'betaToken', value: true }],
      value: true,
    };
    const testSnapshot: Snapshot = {
      ...snapshot,
      flags: {
        'beta-feature': {
          type: 'BOOLEAN',
          enabled: true,
          defaultValue: false,
          rules: [rule],
        },
      },
    };
    expect(
      evaluate(testSnapshot, { betaToken: 'abc123' }, 'beta-feature').value,
    ).toBe(true);
    expect(evaluate(testSnapshot, {}, 'beta-feature').value).toBe(false);
  });

  it('handles version operators', () => {
    const rule: FlagRule = {
      id: '0197f8c0-1234-7abc-8def-0123456789b5',
      priority: 1,
      conditions: [
        { operator: 'versionGte', attribute: 'appVersion', value: '2.1.0' },
      ],
      value: true,
    };
    const testSnapshot: Snapshot = {
      ...snapshot,
      flags: {
        'v2-feature': {
          type: 'BOOLEAN',
          enabled: true,
          defaultValue: false,
          rules: [rule],
        },
      },
    };
    expect(
      evaluate(testSnapshot, { appVersion: '2.1.0' }, 'v2-feature').value,
    ).toBe(true);
    expect(
      evaluate(testSnapshot, { appVersion: '2.0.9' }, 'v2-feature').value,
    ).toBe(false);
    expect(
      evaluate(testSnapshot, { appVersion: '2.2.0' }, 'v2-feature').value,
    ).toBe(true);
  });

  it('throws for unknown flag key', () => {
    expect(() => evaluate(snapshot, {}, 'unknown-flag')).toThrow(
      'Flag unknown-flag not found in snapshot',
    );
  });
});
describe('evaluateAll', () => {
  it('evaluates all flags in snapshot', () => {
    const results = evaluateAll(snapshot, { country: 'MK', plan: 'premium' });
    expect(results['new-checkout']).toEqual({
      value: true,
      reason: 'rule-match',
      ruleId: mkRule.id,
    });
    expect(results['premium-feature']).toEqual({
      value: true,
      reason: 'rule-match',
      ruleId: premiumRule.id,
    });
    expect(results['maintenance-banner']).toEqual({
      value: false,
      reason: 'disabled',
      ruleId: undefined,
    });
  });
});
