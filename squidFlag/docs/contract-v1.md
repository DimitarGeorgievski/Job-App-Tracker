# SquidFlag Contract v1

> **Status:** Design document. Not yet implemented.
> **Authority:** This document defines the contract schemas for the MVP. Implementation in `@squidflag/contracts` must match exactly.

---

## Design Principles

1. **Strict on write, tolerant on read** — Writers must produce valid v1 payloads. Readers accept any `schemaVersion` they understand; they reject only unsupported `schemaVersion` values (not extra fields, not unknown enum values in future versions).
2. **Discriminated unions for conditions** — Each operator is a distinct Zod variant. This enables exhaustive matching in the engine and makes invalid condition shapes unrepresentable.
3. **Conditions as an array** — Ordered list of `{ attribute, operator, value }` tuples. Evaluation stops at first match.
4. **UUID v7 for all identifiers** — `id` fields are UUIDv7 strings. The engine treats them as opaque strings.
5. **No locale-dependent logic** — No `localeCompare`, no locale-aware sorting. Deterministic ordering only.
6. **Engine returns `{ value, reason, ruleId? }`** — `reason` is `'rule-match'` | `'default-value'` | `'disabled'`. No sorting on the hot path.

---

## 1. Snapshot Payload (R2)

The immutable JSON payload stored in R2 for each published environment.

### 1.1 Top-Level Structure

```json
{
  "schemaVersion": 1,
  "environment": { ... },
  "flags": { ... }
}
```

### 1.2 Schema Version

```ts
const schemaVersionSchema = z.literal(1);
```

- **Write:** Must be `1`.
- **Read:** If `schemaVersion !== 1`, reject with `UnsupportedSchemaVersionError`. Do not reject for extra fields.

### 1.3 Environment Block

```ts
const snapshotEnvironmentSchema = z
  .object({
    id: uuidSchema, // UUIDv7 string
    key: environmentKeySchema, // lowercase kebab-case, 1-63 chars
    version: z.number().int().positive(), // publication version (1, 2, 3...)
    draftRevision: z.number().int().nonnegative(), // captured draft revision
  })
  .strict();
```

### 1.4 Flags Object

Map from flag key → flag snapshot. Flag keys are lowercase kebab-case, 1-63 chars.

```ts
const flagsSchema = z.record(flagKeySchema, flagSnapshotSchema);
```

### 1.5 Boolean Flag Snapshot (MVP)

```ts
const flagSnapshotSchema = z
  .object({
    type: z.literal('BOOLEAN'),
    enabled: z.boolean(),
    defaultValue: z.boolean(),
    rules: z.array(flagRuleSchema),
  })
  .strict();
```

- `enabled: false` → engine returns `{ value: false, reason: 'disabled', ruleId: undefined }` without evaluating rules.
- `enabled: true` → evaluate rules in order; first match wins; if no match, return `defaultValue`.

### 1.6 Flag Rule

```ts
const flagRuleSchema = z
  .object({
    id: uuidSchema,
    priority: z.number().int(), // non-unique; tie-break by id (ascending)
    conditions: z.array(conditionSchema), // array of condition tuples; ALL must match (AND)
    value: z.boolean(), // result when this rule matches
  })
  .strict();
```

- Rules are pre-sorted by the control plane: `(priority ASC, id ASC)`.
- The engine does **not** sort; it iterates in array order.
- Empty `conditions` array means "always matches" (catch-all rule).

---

## 2. Condition System

### 2.1 Design

Each condition is a discriminated union on `operator`. The `attribute` is the context key (e.g., `"country"`, `"userId"`, `"plan"`).

```ts
// Base interface for all conditions
interface BaseCondition {
  attribute: string; // e.g., "country", "userId", "plan"
}

// Discriminated union variants
type Condition =
  | { operator: 'equals'; value: string }
  | { operator: 'notEquals'; value: string }
  | { operator: 'in'; value: string[] }
  | { operator: 'notIn'; value: string[] }
  | { operator: 'startsWith'; value: string }
  | { operator: 'endsWith'; value: string }
  | { operator: 'contains'; value: string }
  | { operator: 'gt'; value: number }
  | { operator: 'gte'; value: number }
  | { operator: 'lt'; value: number }
  | { operator: 'lte'; value: number }
  | { operator: 'exists'; value: boolean }
  | { operator: 'versionEquals'; value: string } // semver comparison
  | { operator: 'versionGt'; value: string }
  | { operator: 'versionGte'; value: string }
  | { operator: 'versionLt'; value: string }
  | { operator: 'versionLte'; value: string };
```

