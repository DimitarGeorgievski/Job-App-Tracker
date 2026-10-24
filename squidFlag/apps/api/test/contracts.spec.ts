import { describe, expect, it } from '@jest/globals';
import {
  booleanFlagSnapshotSchema,
  flagRuleSchema,
  snapshotSchema,
} from '@squidflag/contracts';

const validSnapshot = {
  schemaVersion: 1,
  environment: {
    id: 'env_01',
    key: 'production',
    version: 42,
    draftRevision: 17,
  },
  flags: {
    'new-checkout': {
      type: 'BOOLEAN',
      enabled: true,
      defaultValue: false,
      rules: [
        {
          id: 'rule_01',
          priority: 10,
          conditions: {
            country: {
              operator: 'equals',
              value: 'MK',
            },
          },
          value: true,
        },
      ],
    },
    'maintenance-banner': {
      type: 'BOOLEAN',
      enabled: false,
      defaultValue: false,
      rules: [],
    },
  },
};
describe('snapshotSchema', () => {
  it('accepts a valid snapshot', () => {
    expect(snapshotSchema.safeParse(validSnapshot).success).toBe(true);
  });
  it('rejects unsupported schema versions', () => {
    expect(
      snapshotSchema.safeParse({
        ...validSnapshot,
        schemaVersion: 2,
      }).success,
    ).toBe(false);
  });
  it('rejects invalid environment keys', () => {
    expect(
      snapshotSchema.safeParse({
        ...validSnapshot,
        environment: {
          ...validSnapshot.environment,
          key: 'Production Environment',
        },
      }).success,
    ).toBe(false);
  });
  it('rejects non-positive snapshot versions', () => {
    expect(
      snapshotSchema.safeParse({
        ...validSnapshot,
        environment: {
          ...validSnapshot.environment,
          version: 0,
        },
      }).success,
    ).toBe(false);
  });
  it('rejects unknown snapshot properties', () => {
    expect(
      snapshotSchema.safeParse({
        ...validSnapshot,
        unexpected: true,
      }).success,
    ).toBe(false);
  });
});
describe('booleanFlagSnapshotSchema', () => {
  it('rejects a non-boolean default value', () => {
    expect(
      booleanFlagSnapshotSchema.safeParse({
        type: 'BOOLEAN',
        enabled: true,
        defaultValue: 'false',
        rules: [],
      }).success,
    ).toBe(false);
  });
  it('rejects unsupported flag types', () => {
    expect(
      booleanFlagSnapshotSchema.safeParse({
        type: 'STRING',
        enabled: true,
        defaultValue: false,
        rules: [],
      }).success,
    ).toBe(false);
  });
});
describe('flagRuleSchema', () => {
  const validRule = validSnapshot.flags['new-checkout'].rules[0];
  it('accepts a valid rule', () => {
    expect(flagRuleSchema.safeParse(validRule).success).toBe(true);
  });
  it('rejects unsupported condition operators', () => {
    expect(
      flagRuleSchema.safeParse({
        ...validRule,
        conditions: {
          country: {
            operator: 'contains',
            value: 'MK',
          },
        },
      }).success,
    ).toBe(false);
  });
  it('rejects non-integer priorities', () => {
    expect(
      flagRuleSchema.safeParse({
        ...validRule,
        priority: 1.5,
      }).success,
    ).toBe(false);
  });
  it('rejects unknown rule properties', () => {
    expect(
      flagRuleSchema.safeParse({
        ...validRule,
        unexpected: true,
      }).success,
    ).toBe(false);
  });
});
