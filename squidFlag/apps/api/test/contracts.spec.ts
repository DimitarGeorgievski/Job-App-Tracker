import { describe, expect, it } from '@jest/globals';
import {
  snapshotSchema,
  flagSnapshotSchema,
  flagRuleSchema,
  conditionSchema,
  parseSnapshot,
  UnsupportedSchemaVersionError,
  uuidSchema,
  environmentKeySchema,
} from '@squidflag/contracts';

const validSnapshot = {
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
      rules: [
        {
          id: '0197f8c0-1234-7abc-8def-0123456789ab',
          priority: 10,
          conditions: [
            { operator: 'equals', attribute: 'country', value: 'MK' },
          ],
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

  it('rejects invalid UUIDs', () => {
    expect(
      snapshotSchema.safeParse({
        ...validSnapshot,
        environment: {
          ...validSnapshot.environment,
          id: 'not-a-uuid',
        },
      }).success,
    ).toBe(false);
  });
});

describe('flagSnapshotSchema', () => {
  it('rejects a non-boolean default value', () => {
    expect(
      flagSnapshotSchema.safeParse({
        type: 'BOOLEAN',
        enabled: true,
        defaultValue: 'false',
        rules: [],
      }).success,
    ).toBe(false);
  });

  it('rejects unsupported flag types', () => {
    expect(
      flagSnapshotSchema.safeParse({
        type: 'STRING',
        enabled: true,
        defaultValue: false,
        rules: [],
      }).success,
    ).toBe(false);
  });

  it('rejects invalid rule structure', () => {
    expect(
      flagSnapshotSchema.safeParse({
        type: 'BOOLEAN',
        enabled: true,
        defaultValue: false,
        rules: [
          {
            id: '0197f8c0-1234-7abc-8def-0123456789ab',
            priority: 10,
            conditions: 'not-an-array',
            value: true,
          },
        ],
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
        conditions: [
          { operator: 'matches', attribute: 'country', value: 'MK' },
        ],
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

  it('accepts empty conditions array (catch-all rule)', () => {
    const catchAllRule = {
      ...validRule,
      conditions: [],
    };
    expect(flagRuleSchema.safeParse(catchAllRule).success).toBe(true);
  });
});

describe('conditionSchema', () => {
  it('accepts equals condition', () => {
    expect(
      conditionSchema.safeParse({
        operator: 'equals',
        attribute: 'country',
        value: 'MK',
      }).success,
    ).toBe(true);
  });

  it('accepts in condition with array', () => {
    expect(
      conditionSchema.safeParse({
        operator: 'in',
        attribute: 'country',
        value: ['MK', 'AL'],
      }).success,
    ).toBe(true);
  });

  it('rejects in condition with empty array', () => {
    expect(
      conditionSchema.safeParse({
        operator: 'in',
        attribute: 'country',
        value: [],
      }).success,
    ).toBe(false);
  });

  it('accepts exists condition', () => {
    expect(
      conditionSchema.safeParse({
        operator: 'exists',
        attribute: 'betaToken',
        value: true,
      }).success,
    ).toBe(true);
  });

  it('accepts versionEquals condition', () => {
    expect(
      conditionSchema.safeParse({
        operator: 'versionEquals',
        attribute: 'appVersion',
        value: '2.1.0',
      }).success,
    ).toBe(true);
  });

  it('rejects versionEquals with invalid semver', () => {
    expect(
      conditionSchema.safeParse({
        operator: 'versionEquals',
        attribute: 'appVersion',
        value: 'not-semver',
      }).success,
    ).toBe(false);
  });

  it('rejects unknown operator', () => {
    expect(
      conditionSchema.safeParse({
        operator: 'unknown',
        attribute: 'country',
        value: 'MK',
      }).success,
    ).toBe(false);
  });

  it('rejects missing attribute', () => {
    expect(
      conditionSchema.safeParse({
        operator: 'equals',
        value: 'MK',
      }).success,
    ).toBe(false);
  });

  it('rejects wrong value type for operator', () => {
    expect(
      conditionSchema.safeParse({
        operator: 'gt',
        attribute: 'age',
        value: 'not-a-number',
      }).success,
    ).toBe(false);
  });
});

describe('parseSnapshot', () => {
  it('parses valid JSON snapshot', () => {
    const json = JSON.stringify(validSnapshot);
    const result = parseSnapshot(json);
    expect(result.schemaVersion).toBe(1);
    expect(result.environment.key).toBe('production');
  });

  it('throws UnsupportedSchemaVersionError for version 0', () => {
    const json = JSON.stringify({ ...validSnapshot, schemaVersion: 0 });
    expect(() => parseSnapshot(json)).toThrow(UnsupportedSchemaVersionError);
    expect(() => parseSnapshot(json)).toThrow('Unsupported schema version: 0');
  });

  it('throws UnsupportedSchemaVersionError for version 2', () => {
    const json = JSON.stringify({ ...validSnapshot, schemaVersion: 2 });
    expect(() => parseSnapshot(json)).toThrow(UnsupportedSchemaVersionError);
    expect(() => parseSnapshot(json)).toThrow('Unsupported schema version: 2');
  });

  it('throws for invalid JSON', () => {
    expect(() => parseSnapshot('not json')).toThrow();
  });
});

describe('uuidSchema', () => {
  it('accepts valid UUIDv7', () => {
    expect(
      uuidSchema.safeParse('0197f8c0-1234-7abc-8def-0123456789ab').success,
    ).toBe(true);
  });

  it('rejects invalid UUID format', () => {
    expect(uuidSchema.safeParse('not-a-uuid').success).toBe(false);
  });
});

describe('environmentKeySchema / flagKeySchema', () => {
  it('accepts valid kebab-case keys', () => {
    expect(environmentKeySchema.safeParse('production').success).toBe(true);
    expect(environmentKeySchema.safeParse('staging-env').success).toBe(true);
    expect(environmentKeySchema.safeParse('my-env-123').success).toBe(true);
  });

  it('rejects invalid keys', () => {
    expect(environmentKeySchema.safeParse('Production').success).toBe(false);
    expect(environmentKeySchema.safeParse('prod_Env').success).toBe(false);
    expect(environmentKeySchema.safeParse('').success).toBe(false);
    expect(environmentKeySchema.safeParse('a'.repeat(64)).success).toBe(false);
  });
});