### 2.2 Zod Schemas

```ts
const stringValue = z.string().min(1);
const stringArrayValue = z.array(z.string().min(1)).min(1);
const numberValue = z.number();
const booleanValue = z.boolean();
const versionValue = z.string().regex(/^\d+\.\d+\.\d+$/); // simple semver

const conditionSchema = z.discriminatedUnion('operator', [
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
```

### 2.3 Evaluation Semantics

- **Missing attribute** → `exists: false` matches, all other operators fail to match.
- **Type coercion** — Context values are strings. `gt`/`gte`/`lt`/`lte` parse as numbers; invalid numbers fail to match. `version*` operators parse as semver; invalid semver fails to match.
- **Case sensitivity** — String operators are case-sensitive. Use `equals` with normalized context values.
- **All conditions in a rule must match (AND)** — Rule matches only if every condition in its `conditions` array matches.

---

## 3. Evaluation Context

The SDK passes a context object with the evaluation request. The engine reads only the attributes referenced by conditions.

```ts
const evaluationContextSchema = z.record(z.string(), z.unknown()).default({});
```

Typical keys: `userId`, `country`, `plan`, `appVersion`, `customAttribute`.

- Values are JSON-serializable (string, number, boolean, null).
- The engine treats missing keys as "attribute does not exist".

---

## 4. Engine Output

### 4.1 Single Flag Evaluation

```ts
const evaluationResultSchema = z.object({
  value: z.boolean(),
  reason: z.enum(['rule-match', 'default-value', 'disabled']),
  ruleId: z.string().optional(), // present only when reason === 'rule-match'
});
```

- `reason: 'disabled'` → flag was `enabled: false` in snapshot.
- `reason: 'default-value'` → flag enabled, no rule matched.
- `reason: 'rule-match'` → first matching rule's `value` returned; `ruleId` included for diagnostics.

### 4.2 Bulk Evaluation (Future)

```ts
const bulkEvaluationResultSchema = z.record(flagKeySchema, evaluationResultSchema);
```

---

## 5. SDK Key Contract

### 5.1 Key Format

```
sk_<envPrefix>_<random>
```

- `envPrefix`: first 4 chars of environment key (e.g., `prod`, `stag`, `devl`)
- Random: 24 chars base64url (192 bits entropy)

### 5.2 Key Hash Storage

- Only SHA-256 hash stored in PostgreSQL (`SdkKey.keyHash`).
- Redis key index maps `keyHash` → `{ environmentId, type, label, prefix, last4, expiresAt, revokedAt }`.

---

## 6. Versioning & Compatibility

| schemaVersion | Status  | Notes                                    |
| ------------- | ------- | ---------------------------------------- |
| 1             | Current | Defined in this document                 |
| >1            | Future  | Readers must reject unsupported versions |

**Readers:** If `schemaVersion > 1`, throw `UnsupportedSchemaVersionError` with the version number. Do not attempt partial evaluation.

**Writers:** Always write `schemaVersion: 1`.

---

## 7. Implementation Checklist (for `@squidflag/contracts`)

- [ ] `uuidSchema` — Zod string with UUIDv7 regex validation (optional strict mode)
- [ ] `environmentKeySchema` — `^[a-z0-9]+(-[a-z0-9]+)*$`, max 63
- [ ] `flagKeySchema` — same as environment key
- [ ] `conditionSchema` — discriminated union as defined above
- [ ] `flagRuleSchema` — with `conditions: z.array(conditionSchema)`
- [ ] `flagSnapshotSchema` — BOOLEAN only for MVP
- [ ] `snapshotEnvironmentSchema`
- [ ] `snapshotSchema` — with `schemaVersion: z.literal(1)`
- [ ] `evaluationContextSchema`
- [ ] `evaluationResultSchema`
- [ ] Type exports for all inferred types
- [ ] `UnsupportedSchemaVersionError` class export
- [ ] Unit tests: golden vectors for valid v1 snapshots, invalid snapshots, condition evaluation

---

## 8. Golden Vector Tests (Required)

The contracts package must include golden vector tests covering:

1. **Valid v1 snapshot** — Full snapshot with multiple flags, rules, condition types.
2. **Minimal snapshot** — One flag, no rules, enabled=false.
3. **All condition operators** — Each operator variant with valid values.
4. **Invalid schemaVersion** — v0, v2, missing, non-integer.
5. **Invalid condition** — Unknown operator, wrong value type, missing attribute.
6. **Empty conditions array** — Rule with `conditions: []` matches always.
7. **Rule priority ordering** — Verify engine uses array order, does not sort.

---

## 9. Flag Engine Contract (for `@squidflag/flag-engine`)

### 9.1 Public API

```ts
interface FlagEngine {
  evaluate(snapshot: Snapshot, context: EvaluationContext, flagKey: string): EvaluationResult;
  evaluateAll(snapshot: Snapshot, context: EvaluationContext): Record<string, EvaluationResult>;
}
```

### 9.2 Behavior

- **No I/O** — Pure function, no network, no timers.
- **No sorting** — Assumes `snapshot.flags[flagKey].rules` is pre-sorted `(priority ASC, id ASC)`.
- **Deterministic** — Same inputs → same output.
- **Fail-fast** — Throw on unsupported `schemaVersion`, invalid snapshot structure.

### 9.3 Evaluation Algorithm

```ts
function evaluate(snapshot, context, flagKey) {
  const flag = snapshot.flags[flagKey];
  if (!flag) throw new Error(`Flag ${flagKey} not found in snapshot`);

  if (!flag.enabled) {
    return { value: false, reason: 'disabled', ruleId: undefined };
  }

  for (const rule of flag.rules) {
    if (matchConditions(rule.conditions, context)) {
      return { value: rule.value, reason: 'rule-match', ruleId: rule.id };
    }
  }

  return { value: flag.defaultValue, reason: 'default-value', ruleId: undefined };
}

function matchConditions(conditions, context) {
  return conditions.every((cond) => matchSingleCondition(cond, context));
}

function matchSingleCondition(cond, context) {
  const ctxValue = context[cond.attribute];
  const exists = ctxValue !== undefined && ctxValue !== null;

  switch (cond.operator) {
    case 'exists':
      return cond.value === exists;
    case 'equals':
      return exists && String(ctxValue) === cond.value;
    case 'notEquals':
      return exists && String(ctxValue) !== cond.value;
    case 'in':
      return exists && cond.value.includes(String(ctxValue));
    case 'notIn':
      return exists && !cond.value.includes(String(ctxValue));
    case 'startsWith':
      return exists && String(ctxValue).startsWith(cond.value);
    case 'endsWith':
      return exists && String(ctxValue).endsWith(cond.value);
    case 'contains':
      return exists && String(ctxValue).includes(cond.value);
    case 'gt':
      return exists && Number(ctxValue) > cond.value;
    case 'gte':
      return exists && Number(ctxValue) >= cond.value;
    case 'lt':
      return exists && Number(ctxValue) < cond.value;
    case 'lte':
      return exists && Number(ctxValue) <= cond.value;
    case 'versionEquals':
      return exists && compareSemver(String(ctxValue), cond.value) === 0;
    case 'versionGt':
      return exists && compareSemver(String(ctxValue), cond.value) > 0;
    case 'versionGte':
      return exists && compareSemver(String(ctxValue), cond.value) >= 0;
    case 'versionLt':
      return exists && compareSemver(String(ctxValue), cond.value) < 0;
    case 'versionLte':
      return exists && compareSemver(String(ctxValue), cond.value) <= 0;
    default:
      return false; // unreachable due to discriminated union
  }
}
```

---

## 10. Migration Notes (from current `@squidflag/contracts`)

| Current                                                      | New (v1)                                                 |
| ------------------------------------------------------------ | -------------------------------------------------------- |
| `ruleConditionsSchema: z.record(...)`                        | `conditions: z.array(conditionSchema)`                   |
| `ruleConditionSchema: { operator: 'equals', value: string }` | Discriminated union with 16 operators                    |
| `id: z.string().min(1)`                                      | `uuidSchema` (UUIDv7 format)                             |
| `.strict()` on all objects                                   | Keep `.strict()` for write; readers strip unknown keys   |
| Single `schemaVersion` literal                               | Same, but readers reject unsupported versions explicitly |

---

## 11. Open Questions (to resolve before implementation)

1. **Semver parsing** — Use a lightweight semver compare (no heavy dep) or implement minimal parser?
2. **Context value types** — Allow arrays in context for `in`/`notIn`? (Current: stringify and compare)
3. **Error types** — Export `EvaluationError` subtypes (`FlagNotFoundError`, `InvalidSnapshotError`, `UnsupportedSchemaVersionError`)?
4. **Rule limit** — Max rules per flag? (Suggest: 100)
5. **Condition limit** — Max conditions per rule? (Suggest: 20)
