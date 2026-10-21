# SquidFlag — Domain Analysis (v2)

> **Status:** v2 decision draft. No Prisma schema or SQL has been written from this document.
> **Authority:** The v2 decisions below supersede contradictory wording inherited from v1.
> **Design rule:** Every index must map to an access-pattern number in section A. Deferred items are listed at the end with an owner and trigger.

## Scope and assumptions

SquidFlag has a control plane for managing organizations, projects,
environments, flags, rules, SDK keys, publishing, and audit history,
plus an evaluator/data plane that resolves flags for SDKs. An
organization can have multiple users through memberships. A project
contains environments and feature flags. A publish creates an immutable
snapshot for an environment.

Binding v2 defaults: - UUIDv7 IDs are generated in the application layer; exact Prisma 7.10 behavior must pass the verification check before schema syntax is selected. - All event times use
`timestamptz`. - Email and human-readable keys/slugs are normalized
before storage and protected by database uniqueness. - Projects,
environments, and flags are archived rather than hard-deleted during
normal product use. - Published snapshots are immutable; a new publish
creates a new snapshot/version. - The application performs
authentication and RBAC; database constraints enforce integrity even
under concurrent writers. - RLS is planned hardening and is enabled after Phase 4, not in the initial schema milestone.
Tenant isolation must still be enforced by application authorization and
query filters until RLS is enabled.

---

## A. Access patterns

Frequency and result size are estimates for the initial product; validate them against expected usage before adding indexes.

|   # | Query                                                                     | Plane (control/data) | Frequency                                       | Result size                                                  | Filter and sort                                                                                                                                                                              | Index needed?                                                                                                                                                                                                                        |
| --: | ------------------------------------------------------------------------- | -------------------- | ----------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
|   1 | Login lookup by normalized email                                          | Control              | Every login                                     | 0–1 user                                                     | `email = normalized input`                                                                                                                                                                   | Yes: `CHECK (email = lower(email))` and a plain `UNIQUE` constraint on `email`. The application lowercases email on write; the CHECK rejects non-normalized values.                                                                  |
|   2 | Refresh-token rotation and reuse check                                    | Control              | Every refresh; security-sensitive               | 0–1 token/family plus related tokens if reuse is detected    | Lookup by token hash; inspect family, revocation and expiry; possibly revoke the entire family                                                                                               | Yes: unique index on token hash; index on family ID if family-wide revocation is queried.                                                                                                                                            |
|   3 | List organizations a user belongs to, with role                           | Control              | On login / organization switch                  | Usually small                                                | Membership by `userId`; include organization and role                                                                                                                                        | Yes: unique `(organizationId, userId)` plus index `(userId, organizationId)`.                                                                                                                                                        |
|   4 | List projects in an organization                                          | Control              | Frequent dashboard navigation                   | Small–medium page                                            | Filter by `organizationId`, exclude archived projects, sort by `createdAt DESC` or name                                                                                                      | No additional listing index needed. The existing `UNIQUE (organizationId, slug)` constraint supports filtering by `organizationId`; organizations are expected to have few projects.                                                 |
|   5 | List flags in a project with per-environment config                       | Control              | Frequent dashboard use                          | Page of flags plus configs                                   | Filter by `projectId`, exclude archived flags, stable key/name ordering; join environment configs                                                                                            | Yes: UNIQUE `(projectId, key)`. Archived flag keys remain reserved, so the uniqueness constraint applies to all flags, including archived ones. A separate listing index is deferred unless measured query performance justifies it. |
|   6 | Build a full environment snapshot (enabled flags, configs, ordered rules) | Control              | On publish; not every evaluation                | All publishable flags, configs and rules for one environment | Filter by environment; include enabled configs; order rules by explicit priority and stable tie-breaker                                                                                      | Yes: unique `(environmentId, flagId)` on configurations; index rules by `(flagEnvironmentConfigId, priority, id)`.                                                                                                                   |
|   7 | Lock environment row for publish                                          | Control              | Each publish                                    | 1 row                                                        | Fetch and lock the environment by ID inside the transaction                                                                                                                                  | No additional index; the primary key on the environment ID is sufficient.                                                                                                                                                            |
|   8 | Fetch current published version                                           | Control/data         | Frequent for SDK cache refresh and dashboard    | 0–1 active snapshot                                          | Filter by environment and active status                                                                                                                                                      | Yes: partial unique index allowing only one `ACTIVE` snapshot per environment.                                                                                                                                                       |
|   9 | List version history for an environment, newest first                     | Control              | Occasional dashboard use                        | Page of versions                                             | Filter by `environmentId`; order by `version DESC`, according to the pagination cursor                                                                                                       | Yes: UNIQUE `(environmentId, version)` supports version-history lookup and descending version pagination through a backward index scan. Do not add a duplicated index unless a measured query plan justifies it.                     |
|  10 | Resolve an SDK key (cache miss only)                                      | Data                 | Frequent; Redis lookup on SDK request           | 0–1 key record                                               | The evaluator resolves the presented key through the Redis SDK-key index and validates cached status and expiry. The evaluator must never query PostgreSQL, including on a Redis cache miss. | PostgreSQL requires a unique index on the key hash for control-plane integrity. Redis maintains the runtime key index.                                                                                                               |
|  11 | List keys for an environment                                              | Control              | Occasional settings page                        | Small list                                                   | Filter by `environmentId`; include active/revoked status as required; sort newest first                                                                                                      | Maybe: `(environmentId, createdAt DESC)` only if list size or measured latency justifies it.                                                                                                                                         |
|  12 | Audit log by organization, newest first, paginated                        | Control              | Frequent enough for investigations              | One page                                                     | Filter by `organizationId`; order by `createdAt DESC` with stable tie-breaker `id`                                                                                                           | Yes: `(organizationId, createdAt DESC, id DESC)`.                                                                                                                                                                                    |
|  13 | Check flag-key uniqueness on create/rename                                | Control              | Every flag create/rename                        | Existence check, 0–1 row                                     | Scope normalized key to `projectId`; archived flag keys remain reserved.                                                                                                                     | Yes: unique `(projectId, key)`. Archived flag keys remain reserved, so the uniqueness constraint applies to all flags, including archived ones. A separate listing index is deferred unless measured query performance justifies it. |
|  14 | Authorize a user's organization role                                      | Control              | On protected organization requests              | 0–1 membership                                               | Lookup membership by `(organizationId, userId)`                                                                                                                                              | Yes: unique `(organizationId, userId)` plus reverse index `(userId, organizationId)` for user-first lookups.                                                                                                                         |
|  15 | List organization members                                                 | Control              | Occasional member-management page               | Page of members                                              | Filter by `organizationId`; order by `createdAt DESC, id DESC`                                                                                                                               | Yes: `(organizationId, createdAt DESC, id DESC)`.                                                                                                                                                                                    |
|  16 | Reconcile stale `PENDING` snapshots                                       | Worker               | Periodic background task                        | Small batch of stale snapshots                               | Filter by `status = 'PENDING'` and reconciliation threshold; order by `createdAt, id`                                                                                                        | Yes: partial index on `(createdAt, id) WHERE status = 'PENDING'`.                                                                                                                                                                    |
|  17 | Purge expired refresh tokens                                              | Worker               | Periodic background task                        | Batch of expired tokens                                      | Filter by expiry threshold; process in deterministic order                                                                                                                                   | Yes: `(expiresAt, id)`.                                                                                                                                                                                                              |
|  18 | Detect unpublished changes and draft/live drift                           | Control              | Dashboard status checks and publish preparation | One environment and its active snapshot                      | Read the environment's draft revision and compare it with the active snapshot's source revision                                                                                              | Environment primary key plus UNIQUE `(environmentId, version)`. The unique index supports descending version lookup through a backward index scan. Do not add a duplicate index without query-plan evidence.                         |
|  19 | Resolve or revoke an SDK key by ID                                        | Control              | Key management operations                       | 0–1 key                                                      | Fetch by primary key; update revocation state when required                                                                                                                                  | No additional lookup index; the primary key is sufficient.                                                                                                                                                                           |
|  20 | Rebuild the SDK-key index after Redis loss                                | Worker               | On Redis index rebuild/recovery                 | All non-revoked SDK keys                                     | Find all SDK keys where `revokedAt IS NULL`; evaluate expiry at runtime                                                                                                                      | Yes: partial index on `(id) WHERE revokedAt IS NULL`. Do not put time-dependent expiry conditions in the partial-index predicate.                                                                                                    |
|  21 | Rebuild active snapshot pointers after Redis loss                         | Worker               | On Redis index rebuild/recovery                 | All active snapshots across environments                     | Find every `ACTIVE` snapshot across all tenants and rebuild the Redis current-version pointers and related snapshot lookup index                                                             | Yes: the partial unique index on (environmentId) WHERE status = 'ACTIVE' enforces at most one active snapshot per environment and may support recovery scans. Verify the actual query plan before adding another index.              |

### Index policy

- Do not add indexes solely because a field is frequently read; tie
  each one to an access pattern above.
- Primary keys and unique constraints create indexes too; account for
  their write cost.
- Prefer a composite index that matches the actual filter/order rather
  than multiple speculative single-column indexes.
- Confirm pagination style (offset vs cursor), ordering, archive
  semantics, and expected cardinality before finalizing indexes.
- A foreign key does not automatically create an index on the
  referencing columns in PostgreSQL.

---

## B. Entity cards

Types below are conceptual PostgreSQL types, not Prisma syntax. `?` means nullable. All timestamps use `timestamptz`. All entity IDs use PostgreSQL `uuid` columns with UUIDv7 generated by Prisma Client through the consistent Prisma definition `String @id @default(uuid(7)) @db.Uuid`. Do not mix UUID-generation strategies or configure separate PostgreSQL-side UUID defaults for these IDs. Direct SQL writers must supply IDs themselves.

Slug and key normalization rules are defined once:

- Slugs use lowercase ASCII letters, digits and single hyphens between segments, match `^[a-z0-9]+(-[a-z0-9]+)*$`, and are 1–63 characters long.
- Slugs and flag/environment keys are normalized by the application before writes. Database CHECK constraints reject non-normalized values rather than silently transforming them.
- Email addresses are stored lowercase. The database enforces `CHECK (email = lower(email))` and a plain unique constraint on `email`.
- Foreign keys, unique constraints and partial unique indexes described below are database invariants, not application-only checks.

### User

**Purpose:** Global identity that can belong to multiple organizations.

**Fields:** `id uuid`; `email text`; `passwordHash text`; `createdAt timestamptz`; `updatedAt timestamptz`; `disabledAt timestamptz?`.

**Unique / indexes:** `UNIQUE (email)` and `CHECK (email = lower(email))`. The application trims surrounding whitespace and lowercases email before writing. Login looks up the normalized input using equality on `email`; no expression index or second normalized column is used.

**Relations:**

- `Membership.userId → User.id`, `ON DELETE RESTRICT`.
- `RefreshToken.userId → User.id`, `ON DELETE RESTRICT`.
- `PublishedSnapshot.createdByUserId → User.id`, `ON DELETE RESTRICT`.

Account deletion is not a normal cascade operation. Accounts are disabled during ordinary operation; any future physical deletion must be an explicit lifecycle process that accounts for retained history and privacy requirements.

**Immutable:** `id` and the original account identity. Email can change through a verified update; password hash changes through password rotation.

**RLS classification:** Global. Login occurs before an organization is selected. Do not apply a naïve `organizationId` policy to this table.

### Organization

**Purpose:** Tenant boundary and billing/administration scope.

**Fields:** `id uuid`; `name text`; `slug text`; `createdAt timestamptz`; `updatedAt timestamptz`; `archivedAt timestamptz?`.

**Unique / indexes:** `UNIQUE (slug)`; CHECK constraints enforce the shared slug format and lowercase normalization. Organization slugs are globally unique.

**Relations:**

- `Project.organizationId → Organization.id`, `ON DELETE RESTRICT`.
- `Membership.organizationId → Organization.id`, `ON DELETE RESTRICT`.
- `AuditLog.organizationId → Organization.id`, `ON DELETE RESTRICT`.

Archive organizations rather than physically deleting them in ordinary flows. Add an archive/listing index only if a concrete query and measured performance justify it.

**Immutable:** `id`. Slug changes require an explicit validated operation and must preserve uniqueness.

**RLS classification:** Tenant root. Organization access is established through membership or an explicit trusted context.

### Membership

**Purpose:** Connect a user to an organization and store the user's organization-level role.

**Fields:** `id uuid`; `organizationId uuid`; `userId uuid`; `role enum (OWNER, ADMIN, EDITOR, VIEWER)`; `createdAt timestamptz`; `updatedAt timestamptz`.

**Unique / indexes:**

- `UNIQUE (organizationId, userId)`.
- Index `(userId, organizationId)` for user-first organization discovery.
- Index `(organizationId, createdAt DESC, id DESC)` for access pattern #15, which lists organization members in stable creation order.

**Relations:**

- `Membership.organizationId → Organization.id`, `ON DELETE RESTRICT`.
- `Membership.userId → User.id`, `ON DELETE RESTRICT`.

**Immutable:** `id` and the organization/user identity pair after creation. Membership transfer is not a normal update. Role changes require authorization checks and audit logging.

**RLS classification:** Mixed/special. Membership is tenant-scoped by `organizationId`, but organization discovery needs user-first access before a tenant has been selected.

### Project

**Purpose:** Groups flags and environments inside one organization.

**Fields:** `id uuid`; `organizationId uuid`; `name text`; `slug text`; `createdAt timestamptz`; `updatedAt timestamptz`; `archivedAt timestamptz?`.

**Unique / indexes:**

- `UNIQUE (organizationId, slug)`.
- `UNIQUE (organizationId, id)` to support composite foreign keys.
- CHECK constraints enforce the shared slug format and lowercase normalization.

No additional project-listing index is planned initially. The unique `(organizationId, slug)` index supports filtering by organization, and each organization is expected to have relatively few projects. Reconsider only if measurements justify another index.

**Relations:**

- `Project.organizationId → Organization.id`, `ON DELETE RESTRICT`.
- `Environment.(organizationId, projectId) → Project.(organizationId, id)`, `ON DELETE RESTRICT`.
- `FeatureFlag.(organizationId, projectId) → Project.(organizationId, id)`, `ON DELETE RESTRICT`.

Flags and environments are direct project children. Archive them through explicit application lifecycle operations; do not physically cascade-delete them.

**Immutable:** `id` and `organizationId`. Moving a project between organizations is not a normal update.

**RLS classification:** Tenant-scoped. Child records carry `organizationId` and, where project-level consistency is required, `projectId`. Composite foreign keys prevent these values from drifting from the parent.

### Environment

**Purpose:** Named evaluation/publish target within a project, such as development, staging or production.

**Fields:** `id uuid`; `organizationId uuid`; `projectId uuid`; `key text`; `name text`; `createdAt timestamptz`; `updatedAt timestamptz`; `archivedAt timestamptz?`; `draftRevision integer` with default `0`.

There is no `publishedVersion` column. The `ACTIVE` snapshot row is the canonical source of live publication state.

**Unique / indexes:**

- `UNIQUE (projectId, key)`.
- `UNIQUE (organizationId, projectId, id)` to support project-aware composite foreign keys.
- CHECK constraints enforce lowercase key normalization and the agreed key format.
- `UNIQUE (organizationId, id)` to support the composite foreign key from `SdkKey`.

The environment primary key supports access pattern #7. Access pattern #8 is supported by the active-snapshot index, so no extra environment index is needed for that lookup.

**Relations:**

- `Environment.(organizationId, projectId) → Project.(organizationId, id)`, `ON DELETE RESTRICT`.
- `PublishedSnapshot.(organizationId, projectId, environmentId) → Environment.(organizationId, projectId, id)`, `ON DELETE RESTRICT`.
- `SdkKey.(organizationId, environmentId) → Environment.(organizationId, id)`, `ON DELETE RESTRICT`.
- `FlagEnvironmentConfig.(organizationId, projectId, environmentId) → Environment.(organizationId, projectId, id)`, `ON DELETE RESTRICT`.

Environment history is retained. Archive an environment rather than physically deleting it while snapshots or SDK-key history exist.

**Immutable:** `id`, `projectId` and `organizationId`. `draftRevision` increments on every accepted draft mutation. Live publication is determined only by the `ACTIVE` snapshot row.

**RLS classification:** Tenant-scoped. A composite foreign key ensures the environment's organization and project match its parent project.

### FeatureFlag

**Purpose:** Logical flag identity and project-level metadata shared across environments.

**Fields:** `id uuid`; `organizationId uuid`; `projectId uuid`; `key text`; `name text`; `description text?`; `flagType enum (BOOLEAN)` for the MVP; `createdAt timestamptz`; `updatedAt timestamptz`; `archivedAt timestamptz?`.

**Unique / indexes:**

- `UNIQUE (projectId, key)`.
- `UNIQUE (organizationId, projectId, id)` to support composite foreign keys.
- CHECK constraints enforce lowercase key normalization and the agreed key format.

Archived flag keys remain reserved and cannot be reused within the same project. This prevents an old SDK configuration or historical snapshot from appearing to refer to a newly created flag with the same key. A partial unique index for key reuse is not part of the initial design.

The unique `(projectId, key)` index supports access pattern #13 and can support project-scoped lookups. Add a separate listing index for #5 only if measurements show the unique index is insufficient for the actual query.

**Relations:**

- `FeatureFlag.(organizationId, projectId) → Project.(organizationId, id)`, `ON DELETE RESTRICT`.
- `FlagEnvironmentConfig.(organizationId, projectId, flagId) → FeatureFlag.(organizationId, projectId, id)`, `ON DELETE RESTRICT`.

Avoid physical deletion when snapshots or audit history refer to a flag.

**Immutable:** `id`, `organizationId` and `projectId`. The key may change before the first successful publication through an explicit audited operation. Once published, the key is immutable; create a replacement flag if a different key is required.

**RLS classification:** Tenant-scoped. The composite foreign key to `Project` prevents cross-organization or cross-project assignment.

### FlagEnvironmentConfig

**Purpose:** Environment-specific draft state and configuration for a logical flag.

**Fields:** `id uuid`; `organizationId uuid`; `projectId uuid`; `environmentId uuid`; `flagId uuid`; `enabled boolean`; `defaultValue boolean`; `createdAt timestamptz`; `updatedAt timestamptz`.

`defaultValue` is a required PostgreSQL boolean, not JSONB. For an enabled flag, the default is returned when no rule matches. A disabled flag evaluates to `false`.

The MVP supports BOOLEAN flags only. Supporting additional value types later requires an explicit schema migration.

**Unique:** `(environmentId, flagId)` ensures one configuration per
environment and flag; `(organizationId, id)` is the referenced unique
key for the composite foreign key from `FlagRule`.

**Relations:**

- `FlagEnvironmentConfig.(organizationId, projectId, environmentId) → Environment.(organizationId, projectId, id)`, `ON DELETE RESTRICT`.
- `FlagEnvironmentConfig.(organizationId, projectId, flagId) → FeatureFlag.(organizationId, projectId, id)`, `ON DELETE RESTRICT`.

Including `projectId` in this entity and both composite foreign keys prevents a configuration from joining a flag in project A to an environment in project B, even when both projects belong to the same organization.

**Immutable:** `id`, `organizationId`, `projectId`, `environmentId` and `flagId`. Draft configuration values are mutable through validated draft-edit operations. Published copies are immutable.

**RLS classification:** Tenant-scoped. Direct organization and project identifiers support simpler policies, while composite foreign keys enforce parent consistency.

### FlagRule

**Purpose:** Ordered targeting rule associated with one flag's environment configuration.

**Fields:** `id uuid`; `organizationId uuid`; `flagEnvironmentConfigId uuid`; `priority integer`; `conditions jsonb`; `result boolean`; `createdAt timestamptz`; `updatedAt timestamptz`.

**Ordering:** `priority` is intentionally non-unique. Evaluation sorts by `(priority ASC, id ASC)` so ties are deterministic and reorder operations do not fail on transient duplicate priorities. Reordering occurs in one transaction.

**Indexes:** `(flagEnvironmentConfigId, priority, id)` supports access pattern #6.

**Relations:**

- `FlagRule.(organizationId, flagEnvironmentConfigId) → FlagEnvironmentConfig.(organizationId, id)`, `ON DELETE RESTRICT`.

`FlagEnvironmentConfig` must declare `UNIQUE (organizationId, id)` to support this composite foreign key. The rule does not need its own `projectId`: its parent configuration already establishes the project relationship.

Rule conditions are JSONB validated by application schemas. The rule result is a PostgreSQL boolean, not JSONB.

**Immutable:** `id`, `organizationId` and `flagEnvironmentConfigId`. Draft rule content is mutable through validated draft-edit operations; published rule content is immutable.

**RLS classification:** Tenant-scoped. The composite foreign key ensures the rule's organization matches its parent configuration.

### SdkKey

**Purpose:** Secret credential allowing an SDK to resolve flags for an environment.

**Fields:** `id uuid`; `organizationId uuid`; `environmentId uuid`; `keyHash text`; `type enum (SERVER, CLIENT)`; `label text`; `prefix text`; `last4 text`; `createdByUserId uuid`; `createdAt timestamptz`; `expiresAt timestamptz?`; `revokedAt timestamptz?`; `lastUsedAt timestamptz?`.

**Unique / indexes:**

- `UNIQUE (keyHash)` for key-hash integrity.
- `(environmentId, createdAt DESC, id DESC)` for access pattern #11 is deferred. Add it only if measured list size or query latency justifies it.
- Partial index `(id) WHERE revokedAt IS NULL` for access pattern #20.

Only a cryptographic hash of a sufficiently random key is stored. The raw secret is displayed once at creation or rotation.

**Relations:**

- `SdkKey.(organizationId, environmentId) → Environment.(organizationId, id)`, `ON DELETE RESTRICT`.
- `SdkKey.createdByUserId → User.id`, `ON DELETE RESTRICT`.

Revocation is an update; do not cascade-delete key history. The application role may update `revokedAt` and, if retained, `lastUsedAt`; other SDK-key fields are not generally mutable.

**Immutable:** `id`, `keyHash`, `organizationId`, `environmentId` and `createdAt`. Rotate by creating a new key row and revoking the old row rather than changing the existing hash.

**RLS classification:** Tenant-scoped for management, but SDK-key resolution is a no-organization-context data-plane operation. It uses a narrowly scoped Redis lookup path and must not expose key metadata broadly.

The evaluator must not query PostgreSQL for SDK-key resolution, including when the key is absent from Redis.

### PublishedSnapshot

**Purpose:** Immutable, versioned, complete published state for one environment. The snapshot payload is stored in R2, never in PostgreSQL.

**Fields:** `id uuid`; `organizationId uuid`; `projectId uuid`; `environmentId uuid`; `version integer`; `status enum (PENDING, ACTIVE, SUPERSEDED, FAILED)`; `storageKey text`; `checksum text`; `sizeBytes integer`; `draftRevision integer`; `sourceVersion integer?`; `comment text?`; `createdAt timestamptz`; `createdByUserId uuid`; `failureCode text?`; `activatedAt timestamptz?`.

`sourceVersion` records the prior snapshot version when a new snapshot is created by rollback. It is `NULL` for an ordinary publication that does not originate from a previous published version.

**Unique / indexes:**

- `UNIQUE (environmentId, version)` supports version-history lookup and descending version pagination through a backward index scan, as described in access patterns #9 and #18.
- Partial unique index on `(environmentId) WHERE status = 'ACTIVE'` to enforce at most one active snapshot per environment.
- Partial unique index on `(environmentId) WHERE status = 'PENDING'` to allow at most one pending snapshot per environment.
- Partial index `(createdAt, id) WHERE status = 'PENDING'` for access pattern #16.
- The partial unique index on `(environmentId) WHERE status = 'ACTIVE'` may support access pattern #21 to list all active snapshots across environments. Verify the actual query plan before adding another index.

An environment that has never been published has zero `ACTIVE` snapshots. The active snapshot row is the only canonical source of live state; `Environment.publishedVersion` is not stored.

**Rollback behavior:** Rollback creates a new snapshot version from the selected historical snapshot; it does not reactivate or mutate an old snapshot. The operation replaces the current draft configuration with the selected historical content and increments `draftRevision`. The new snapshot records the source historical version in `sourceVersion`. This keeps draft/live drift detection meaningful and preserves immutable history.

**Relations:**

- `PublishedSnapshot.(organizationId, projectId, environmentId) → Environment.(organizationId, projectId, id)`, `ON DELETE RESTRICT`.
- `PublishedSnapshot.createdByUserId → User.id`, `ON DELETE RESTRICT`.

**Immutable:** `id`, organization/project/environment identifiers, version, storage key, checksum, size, draft revision captured for publication, source version, creator and creation time. The snapshot payload never changes. Status, `activatedAt` and `failureCode` may change only through the defined atomic publication/reconciliation lifecycle.

The application database role should receive column-level UPDATE permission only for `status`, `activatedAt` and `failureCode`; it must not be able to change the payload identity or checksum through ordinary application queries.

**RLS classification:** Tenant-scoped. Direct tenant/project identifiers and the composite foreign key to `Environment` ensure tenant consistency.

### AuditLog

**Purpose:** Append-only record of security and administrative actions.

**Fields:** `id uuid`; `organizationId uuid`; `actorUserId uuid?`; `actorLabel text`; `action text`; `targetType text`; `targetId uuid?`; `metadata jsonb`; `createdAt timestamptz`; `requestId text?`.

**Unique / indexes:** No additional unique constraint by default. Add idempotency constraints only if a concrete write-retry requirement establishes the need. Index `(organizationId, createdAt DESC, id DESC)` supports access pattern #12.

**Relations:**

- `AuditLog.organizationId → Organization.id`, `ON DELETE RESTRICT`.
- `actorUserId` is a historical identifier and deliberately has no foreign key.
- Target references are polymorphic and have no foreign key.

`actorLabel` records the actor label at event time. Historical audit entries remain meaningful even if the referenced user is later disabled or no longer exists.

**Immutable:** All event fields after insert. Corrections are represented by new compensating audit events, not updates or deletes.

The application database role receives INSERT and SELECT permissions only on `AuditLog`, with no UPDATE or DELETE privileges.

**RLS classification:** Tenant-scoped, with restricted insert/read policies.

### RefreshToken

**Purpose:** Track a refresh credential, rotation chain/family, expiry and reuse detection.

**Fields:** `id uuid`; `userId uuid`; `tokenHash text`; `familyId uuid`; `createdAt timestamptz`; `expiresAt timestamptz`; `revokedAt timestamptz?`; `replacedByTokenId uuid?`; `usedAt timestamptz?`.

**Unique / indexes:**

- `UNIQUE (tokenHash)`.
- `UNIQUE (replacedByTokenId)` to ensure a replacement token has at most one predecessor in the rotation chain.
- `(familyId)` for family-wide reuse handling (access pattern #2).
- `(expiresAt, id)` for bounded expired-token cleanup (access pattern #17).

**Relations:**

- `RefreshToken.userId → User.id`, `ON DELETE RESTRICT`.
- `RefreshToken.replacedByTokenId → RefreshToken.id`, `ON DELETE SET NULL`.

The nullable self-reference supports the root of a rotation chain. If a referenced replacement token is physically deleted, the referring token's `replacedByTokenId` becomes `NULL`. This may remove evidence of the original rotation chain, so token cleanup must follow an explicit retention policy. Refresh-token cleanup must not be treated as permission to delete user accounts.

**Immutable:** `id`, `userId`, `tokenHash`, `familyId`, `createdAt` and `expiresAt`. Revocation, use and replacement fields transition only through controlled refresh-token operations. Store hashes, never raw refresh tokens.

**RLS classification:** Mixed/special. Refresh and reuse detection start with a credential and user, not an organization. These operations must not require an organization setting.

### Cross-entity foreign-key map

Every composite foreign key must reference a primary key or a matching unique constraint on the parent. Do not assume that a foreign key automatically creates an index on the referencing columns.

The intended relationships are:

- `Project(organizationId) → Organization(id)`.
- `Project(organizationId, id)` is unique.
- `Environment(organizationId, id)` is unique.
- `Membership(organizationId) → Organization(id)`.
- `Membership(userId) → User(id)`.
- `Environment(organizationId, projectId) → Project(organizationId, id)`.
- `Environment(organizationId, projectId, id)` is unique.
- `FeatureFlag(organizationId, projectId) → Project(organizationId, id)`.
- `FeatureFlag(organizationId, projectId, id)` is unique.
- `FlagEnvironmentConfig(organizationId, projectId, environmentId) → Environment(organizationId, projectId, id)`.
- `FlagEnvironmentConfig(organizationId, projectId, flagId) → FeatureFlag(organizationId, projectId, id)`.
- `FlagEnvironmentConfig(organizationId, id)` is unique.
- `FlagEnvironmentConfig(environmentId, flagId)` is unique.
- `FlagRule(organizationId, flagEnvironmentConfigId) → FlagEnvironmentConfig(organizationId, id)`.
- `SdkKey(organizationId, environmentId) → Environment(organizationId, id)`.
- `SdkKey.createdByUserId → User(id)`.
- `PublishedSnapshot(organizationId, projectId, environmentId) → Environment(organizationId, projectId, id)`.
- `PublishedSnapshot(createdByUserId) → User(id)`.
- `AuditLog(organizationId) → Organization(id)`.
- `RefreshToken(userId) → User(id)`.
- `RefreshToken(replacedByTokenId) → RefreshToken(id)`.

The unique constraints in this map exist to support actual foreign-key references. Do not add unused composite unique constraints that are not referenced by a foreign key or required access pattern.

### Database privilege boundaries

The runtime application role must not own the tables and must not have superuser or `BYPASSRLS` privileges. Table ownership or privileged roles can bypass intended row-level security protections.

- `AuditLog`: application role receives INSERT and SELECT only.
- `PublishedSnapshot`: application role receives column-level UPDATE only on `status`, `activatedAt` and `failureCode`.
- `SdkKey`: application role receives column-level UPDATE only on `revokedAt` and, if retained, `lastUsedAt`.
- Worker/reconciliation operations use a separate worker role and credential for cross-tenant maintenance queries. The worker role is distinct from the evaluator role and ordinary application role.
- The evaluator must remain independent of PostgreSQL credentials and must continue serving cached evaluations during a PostgreSQL outage.

RLS policy SQL and explicit grants are implemented in the database-security/migration phase. Integration tests for these restrictions must connect as the non-owner application role; testing as a table owner would not prove the restrictions work.

---

# C. Invariants

The database is the final authority for uniqueness, referential integrity, and concurrency-sensitive state. The application enforces authorization, domain validation, and workflows inside transactions. Application checks do not replace database constraints where concurrent requests could violate an invariant.

| The database must guarantee this                                                                                                                                              | The application code guarantees this                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A user's email is lowercase and unique. Enforce `CHECK (email = lower(email))` and `UNIQUE (email)`.                                                                          | Trim surrounding whitespace, lowercase email before writes and lookups, verify email changes, and return a safe conflict response.                                                                                                                                                                                                                                                             |
| A user's membership in an organization is unique. Enforce `UNIQUE (organizationId, userId)`.                                                                                  | Only authorized roles can invite/remove members or change roles. Membership changes are audited. A transaction serializes owner-role changes per organization and prevents removal or demotion of the last active owner.                                                                                                                                                                       |
| Organization slugs are globally unique; project slugs are unique within their organization.                                                                                   | Validate the shared slug format and lowercase normalization before writes. Return a useful conflict response when a uniqueness constraint is violated.                                                                                                                                                                                                                                         |
| Environment keys are unique within a project. Enforce `UNIQUE (projectId, key)`.                                                                                              | Validate the key format and reject non-normalized keys. Archive environments rather than physically deleting them while history or credentials depend on them.                                                                                                                                                                                                                                 |
| Flag keys are unique within a project, including archived flags. Enforce `UNIQUE (projectId, key)`.                                                                           | Validate the key format. Once a flag has been published, its key is immutable. Archived flag keys remain reserved and cannot be reused.                                                                                                                                                                                                                                                        |
| Only one configuration exists per environment/flag pair. Enforce `UNIQUE (environmentId, flagId)`.                                                                            | Validate the configuration against the flag type and referenced entities before saving.                                                                                                                                                                                                                                                                                                        |
| A configuration's environment and flag belong to the same organization and project. Composite foreign keys enforce both relationships using `organizationId` and `projectId`. | Derive tenant and project identifiers from trusted parent records. Never trust client-supplied identifiers without authorization and consistency checks.                                                                                                                                                                                                                                       |
| Every foreign key references an existing parent, and composite foreign keys prevent tenant/project identifiers from disagreeing with their parents.                           | Authorize each operation independently and return safe, consistent errors for invalid references or constraint violations.                                                                                                                                                                                                                                                                     |
| Rule priority does not need to be unique. Rules are ordered deterministically by `(priority ASC, id ASC)`.                                                                    | Validate rule conditions and results against the versioned application schema. Reorder rules in one transaction. Validate again when building or publishing a snapshot.                                                                                                                                                                                                                        |
| Boolean flag defaults and rule results are stored as PostgreSQL `boolean NOT NULL` values.                                                                                    | Validate configuration values and rule conditions against the BOOLEAN-only MVP contract. Reject incompatible values before persistence and publication.                                                                                                                                                                                                                                        |
| At most one snapshot per environment has `ACTIVE` status. Enforce a partial unique index on `(environmentId) WHERE status = 'ACTIVE'`.                                        | Activate the new snapshot and supersede the previous active snapshot in one transaction. Change the old row to `SUPERSEDED` before changing the new row to `ACTIVE`. Handle conflicts and retry or report them safely.                                                                                                                                                                         |
| At most one snapshot per environment has `PENDING` status. Enforce a partial unique index on `(environmentId) WHERE status = 'PENDING'`.                                      | Reserve the pending row before uploading the payload to R2. Reconciliation handles abandoned pending publications and marks terminal failures as `FAILED`.                                                                                                                                                                                                                                     |
| `(environmentId, version)` is unique.                                                                                                                                         | Allocate versions while holding the environment row lock. Concurrent publication requests must not silently overwrite or duplicate a version.                                                                                                                                                                                                                                                  |
| Draft mutations and revision increments are atomic.                                                                                                                           | Every accepted draft mutation increments the relevant environment's `draftRevision` in the same transaction. Publish requests include `expectedDraftRevision`; a mismatch returns HTTP 409. Metadata changes affecting multiple environments increment every affected non-archived environment's revision in one transaction, with environments locked or updated in deterministic `id` order. |
| The active snapshot row is the only canonical source of published state. No separate `Environment.publishedVersion` column is maintained.                                     | Dashboard and publishing logic derive live state from the `ACTIVE` snapshot. Zero active snapshots means the environment has never been successfully published or currently has no active publication.                                                                                                                                                                                         |
| Published snapshot payload identity and content metadata cannot be modified through the ordinary application role.                                                            | Every publication creates a new immutable snapshot payload in R2. Rollback creates a new version from historical content, records its `sourceVersion`, restores that content to the draft, and increments `draftRevision`. It never mutates or reactivates an old snapshot row.                                                                                                                |
| `AuditLog` rows cannot be updated or deleted by the application database role. Grant that role `INSERT` and `SELECT` only.                                                    | Emit audit events for successful sensitive operations, preserve the actor label at event time, and never log raw credentials or secrets. Corrections are represented by new audit events.                                                                                                                                                                                                      |
| SDK key hashes and refresh token hashes are unique. Enforce unique constraints on `SdkKey.keyHash` and `RefreshToken.tokenHash`.                                              | Generate high-entropy credentials, store only their cryptographic hashes, display raw SDK secrets only once, and use controlled rotation/revocation workflows. Refresh-token rotation and reuse detection must be atomic; detected reuse revokes the token family according to the authentication policy.                                                                                      |
| SDK-key metadata cannot be changed arbitrarily through the application role. Grant column-level UPDATE on `revokedAt` and, if retained, `lastUsedAt` only.                    | Revoke or rotate keys through controlled operations. The evaluator resolves keys through Redis and never queries PostgreSQL, including on a Redis cache miss.                                                                                                                                                                                                                                  |
| Required fields are non-null, values satisfy simple CHECK constraints, and declared foreign keys and unique constraints are enforced by PostgreSQL.                           | Enforce complex business rules, authorization, input validation, and safe API errors. Do not rely on application-only checks for uniqueness or referential integrity.                                                                                                                                                                                                                          |
| IDs and timestamps follow the documented storage conventions.                                                                                                                 | Generate UUIDv7 identifiers consistently and use UTC-aware timestamps in application code. Confirm the exact Prisma UUIDv7 default behavior before schema implementation; raw SQL writers must follow the same ID-generation strategy.                                                                                                                                                         |
| The application database role cannot bypass the intended database security boundaries. It must not own the tables or have superuser or `BYPASSRLS` privileges.                | Connect using the non-owner application role in integration tests. Keep migration ownership and worker privileges separate from ordinary application privileges.                                                                                                                                                                                                                               |
| Cross-tenant maintenance queries run only through an explicitly privileged worker path.                                                                                       | Use a separate worker role and credential for reconciliation and rebuilding Redis indexes. Do not give the evaluator PostgreSQL credentials.                                                                                                                                                                                                                                                   |
| Until RLS is enabled, database constraints still enforce referential integrity, uniqueness, and lifecycle invariants.                                                         | Every tenant-scoped control-plane query must apply a trusted organization filter and pass authorization checks. RLS is an additional tenant-isolation layer, not a replacement for application authorization.                                                                                                                                                                                  |

## Database versus application responsibility

Database constraints and transactions enforce invariants that must survive concurrent requests and non-application writers, including uniqueness, foreign-key integrity, at-most-one active or pending snapshot, and immutable-history permissions.

Application code enforces authorization, input normalization, complex rule validation, publication orchestration, and user-facing error handling. Where a workflow spans multiple rows, it must use a transaction and the documented locking/revision strategy.

## Publication and recovery requirements

- Publication reserves one `PENDING` snapshot per environment before uploading the complete serialized payload to R2.
- The payload is immutable after creation. PostgreSQL stores snapshot metadata, checksum, storage key, version, and lifecycle state; the payload itself stays in R2.
- Successful activation transitions the previous `ACTIVE` snapshot to `SUPERSEDED` and the new snapshot to `ACTIVE` atomically.
- Failed publications transition to `FAILED` and retain an appropriate failure code. A reconciliation worker detects and resolves abandoned `PENDING` rows.
- Rollback creates a new snapshot version and records the source historical version. Draft restoration and the draft revision increment happen in the same transaction.
- After Redis loss, the worker rebuilds both the SDK-key index and the current-version pointers by listing all non-revoked SDK keys and all `ACTIVE` snapshots across tenants.
- Redis snapshot entries do not rely on TTL expiry to repair the index. The evaluator's in-memory copy may use the documented 15-second TTL; revocation propagation has a 20-second total target, including the 5-second margin.
- The evaluator remains independent of PostgreSQL and continues serving already-cached evaluations during a PostgreSQL outage. A cold evaluator still requires Redis data to become available before it can resolve uncached state.

## Database privilege requirements

- `AuditLog`: the application role receives `INSERT` and `SELECT` only; no `UPDATE` or `DELETE`.
- `PublishedSnapshot`: the application role receives column-level `UPDATE` only for `status`, `activatedAt`, and `failureCode`.
- `SdkKey`: the application role receives column-level `UPDATE` only for `revokedAt` and, if retained, `lastUsedAt`.
- Worker/reconciliation queries use a separate worker role and credential. The worker role is not the evaluator role.
- The migrator owns the schema and applies migrations. The runtime application role is not the table owner.
- RLS policy SQL and explicit grants are implemented and tested during the database-security/migration phase.

**Code-column justification:** Application-only checks are appropriate for authorization, external verification, and complex JSON documents. They are not sufficient for uniqueness, referential integrity, single-active/single-pending snapshot constraints, or concurrency-sensitive state. Those invariants require database constraints and transactions because concurrent requests can race and other database writers may exist.

---

# D. Decisions to defend

## D1. UUIDv7: where is it generated?

**Decision:** Generate UUIDv7 identifiers in the application through the Prisma client for normal application writes. The database runs PostgreSQL 17.4, so this design does not depend on a native PostgreSQL `uuidv7()` function.

The Prisma schema must use the selected Prisma UUIDv7 client-side default consistently. Raw SQL scripts and other writers that bypass Prisma must provide their own UUIDv7 identifiers. Seed scripts must follow the same ID strategy or provide explicit UUIDs.

**Trade-off:** UUID generation is consistent across application-created records, but database-side inserts cannot assume that PostgreSQL generates IDs automatically. Verify the exact Prisma version and generated SQL behavior when implementing the schema and migrations.

## D2. `organizationId` on child rows

**Decision:** Carry `organizationId` directly on tenant-owned rows that require tenant-scoped authorization, queries, or future row-level security (RLS). This includes projects, environments, flags, flag-environment configs, rules, published snapshots, SDK keys, and audit logs.

Where a child references a parent through a tenant or project relationship, use composite foreign keys backed by matching unique constraints on the referenced columns. Examples include:

- `Environment(organizationId, projectId)` references
  `Project(organizationId, id)`.
- `FeatureFlag(organizationId, projectId)` references
  `Project(organizationId, id)`.
- `FlagEnvironmentConfig(organizationId, projectId, environmentId)`
  references `Environment(organizationId, projectId, id)`.
- `FlagEnvironmentConfig(organizationId, projectId, flagId)`
  references `FeatureFlag(organizationId, projectId, id)`.
- `FlagRule(organizationId, flagEnvironmentConfigId)` references
  `FlagEnvironmentConfig(organizationId, id)`.
- `SdkKey(organizationId, environmentId)` references
  `Environment(organizationId, id)`.
- `PublishedSnapshot(organizationId, projectId, environmentId)`
  references `Environment(organizationId, projectId, id)`.

The exact referenced column lists and required unique constraints must be documented together in the schema design.

Tenant ownership is immutable during normal operation. Ordinary operations must not move a project or its children across organizations, and application code must derive tenant identifiers from trusted, authorized parent records rather than blindly accepting client-supplied IDs.

**Trade-off:** Duplicating `organizationId` makes authorization and future RLS policies simpler, but introduces redundant data. Composite foreign keys prevent inconsistent tenant and project relationships from being stored.

## D3. JSONB rule conditions vs normalized rows

**Decision:** Store rule conditions in a JSONB document because the snapshot builder and evaluator consume a structured condition document whose shape may evolve over time.

Validate the condition document against a versioned application schema when rules are written and again before publication. Keep rule identity, priority, and Boolean result in regular database columns.

Rules are evaluated in deterministic order: `(priority ASC, id ASC)`. Rule priority is not unique; the rule ID provides the stable tie-breaker. The MVP supports Boolean flag values only, so `FlagRule.result` is a non-null Boolean.

**Trade-off:** JSONB supports flexible, versioned condition documents, but database constraints alone cannot enforce every domain-specific condition. Application validation and tests must reject malformed or unsupported documents. Do not add JSONB indexes unless a real query needs to filter inside condition documents.

## D4. Archive vs delete, per entity

**Decision:** Archive organizations, projects, environments, and feature flags during normal product operation rather than physically deleting their records.

A feature-flag key remains reserved within its project even after the flag is archived. The database therefore enforces uniqueness across all flags in a project, not only active flags. A flag's key may be changed before its first successful publication; after publication, its key is immutable.

Published snapshots and audit events are historical records and must not be silently deleted or rewritten. SDK keys and refresh tokens are revoked or invalidated through controlled workflows rather than routinely deleting their security history. Membership removal must be audited, whether the membership row is deleted or represented as revoked.

Physical deletion belongs to a separate retention or privacy workflow with explicit foreign-key behavior. Core parent-child relationships use `RESTRICT` where deletion could invalidate retained records.

**Trade-off:** Archived records accumulate and normal listing queries must filter them. Reusing an archived flag key is not supported by the MVP policy.

## D5. `ON DELETE` for every foreign key

**Decision:** Choose deletion behavior explicitly for each relationship. Use `RESTRICT` for core ownership relationships and retained historical records. Use `SET NULL` only where the referenced relationship is optional and losing it must not delete the dependent record. Use `CASCADE` only for relationships where dependent data is genuinely disposable with its parent.

The agreed behavior includes:

- **Organization and project ownership:** prevent physical deletion while retained child records depend on the parent.
- **Environment and flag configuration:** prevent deletion that would invalidate retained snapshots or other protected records; normal lifecycle operations use archiving.
- **SDK key ownership:** `SdkKey.createdByUserId` uses `ON DELETE RESTRICT` to preserve creator attribution for retained SDK-key history.
- **PublishedSnapshot.createdByUserId:** use `RESTRICT` so the referenced user cannot be physically deleted while retained snapshots refer to that user.
- **AuditLog.actorUserId:** store the actor ID as a historical identifier without a foreign key to `User`. This preserves the audit record independently of the user's lifecycle.
- **RefreshToken.replacedByTokenId:** use a self-referencing foreign key with `ON DELETE SET NULL`, so removal of a referenced replacement does not require deleting the referring token.

Do not use cascading deletion for audit logs or published snapshots. Any additional foreign key must have its `ON DELETE` behavior recorded explicitly in the schema design.

**Trade-off:** Restrictive relationships require deliberate archival, retention, and privacy workflows. This is intentional: normal deletion must not silently erase publication history or evidence of sensitive actions.

## D6. ACTIVE and PENDING snapshot uniqueness

**Decision:** Enforce at most one `ACTIVE` snapshot and at most one `PENDING` snapshot per environment using partial unique indexes created in hand-written migration SQL.

Conceptually, the indexes are:

```sql
CREATE UNIQUE INDEX "PublishedSnapshot_one_active_per_environment"
ON "PublishedSnapshot" ("environmentId")
WHERE "status" = 'ACTIVE';

CREATE UNIQUE INDEX "PublishedSnapshot_one_pending_per_environment"
ON "PublishedSnapshot" ("environmentId")
WHERE "status" = 'PENDING';
```

Prisma schema syntax does not directly represent these partial unique indexes. The migration SQL is therefore part of the required database design and must be preserved and tested.

Zero `ACTIVE` snapshots is valid before the first successful publication or when no publication is currently active. A stuck `PENDING` snapshot must be handled by reconciliation, which determines whether the publication can be completed or must be marked `FAILED`. Reconciliation must not create a second pending publication for the same environment.

Publication reserves the new snapshot and version before uploading its immutable payload to R2. After successful upload and verification, one database transaction changes the previous `ACTIVE` snapshot to `SUPERSEDED` and the new snapshot to `ACTIVE`. The old row must be changed first because the partial unique index is not deferrable. Failed publication work is marked `FAILED`, and reconciliation handles abandoned pending work.

**Trade-off:** Partial unique indexes require custom migration SQL, but they enforce the publication invariants even when concurrent requests race.

## D7. Draft revisions and published state

**Decision:** `Environment.draftRevision` is a non-null integer counter initialized to `0`. Every accepted draft mutation that can affect an environment's serialized snapshot increments the corresponding revision in the same database transaction as the mutation.

Publish requests include `expectedDraftRevision`. The publication operation must compare that value with the current revision under transaction-level concurrency control. A stale revision returns HTTP `409 Conflict`; it must not publish a snapshot built from outdated draft state.

`FeatureFlag` metadata is project-level and may affect every environment in that project. A metadata mutation must therefore update the draft revision of every non-archived environment in the project within the same transaction. Lock or update those environment rows in deterministic `id` order to reduce deadlock risk.

**Published state:** The `ACTIVE` `PublishedSnapshot` row is the sole canonical pointer to the currently published state. Do not add `Environment.publishedVersion`. The snapshot records the `draftRevision` from which its immutable payload was built.

**Publication lifecycle:**

1. Lock the target environment and validate `expectedDraftRevision`.
2. Reserve a new version and insert a `PENDING` snapshot row in PostgreSQL.
3. Build and upload the immutable snapshot payload to R2.
4. Verify the uploaded payload and checksum.
5. In one database transaction, change the previous `ACTIVE` row to `SUPERSEDED` and the new row to `ACTIVE`.
6. If publication fails, mark the pending snapshot `FAILED` when possible; reconciliation resolves interrupted work.

A rollback does not reactivate or mutate an old snapshot. It creates a new snapshot version from the selected historical content, restores that content to the draft, increments `draftRevision`, and records the original version in `sourceVersion`. This keeps publication history immutable and ensures the draft and its revision describe the restored content.

**Draft mutation:** Perform the revision comparison and all related flag, config, and rule changes in one transaction. If any part fails, roll back the entire mutation, including its revision increment.

**Trade-off:** Per-environment revisions make stale edits and publication races detectable. Updating multiple environment revisions for project-level metadata creates additional writes, which is accepted for the MVP in exchange for a consistent concurrency boundary.

## D8. Types, enums, timestamps, and case sensitivity

**Decision:** Use database enums for membership role, flag type, SDK key type, and published snapshot status. The MVP flag type is `BOOLEAN`. Adding enum values requires a migration. Use a lookup table instead only when values must be managed by users or changed frequently without deployment.

Use UUIDv7 for primary keys. Define Prisma model IDs consistently as `String @id @default(uuid(7)) @db.Uuid`. Prisma Client generates the ID when creating a record without an explicitly supplied ID; PostgreSQL stores it using its native `uuid` type. Do not configure a separate PostgreSQL-side UUID default for these columns. Any direct SQL writer that bypasses Prisma Client must supply a valid ID itself.

Use `timestamptz` for instants, with a consistent precision such as Prisma `@db.Timestamptz(3)`. Application code must handle timestamps as UTC-aware instants.

Store one canonical lowercase email value. Normalize email addresses to lowercase in application code before writing them, enforce `CHECK (email = lower(email))`, and use a regular unique constraint on `email`. Do not rely on a unique expression index over `lower(email)` because the application uses the ordinary unique column constraint.

Slugs and flag keys use lowercase ASCII kebab-case and must match the documented syntax:

```regex
^[a-z0-9]+(-[a-z0-9]+)*$
```

The allowed length is 1–63 characters. The application normalizes input where appropriate, while database `CHECK` constraints reject values that are not in the canonical format. Do not add duplicate normalized columns such as `normalizedSlug`.

**Trade-off:** UUIDv7 provides time-ordered identifiers while keeping ID generation in Prisma Client. Direct SQL inserts must supply their own IDs. Enums and database checks prevent invalid values from being stored, but changes to the supported values or formats require deliberate migrations. All writers must apply the same normalization rules.

---

# E. Stress tests

These are transaction-level scenarios to test after the schema and application operations exist. They are planned tests, not claims that the behavior has already been implemented or verified.

## E1. Two admins edit the same flag at once

1. Both clients read the same environment with `draftRevision = 12`.
2. Admin A submits an edit with `expectedDraftRevision = 12`. Its transaction validates the request, applies the flag/config/rule changes, and increments the environment revision from 12 to 13.
3. Admin B submits a different edit with `expectedDraftRevision = 12`. Its revision compare-and-swap detects that the revision is stale.
4. Admin B's entire transaction rolls back. It must not leave partially changed flag, config, or rule rows.
5. The application returns HTTP `409 Conflict` and asks Admin B to reload or merge the changes.

**Rows and constraints involved:** `Environment.draftRevision`; `FeatureFlag`; `FlagEnvironmentConfig`; `FlagRule`; unique `(projectId, key)`; unique `(environmentId, flagId)`; composite foreign keys.

**Expected result:** Only one edit succeeds against revision 12. The losing transaction leaves no partial changes.

## E2. Two admins publish the same environment simultaneously

1. Both requests target the same environment and include an expected draft revision.
2. Each publication operation acquires the environment lock using `SELECT ... FOR UPDATE`, or an equivalent serialization mechanism.
3. The winning request verifies the expected draft revision, allocates the next version while holding the environment lock, and inserts a `PENDING` snapshot row within a transaction. Version allocation must not rely on a value read before acquiring the lock.
4. If archiving commits before the activation transaction acquires the project lock, activation must observe the archived state and abort. Any already-uploaded but unactivated R2 object is handled by the reconciliation/cleanup policy.
5. If publication reserves its `PENDING` snapshot first, archiving may still commit while the R2 upload is in progress because the upload occurs outside the database transaction. The activation transaction must therefore recheck the project and environment archive state while holding the project lock before activating the snapshot.

**Expected result:** No publication can activate a snapshot after the
project or environment has been archived. Locking and rechecking state
inside the activation transaction—not an earlier application-level
check—must prevent the race. 6. The competing request must recheck the current revision and publication state after acquiring its lock. It must return a conflict if its expected revision is stale or another pending publication already exists.

**Rows and constraints involved:** `Environment`; `PublishedSnapshot`; unique `(environmentId, version)`; partial unique indexes allowing at most one `ACTIVE` and one `PENDING` snapshot per environment.

**Expected result:** No publication can activate a snapshot after the project or environment has been archived. Locking and rechecking state inside the activation transaction—not an earlier application-level check—must prevent the race.

## E3. A project is archived while a publish is in flight

1. The publish operation and the project-archive operation use a consistent lock order: project first, then environment.
2. Publishing acquires a shared lock on the project row and an update lock on the environment row. Archiving acquires an update lock on the project row.
3. Publishing verifies that the project and environment are not archived before reserving or activating a publication, according to the publication lifecycle.
4. If archiving acquires its lock first and commits, publishing must observe the archived state and abort.
5. If publishing acquires its lock first, archiving waits until the publication transaction releases its lock. The publication may finish first, after which archiving proceeds and prevents future publications.
6. Physical deletion is not used for normal archival. Foreign-key restrictions protect retained snapshots and history.

**Rows and constraints involved:** `Project.archivedAt`; `Environment.archivedAt`; `PublishedSnapshot`; foreign keys; transaction locks.

**Expected result:** No publication can pass the archive check using stale state. The lock protocol—not merely checking `archivedAt` in application code—must prevent the race.

## E4. An SDK key is revoked while an evaluator has cached its hash

1. Key rotation creates a new `SdkKey` row with a new unique hash. The old hash is never mutated to become the new key.
2. The control plane revokes the old key in PostgreSQL and updates or invalidates the corresponding Redis key-index entry.
3. The evaluator resolves SDK keys from Redis only. It never queries PostgreSQL, including when a key is missing from Redis.
4. Redis key-index entries do not rely on TTL for correctness. The evaluator's in-memory copy of key-index data has a maximum TTL of 15 seconds.
5. The revocation propagation target is 20 seconds total: 15 seconds for the in-memory cache lifetime plus a 5-second operational margin.
6. Tests verify that the old key is rejected within the target under the supported cache and propagation behavior.

**Rows and constraints involved:** `SdkKey.keyHash`; `revokedAt`; `expiresAt`; unique key hash; Redis key index; evaluator in-memory cache.

**Expected result:** The old key cannot remain accepted beyond the documented revocation target under normal supported operation. Instant revocation is not claimed.

## E5. The control-plane process crashes after R2 upload but before activation

1. The control plane reserves a `PENDING` snapshot and version in PostgreSQL under the environment lock. The row records the `storageKey`, checksum, size, and captured `draftRevision`.
2. The control plane uploads the immutable payload to R2 and verifies the stored object's metadata and checksum.
3. If the process crashes before activation, the previous `ACTIVE` snapshot remains the canonical live state. The existence of an R2 object does not make a snapshot active.
4. A reconciler scans stale `PENDING` rows using access pattern #16 and a dedicated worker database role.
5. If the object exists, its checksum matches, and the project's/environment's state and captured revision still satisfy the publication policy, the reconciler may resume activation.
6. If the publication cannot safely be completed, the reconciler marks it `FAILED`. An unreferenced R2 object may be deleted after the configured retention window.
7. Activation locks the project first and the environment second, rechecks archive state and revision policy, changes the previous `ACTIVE` row to `SUPERSEDED`, and then changes the pending row to `ACTIVE` in one database transaction.

**Rows and constraints involved:** `PublishedSnapshot.status`; `storageKey`; `checksum`; `draftRevision`; unique `(environmentId, version)`; partial unique indexes for `ACTIVE` and `PENDING`; worker reconciliation privileges.

**Expected result:** A crash never makes an unactivated snapshot live. Reconciliation is idempotent and cannot activate stale or invalid publication state.

## E6. Redis is lost and the evaluator must recover

1. After Redis loss, the evaluator does not fall back to PostgreSQL. A missing or unavailable key index must never cause a database query from the evaluator.
2. While the required Redis indexes are unavailable or rebuilding, key resolution returns HTTP `503 Service Unavailable`. Once the key index is ready, a genuinely unknown key returns HTTP `401 Unauthorized`.
3. The control-plane recovery worker rebuilds the SDK-key index from active, unexpired, non-revoked `SdkKey` rows in bounded batches, using access pattern #20.
4. The worker also rebuilds the current-version pointers from all `ACTIVE` `PublishedSnapshot` rows across tenants, using access pattern #21. It must not rebuild pointers from `PENDING`, `SUPERSEDED`, or `FAILED` snapshots.
5. The rebuild uses the dedicated worker credential because these operations intentionally scan across tenants. The ordinary application role must not receive broad cross-tenant privileges or `BYPASSRLS`.
6. Rebuilding is idempotent. Each SDK-key entry maps the hash to the required environment and key metadata; each environment pointer resolves to its canonical active snapshot version and payload reference.
7. The system marks recovery ready only after the required indexes and pointers have been rebuilt and verified. Partial recovery must not be reported as complete.
8. Periodic reconciliation and revocation updates repair subsequent drift. The revocation propagation target remains 20 seconds under the documented operating assumptions.
9. Integration tests flush Redis, trigger recovery, verify that both indexes are rebuilt, and confirm that revoked/expired keys are not accepted and only active snapshot versions are served.

**Rows and constraints involved:** `SdkKey`; `PublishedSnapshot`; access patterns #20 and #21; worker-role privileges; Redis key index and active-snapshot pointers.

**Expected result:** Redis can be rebuilt from PostgreSQL control-plane state without introducing PostgreSQL access into the evaluator hot path. The evaluator remains independent of PostgreSQL, and a warm evaluator can continue serving its valid in-memory cached state during a PostgreSQL outage.

---

# Questions in my own words

## 1. Why isn't an index free?

PostgreSQL must maintain every index when rows are inserted, updated,
or deleted. Indexes consume storage and memory, increase write and WAL
work, and add maintenance overhead.

An index is justified when it supports a known query pattern from
section A, enforces uniqueness, or supports a required foreign key or
ordering. We should not add indexes speculatively.

## 2. Why add a database constraint when the application already checks the same rule?

Application-level checks alone are not sufficient under concurrency.
Two requests can both check that a value is available before either
request writes it.

A database constraint enforces the invariant at the storage boundary,
regardless of which application instance or script performs the write.
The application should still validate input and return useful errors,
but the database constraint is authoritative.

## 3. Why shouldn't deleting a user delete their audit history?

Audit events must remain available even when the user who performed an
action is no longer active.

`AuditLog.actorUserId` and `actorLabel` are historical values, not a
foreign-key relationship. The application role may `INSERT` and
`SELECT` audit rows, but it may not `UPDATE` or `DELETE` them.

This preserves audit history without making it dependent on the
lifecycle of a user account.

## 4. Why archive flags instead of deleting them?

An archived flag can still be referenced by historical snapshots,
audit events, or operational records. Keeping the row preserves that
history and prevents another flag from accidentally reusing the same
identity.

Flag keys remain reserved after archival. Archiving removes a flag from
normal active workflows without erasing its history or changing the
meaning of previously published snapshots.

---

# F. RLS readiness (planned; no policies yet)

This section defines the requirements for introducing PostgreSQL
Row-Level Security (RLS). It does not define or enable RLS policies yet.

The database schema, composite foreign keys, runtime roles, and
authorization checks must be designed so that RLS can be introduced
without changing the domain model.

## Entity classification

| Entity                  | Classification               | Has `organizationId`?         | Reason / caveat                                                                                                                      |
| ----------------------- | ---------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `User`                  | Global                       | No                            | Login and identity lookup happen before an organization is selected.                                                                 |
| `Organization`          | Tenant root                  | No separate tenant identifier | The organization's own ID identifies the tenant. Access is membership- and authorization-controlled.                                 |
| `Membership`            | Mixed / special              | Yes                           | Organization membership is tenant-scoped, but users must be able to discover their own memberships before selecting an organization. |
| `Project`               | Tenant-scoped                | Yes                           | Main authorization boundary and common tenant-scoped listing filter.                                                                 |
| `Environment`           | Tenant-scoped                | Yes                           | Must belong to the same organization and project as its parent.                                                                      |
| `FeatureFlag`           | Tenant-scoped                | Yes                           | Flag management and direct ID lookups must respect tenant and project boundaries.                                                    |
| `FlagEnvironmentConfig` | Tenant-scoped                | Yes                           | Composite foreign keys must prevent organization, project, environment, and flag mismatches.                                         |
| `FlagRule`              | Tenant-scoped                | Yes                           | Inherits tenant identity through its configuration; the composite FK must prevent tenant mismatch.                                   |
| `SdkKey`                | Tenant-scoped for management | Yes                           | Management operations require tenant isolation. SDK-key resolution is a separate Redis-only data-plane operation.                    |
| `PublishedSnapshot`     | Tenant-scoped                | Yes                           | Snapshot history and active snapshot metadata must be tenant-isolated.                                                               |
| `AuditLog`              | Tenant-scoped                | Yes                           | Audit queries must be tenant-filtered; audit rows are append-only for the application role.                                          |
| `RefreshToken`          | Mixed / special              | No                            | Refresh starts from token hash/family and user identity, before organization context exists.                                         |

## Access patterns without organization context

The following operations cannot depend on an already-selected organization.
They require narrowly scoped access paths rather than a generic policy
that permits access to all tenants.

- **#1 Login by email:** Find a user using normalized email. Do not
  require `app.current_org`. Return only the data required for
  authentication and apply rate limiting at the application or gateway
  layer.

- **#2 Refresh-token rotation and reuse detection:** Look up the token
  by its hash or family and validate its relationship to the user.
  This flow must work before organization selection and must not grant
  access to tenant-owned data.

- **#3 Membership and organization discovery:** A user may read their
  own memberships before selecting an organization. They must not be
  able to read other users' memberships merely because the selected
  organization context is absent.

- **#16 Pending-snapshot reconciliation:** The reconciler scans stale
  `PENDING` snapshots across organizations. This is a cross-tenant
  maintenance operation and uses a dedicated worker credential.

- **#17 Expired refresh-token cleanup:** Cleanup may scan tokens across
  users and organizations. It requires an explicitly authorized
  maintenance path rather than ordinary tenant-scoped request access.

- **#20 SDK-key index rebuild:** After Redis loss, the worker scans
  eligible SDK-key records across tenants and rebuilds the Redis key
  index. It uses a dedicated worker credential.

- **#21 Active-snapshot pointer rebuild:** The worker scans all
  `ACTIVE` snapshots across tenants and reconstructs the Redis
  current-version pointers. It uses a dedicated worker credential.

- **SDK-key resolution:** The evaluator reads the Redis key index and
  published data from Redis/R2. It has no PostgreSQL connection string
  and never falls back to PostgreSQL. During Redis index recovery,
  readiness remains false and key resolution returns `503`. Once the
  index is ready, an unknown key returns `401`.

- **Seed scripts and administrative tasks:** These use a separate,
  controlled operational credential or an explicitly tenant-scoped
  workflow. They must not silently reuse a database owner or
  superuser credential as the runtime application's connection.

## Database roles

The implementation uses separate credentials for schema changes,
normal application requests, and cross-tenant maintenance.

- **Migrator role:** Owns schema objects and runs database migrations.
  Its credentials are not available to normal application runtime
  processes. It may have the database-creation privileges required by
  the migration tooling, including a shadow database.

- **Control-plane app role:** A non-superuser login that does not own
  application tables, does not have `BYPASSRLS`, and does not have
  schema `CREATE` privileges. It receives only the table and column
  privileges needed by the control-plane API.

- **Worker role:** A separate, tightly controlled credential for
  cross-tenant reconciliation and maintenance, including patterns
  #16, #17, #20, and #21. It must not be the ordinary app role with
  broad permissions added implicitly. Its exact privileges must be
  documented and tested before these workers are implemented.

- **Evaluator runtime:** Has no PostgreSQL credentials and no
  `DATABASE_URL`. It uses Redis for the SDK-key index and cached
  snapshots, and R2 for published snapshot payloads.

- **Seed or administrative role:** If needed, this is an explicitly
  controlled operational credential. It must not be silently shared
  with the control-plane runtime.

No runtime role is a superuser or has `BYPASSRLS`. Local development
and CI must run application queries using the restricted app role,
not the PostgreSQL superuser or schema owner.

## Tenant context mechanism

For a tenant-scoped request, the application must:

1. Authenticate the user.
2. Verify that the user has the required membership and role in the
   requested organization.
3. Open a database transaction.
4. Set the organization context transaction-locally.
5. Execute the tenant-scoped queries on the same transaction connection.

The organization context can be set with a transaction-local operation
such as:

`set_config('app.current_org', organization_id, true)`

The final argument must be `true` so the setting is transaction-local.
An equivalent `SET LOCAL` approach is acceptable if it is implemented
safely with the database driver.

Never use session-level `SET` for request context on a pooled connection.
A setting that survives a request could be observed by the next request
that borrows the same connection.

If a policy also requires the authenticated user ID, use a separate
transaction-local context such as `app.current_user_id`. Its source
must be the authenticated server-side identity, not an unchecked value
supplied by the client.

All queries that rely on RLS must execute inside the transaction where
the required context is set. Queries without organization context must
use explicitly designed policies or narrowly scoped operations. There
must be no generic "allow all" fallback.

RLS policies and any helper functions are deferred to the database
security phase. If a security-definer helper is required to avoid
recursive membership or organization lookups, it must use a fixed,
safe `search_path` and have narrowly restricted execution privileges.
The design must not depend on granting `BYPASSRLS` to a runtime role.

## RLS test plan

These tests are required when RLS policies are introduced. They are not
evidence that RLS is already enabled.

1. Create organizations A and B, with projects, environments, flags,
   configurations, and snapshots in both organizations.

2. Connect using the restricted control-plane app role, not the table
   owner, migrator, or superuser.

3. Set the context to organization A transaction-locally. Verify that
   authorized reads and writes for A succeed and rows belonging to B
   are invisible or rejected.

4. Attempt a direct ID lookup for a flag belonging to B while the
   context is A. Verify that no unauthorized row is returned and no
   mutation succeeds.

5. Attempt to insert a child row whose `organizationId` is A but whose
   referenced parent belongs to B. Verify that the relevant composite
   foreign key rejects the mismatch.

6. Verify that missing or empty organization context cannot read or
   mutate tenant-owned rows.

7. Verify that the app role cannot disable RLS, alter policies, change
   table ownership, assume the migrator role, or bypass RLS.

8. Test login, refresh-token rotation, membership discovery, and
   cross-tenant maintenance independently because these operations do
   not all begin with a selected organization.

9. Verify that the worker credential can perform only its documented
   maintenance operations and cannot be used as the normal API
   connection.

10. Verify that the evaluator has no database connection configured
    and never performs a PostgreSQL lookup when a key or cached snapshot
    is missing.

11. Run a cross-tenant test as the table owner only to demonstrate why
    that role is unsuitable for proving RLS isolation. Owner-role
    results do not count as proof that the restricted app role is
    isolated.

12. Include clean-database migration tests confirming that required
    constraints, partial unique indexes, grants, and—once introduced—
    RLS policies are created correctly.

## RLS implementation boundary

RLS is a planned security-hardening milestone, not an implemented
feature of this domain-analysis document.

Before enabling it, verify that the entity classification, composite
foreign keys, role separation, transaction-local context, maintenance
access paths, and tests agree with the final schema.

The schema and application must remain secure without relying on
unimplemented RLS policies. Tenant authorization checks and composite
foreign keys are still required.

---

# G. Snapshot-to-schema mapping

## G1. Snapshot contract for one environment

The control plane builds a canonical JSON payload for each published
environment and stores the immutable payload in Cloudflare R2.
PostgreSQL stores the snapshot metadata and lifecycle state; Redis
caches published data and maintains the SDK-key index and current-version
pointers.

The example below represents an environment containing two BOOLEAN
flags. One flag has a targeting rule.

```json
{
  "schemaVersion": 1,
  "environment": {
    "id": "env_01J...",
    "key": "production",
    "version": 42,
    "draftRevision": 17
  },
  "flags": {
    "new-checkout": {
      "type": "BOOLEAN",
      "enabled": true,
      "defaultValue": false,
      "rules": [
        {
          "id": "rule_01J...",
          "priority": 10,
          "conditions": {
            "country": {
              "operator": "equals",
              "value": "MK"
            }
          },
          "value": true
        }
      ]
    },
    "maintenance-banner": {
      "type": "BOOLEAN",
      "enabled": false,
      "defaultValue": false,
      "rules": []
    }
  }
}
```

The payload is built from a consistent draft view. It is not stored as a
single JSON document in PostgreSQL.

| JSON path                   | Source (table.column)                 | Notes                                                                      |
| --------------------------- | ------------------------------------- | -------------------------------------------------------------------------- |
| `schemaVersion`             | Snapshot builder constant             | Payload contract version, not a database column.                           |
| `environment.id`            | `Environment.id`                      | Stable environment identifier.                                             |
| `environment.key`           | `Environment.key`                     | Canonical lowercase ASCII environment key.                                 |
| `environment.version`       | `PublishedSnapshot.version`           | Version allocated by the control plane.                                    |
| `environment.draftRevision` | `PublishedSnapshot.draftRevision`     | Draft revision captured by this snapshot.                                  |
| `flags` object key          | `FeatureFlag.key`                     | Unique within its project; archived flags are omitted from new snapshots.  |
| `flags._.type`              | `FeatureFlag.flagType`                | `BOOLEAN` for the MVP.                                                     |
| `flags._.enabled`           | `FlagEnvironmentConfig.enabled`       | Whether this flag is enabled in this environment.                          |
| `flags._.defaultValue`      | `FlagEnvironmentConfig.defaultValue`  | Required Boolean fallback value.                                           |
| `flags._.rules`             | `FlagRule` rows for the configuration | Ordered by `(priority ASC, id ASC)`.                                       |
| `rules[].id`                | `FlagRule.id`                         | Stable rule identifier for diagnostics and diffs.                          |
| `rules[].priority`          | `FlagRule.priority`                   | Duplicate priorities are allowed; ID provides a deterministic tie-breaker. |
| `rules[].conditions`        | `FlagRule.conditions`                 | Versioned JSON validated by the contracts package before save and publish. |
| `rules[].value`             | `FlagRule.result`                     | Boolean result when the rule matches.                                      |

1. If enabled is false, the evaluator returns false without
   evaluating any rules.
2. Otherwise, evaluate rules in ascending (priority, id) order.
3. Return the Boolean result of the first matching rule.
4. If no rule matches, return defaultValue.
   The MVP supports Boolean values only. defaultValue and rule results
   must be JSON booleans, never strings such as "true" or numbers such
   as 1.
   Deterministic serialization and integrity
   The snapshot builder must produce deterministic bytes:

- Use UTF-8 encoding.
- Use a stable JSON object-key ordering.
- Order flags deterministically by flag key.
- Order rules by (priority ASC, id ASC).
- Do not include insignificant whitespace in the canonical checksum
  representation.
- Compute SHA-256 over the exact bytes uploaded to R2.
  The resulting checksum and object size are stored in
  PublishedSnapshot. Each snapshot version uses a unique, deterministic
  storage key. Once uploaded and verified, its payload is immutable.

## G2. Publish lifecycle and source of truth

Publishing follows this sequence:

1. Reserve a version. Lock the relevant project and environment
   rows in the agreed order. Validate that neither is archived, check
   expectedDraftRevision, allocate the next environment version, and
   insert a PENDING snapshot row. The database enforces unique
   (environmentId, version) and at most one PENDING snapshot per
   environment.
2. Build a consistent payload. Read the environment configuration,
   non-archived flags, and rules from one consistent database snapshot.
   Verify that the revision observed in this read matches the revision
   reserved in `PublishedSnapshot.draftRevision`. If they differ, do
   not upload or activate the payload; fail the publication attempt
   according to the failure-handling policy. The payload must represent
   exactly the draft revision recorded in the reserved snapshot.
3. Upload outside the database transaction. Serialize the
   canonical payload, upload it to the versioned R2 object key, and
   verify its size and checksum. Do not hold a database transaction
   open while performing network I/O.
4. Activate in a short transaction. Lock Project FOR SHARE, then
   Environment FOR UPDATE, following the documented lock order.
   Re-check archive state and compare the current `draftRevision` with
   the revision captured in `PublishedSnapshot.draftRevision`. If the
   draft has changed or the environment is no longer publishable,
   do not activate the stale payload. Handle the failed attempt through
   the documented failure and reconciliation policy.
5. Switch the active version atomically. Change the existing
   ACTIVE snapshot to SUPERSEDED, then change the reserved
   PENDING snapshot to ACTIVE, within the same transaction. The
   partial unique index permits at most one ACTIVE snapshot per
   environment. Both state changes must commit atomically.
   If the transaction fails, it must roll back so the previous
   ACTIVE snapshot remains ACTIVE
   and the reserved snapshot remains PENDING until the failure-handling
   or reconciliation process transitions it to FAILED or safely retries
   activation.
6. Handle failures and crashes. If activation cannot complete,
   preserve the previous ACTIVE snapshot. Mark the failed attempt
   FAILED when appropriate. A reconciler handles abandoned PENDING
   rows and verifies the associated R2 object before attempting
   recovery.
   The existence of an R2 object does not make it live. The ACTIVE
   PublishedSnapshot row is the canonical live-state indicator.

Environment.publishedVersion is not stored. The active snapshot row
identifies the published version; its storageKey identifies the
immutable R2 payload. Redis is a cache and lookup layer, not the
authoritative publication record.
Rollback
Rollback does not reactivate or mutate an old snapshot.

It restores the content of a selected historical snapshot to the editable
draft in one transaction, using the same revision compare-and-swap rule
as any other draft mutation. The transaction increments
`Environment.draftRevision` atomically with the draft changes and
records the selected historical version as `PublishedSnapshot.sourceVersion`
for the new publication attempt.

The new version goes through the normal PENDING, upload, verification,
and activation lifecycle. The previous active snapshot remains
canonical until the new version is successfully activated.
G3. Draft revision rule
Environment.draftRevision is an integer counter with a database
default of 0.

Every draft mutation must:

1. Receive expectedDraftRevision.
2. Compare it with the current revision inside the transaction.
3. Return HTTP 409 Conflict if the expected revision is stale.
4. Apply all related draft changes and increment the revision atomically.
   A failed compare-and-swap must not leave partial draft changes.

Any project-level FeatureFlag metadata mutation that affects future
snapshot contents increments the revision of every non-archived
environment in that project within the same transaction.

To avoid deadlocks, acquire and update the affected environment rows
in a deterministic order, ascending by environment ID. All code paths
that acquire multiple project/environment locks must follow the
documented Project-before-Environment lock order.

This creates write amplification proportional to the number of
non-archived environments in a project. The MVP accepts that cost to
ensure that a publication cannot silently omit a relevant draft change.

A publication captures one revision. If that revision becomes stale
before activation, the publication must not replace the current active
snapshot with stale content.

---

# H. Index budget

This is the index inventory for the v2 domain model. Primary keys and
unique constraints create indexes and their write costs are included.
PostgreSQL does not automatically index referencing foreign-key columns.
Every composite foreign key must reference a primary key or a UNIQUE
constraint with the exact same ordered column tuple.

## H1. Index inventory

| Table                   | Index or constraint                                          | Access pattern / reason                                                                                                       |
| ----------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `User`                  | PRIMARY KEY (`id`)                                           | Direct user lookup.                                                                                                           |
| `User`                  | UNIQUE (`email`)                                             | #1: normalized email lookup and duplicate prevention. A separate CHECK constraint enforces `email = lower(email)`.            |
| `Organization`          | PRIMARY KEY (`id`)                                           | Direct organization lookup.                                                                                                   |
| `Organization`          | UNIQUE (`slug`)                                              | Global organization slug uniqueness.                                                                                          |
| `Membership`            | PRIMARY KEY (`id`)                                           | Direct membership lookup.                                                                                                     |
| `Membership`            | UNIQUE (`organizationId`, `userId`)                          | #14, #15: one membership per user and organization; supports organization/user authorization lookup.                          |
| `Membership`            | INDEX (`userId`, `organizationId`)                           | #3: list organizations for a user.                                                                                            |
| `Project`               | PRIMARY KEY (`id`)                                           | Direct project lookup and project-level locking.                                                                              |
| `Project`               | UNIQUE (`organizationId`, `slug`)                            | #4: organization-scoped slug uniqueness and project listing by organization.                                                  |
| `Project`               | UNIQUE (`organizationId`, `id`)                              | Composite FK target for children that must prove the project belongs to the specified organization.                           |
| `Environment`           | PRIMARY KEY (`id`)                                           | Direct environment lookup and environment-level locking.                                                                      |
| `Environment`           | UNIQUE (`projectId`, `key`)                                  | #4, #6: unique environment key within a project and environment lookup by project.                                            |
| `Environment`           | UNIQUE (`organizationId`, `id`)                              | Composite FK target for children that store `organizationId` and `environmentId` but not `projectId`.                         |
| `Environment`           | UNIQUE (`organizationId`, `projectId`, `id`)                 | Composite FK target for children that must prove organization, project, and environment all match.                            |
| `FeatureFlag`           | PRIMARY KEY (`id`)                                           | Direct flag lookup.                                                                                                           |
| `FeatureFlag`           | UNIQUE (`projectId`, `key`)                                  | #5, #13: flag key uniqueness within a project, including archived flags.                                                      |
| `FeatureFlag`           | UNIQUE (`organizationId`, `projectId`, `id`)                 | Composite FK target for configurations that must prove organization and project ownership.                                    |
| `FlagEnvironmentConfig` | PRIMARY KEY (`id`)                                           | Direct configuration lookup.                                                                                                  |
| `FlagEnvironmentConfig` | UNIQUE (`environmentId`, `flagId`)                           | #6, #18: one configuration per environment and flag; supports environment snapshot building.                                  |
| `FlagEnvironmentConfig` | UNIQUE (`organizationId`, `id`)                              | Composite FK target for `FlagRule(organizationId, flagEnvironmentConfigId)`.                                                  |
| `FlagRule`              | PRIMARY KEY (`id`)                                           | Direct rule identity.                                                                                                         |
| `FlagRule`              | INDEX (`flagEnvironmentConfigId`, `priority`, `id`)          | #6, #18: retrieve rules for a configuration in deterministic `(priority, id)` order. Priority is not unique.                  |
| `SdkKey`                | PRIMARY KEY (`id`)                                           | #19: direct SDK-key management and revocation.                                                                                |
| `SdkKey`                | UNIQUE (`keyHash`)                                           | #10: lookup by hash; raw SDK keys are never stored.                                                                           |     |
| `SdkKey`                | PARTIAL INDEX (`id`) WHERE `revokedAt IS NULL`               | #20: scan non-revoked SDK keys when rebuilding the Redis key index; expiry is filtered by the query.                          |
| `PublishedSnapshot`     | PRIMARY KEY (`id`)                                           | Direct snapshot lookup.                                                                                                       |
| `PublishedSnapshot`     | UNIQUE (`environmentId`, `version`)                          | #9, #18: unique version per environment and version-history lookup.                                                           |
| `PublishedSnapshot`     | PARTIAL UNIQUE (`environmentId`) WHERE `status = 'ACTIVE'`   | #8, #21: enforce at most one ACTIVE snapshot per environment and support scanning active snapshots for Redis pointer rebuild. |
| `PublishedSnapshot`     | PARTIAL UNIQUE (`environmentId`) WHERE `status = 'PENDING'`  | #16: enforce at most one PENDING snapshot per environment.                                                                    |
| `PublishedSnapshot`     | PARTIAL INDEX (`createdAt`, `id`) WHERE `status = 'PENDING'` | #16: find and reconcile old PENDING snapshots across tenants.                                                                 |
| `AuditLog`              | PRIMARY KEY (`id`)                                           | Direct audit row identity.                                                                                                    |
| `AuditLog`              | INDEX (`organizationId`, `createdAt DESC`, `id DESC`)        | #12: tenant-scoped audit pagination.                                                                                          |
| `RefreshToken`          | PRIMARY KEY (`id`)                                           | Direct token identity.                                                                                                        |
| `RefreshToken`          | UNIQUE (`tokenHash`)                                         | #2: refresh-token lookup by hash.                                                                                             |
| `RefreshToken`          | INDEX (`familyId`)                                           | #2: family revocation and reuse detection.                                                                                    |
| `RefreshToken`          | INDEX (`expiresAt`, `id`)                                    | #17: bounded cleanup of expired refresh tokens.                                                                               |
| `Membership`            | INDEX (organizationId, createdAt DESC, id DESC)              | #15: list organization members in stable creation order.                                                                      |

The project-listing pattern does not need a separate index: the leading
`organizationId` column in `UNIQUE (organizationId, slug)` already
supports it. No separate index is added unless an access pattern justifies
its storage and write cost.

## H2. Composite foreign-key targets

Use the following exact tuples when defining composite foreign keys.
The referenced tuple must have a matching PRIMARY KEY or UNIQUE
constraint; matching only part of a tuple is not sufficient.

| Child tuple                                                       | Referenced parent tuple                      | Purpose                                                                                        |
| ----------------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `Project(organizationId)`                                         | `Organization(id)`                           | A project belongs to an existing organization. This is a single-column FK, not a composite FK. |
| `Environment(organizationId, projectId)`                          | `Project(organizationId, id)`                | Environment and project belong to the same organization.                                       |
| `FeatureFlag(organizationId, projectId)`                          | `Project(organizationId, id)`                | Flag and project belong to the same organization.                                              |
| `FlagEnvironmentConfig(organizationId, projectId, environmentId)` | `Environment(organizationId, projectId, id)` | Configuration environment belongs to the same organization and project.                        |
| `FlagEnvironmentConfig(organizationId, projectId, flagId)`        | `FeatureFlag(organizationId, projectId, id)` | Configuration flag belongs to the same organization and project.                               |
| `FlagRule(organizationId, flagEnvironmentConfigId)`               | `FlagEnvironmentConfig(organizationId, id)`  | Rule and configuration belong to the same organization.                                        |
| `SdkKey(organizationId, environmentId)`                           | `Environment(organizationId, id)`            | SDK key and environment belong to the same organization.                                       |
| `PublishedSnapshot(organizationId, projectId, environmentId)`     | `Environment(organizationId, projectId, id)` | Snapshot and environment belong to the same organization and project.                          |

`FlagEnvironmentConfig` also has `UNIQUE (environmentId, flagId)`,
which prevents duplicate configurations for one environment/flag pair.
The composite foreign keys enforce organization and project consistency;
they do not replace this uniqueness constraint.

## H3. Partial indexes and lifecycle constraints

The following PostgreSQL partial unique indexes are required:

```sql
CREATE UNIQUE INDEX "PublishedSnapshot_one_active_per_environment"
ON "PublishedSnapshot" ("environmentId")
WHERE "status" = 'ACTIVE';

CREATE UNIQUE INDEX "PublishedSnapshot_one_pending_per_environment"
ON "PublishedSnapshot" ("environmentId")
WHERE "status" = 'PENDING';
```

These partial indexes must be created in a SQL migration. The ACTIVE
constraint permits zero active snapshots before an environment's first
successful publish. The PENDING constraint prevents concurrent publish
attempts from reserving multiple pending versions for one environment.

Activation must change the old ACTIVE row to SUPERSEDED before changing
the new row to ACTIVE, within the same transaction. A reconciler handles
abandoned PENDING rows.
H4. Database privileges are not indexes
The runtime application role must not own these tables.

- AuditLog: application role may INSERT and SELECT, but not UPDATE
  or DELETE.
- PublishedSnapshot: application role may update only status,
  activatedAt, and failureCode.
- SdkKey: application role may update only revokedAt and, if used,
  lastUsedAt.
- Cross-tenant reconciliation and Redis index rebuilding use a separate
  worker credential; do not grant the normal application role broad
  cross-tenant access or BYPASSRLS.
  Before schema implementation, verify every composite FK against the
  exact referenced UNIQUE tuple and test the constraints using the restricted
  application role. Do not add extra indexes without a documented access
  pattern.

---

# Decisions accepted for v2

1. Flag configuration is per environment (`FlagEnvironmentConfig`); one logical flag may differ across development, staging, and production.
2. Evaluator database dependency: **option (b)**. SDK key index is published to Redis by control plane; evaluator never queries PostgreSQL. A Redis-loss rebuild is owned by the control plane.
3. R2 stores immutable published snapshot payloads. PostgreSQL stores metadata and the canonical active pointer; Redis is cache.
4. Snapshot lifecycle is `PENDING → ACTIVE → SUPERSEDED`, with `FAILED` for unrecoverable attempts. A never-published environment has zero ACTIVE rows.
5. `PublishedSnapshot` is the only source of truth for live publication; no `Environment.publishedVersion` column.
6. Membership roles are `OWNER`, `ADMIN`, `EDITOR`, `VIEWER`. At least one OWNER per organization is enforced in application transactions locking the organization row, with a concurrency test.
7. Archived flag keys remain reserved. Flag keys and slugs are lowercase ASCII kebab-case, rejected on invalid format, and protected by database CHECK constraints.
8. MVP flag type is `BOOLEAN`. Rule priority is non-unique; evaluation order is `(priority, id)`.
9. Draft writes are one transaction, compare-and-swap first; stale `expectedDraftRevision` returns HTTP 409.
10. Cache and revocation: Redis entries do not expire through TTL and are repaired by reconciliation. The evaluator's in-memory cache has a 15-second TTL. The SDK-key revocation target is 20 seconds total: 15 seconds plus a 5-second operational margin. This target must be validated under the supported operating conditions.
11. Audit rows retain `actorUserId` and a denormalized `actorLabel`, with no FK to User; ordinary account lifecycle disables users rather than physically deleting them.
12. RLS is planned hardening, enabled after Phase 4. Tests must run as a restricted non-owner role to prove policy behavior.
13. AuditLog partitioning is **not planned for MVP**. Revisit only if measured row volume/query latency or retention operations justify partitioning; partitioning would require a partition-compatible primary key.
14. All version/revision counters use PostgreSQL `INTEGER` / Prisma `Int` for MVP; overflow is not a realistic product-scale concern.
15. Project archive and publish use compatible row locks. Publish locks Project `FOR SHARE`, then Environment `FOR UPDATE`; archive locks Project `FOR UPDATE`. Both acquire locks in Project-before-Environment order.

---

# Deferred decisions (owner and trigger)

- **Prisma UUIDv7 default semantics** — Owner: project developer. Trigger: before writing schema/migration. Run a minimal Prisma 7.10 insert test and inspect generated SQL; do not assume PostgreSQL 17 has native `uuidv7()`.
- **RLS policy SQL and second context setting `app.current_user_id`** — Owner: project developer. Trigger: Phase 4 hardening. Policies must avoid recursive Membership/Organization lookups by using a narrowly scoped security-definer helper with fixed `search_path`, or another tested non-recursive policy design; no broad BYPASSRLS runtime role.
- **`db://` validation and evaluator config semantics** — Owner: project developer. Trigger: before Step 2. Inspect `env.schema`, `loadEnvironment`, and `AppModule.register`; explicitly test whether `db://` is rejected and whether evaluator omits Prisma even when `DATABASE_URL` is present.
- **SDK key storage/cache transport implementation** — Owner: project developer. Trigger: before evaluator implementation. Keep key index in Redis and published payload in R2; document readiness semantics and reconciliation behavior.

---

# Questions to explain before Step 2

1. If both a pointer column and a status column say what is live, the two can disagree after a partial write or bug. V2 removes the pointer column and makes the ACTIVE snapshot row canonical; the partial unique index prevents two ACTIVE rows, while the transaction protocol ensures the old ACTIVE row is superseded before the new row becomes ACTIVE.
2. `organizationId` match alone does not prove project match: a flag and environment can belong to different projects in the same organization. Composite FKs include project identity and tenant identity.
3. `ON DELETE SET NULL` updates an audit row during actor deletion, conflicting with append-only enforcement. V2 stores the actor ID and label as historical values without an actor FK.
4. Evaluator DB lookup contradicts the goal that evaluation survives PostgreSQL outage. V2 makes the control plane publish a Redis key index; evaluator reads Redis/R2 only and never has a database connection string.
5. A table owner may bypass RLS by default, so a test as owner can read cross-tenant rows even when policies would block a normal app role. RLS tests must use the restricted non-owner runtime role.

---

# Final decisions and implementation readiness

## 1. Decisions accepted for v2

The following domain and architecture decisions are settled for the
MVP. They are requirements for schema design and implementation, not
claims that every behavior has already been implemented or tested.

1. **Environment-specific configuration:** each flag has a separate
   `FlagEnvironmentConfig` for each environment. The same logical flag
   may have different settings in development, staging, and production.

2. **Evaluator database isolation:** the evaluator never queries
   PostgreSQL, including on a cache miss. The control plane publishes
   the SDK-key index to Redis; published snapshot payloads are stored
   in R2.

3. **Snapshot source of truth:** R2 stores immutable snapshot payloads.
   PostgreSQL stores snapshot metadata and determines the canonical live
   version through the snapshot with `status = ACTIVE`. Redis is a
   runtime cache. There is no `Environment.publishedVersion` column.

4. **Snapshot lifecycle:** `PENDING → ACTIVE → SUPERSEDED`, with
   `FAILED` for an unrecoverable publication attempt. An environment
   that has never been published may have zero ACTIVE snapshots.

5. **Membership roles:** `OWNER`, `ADMIN`, `EDITOR`, and `VIEWER`.
   The application enforces at least one active OWNER per organization
   in a transaction that locks the organization row. Concurrent owner
   changes must be tested.

6. **Slug and flag-key format:** lowercase ASCII kebab-case, length
   1–63, matching `^[a-z0-9]+(-[a-z0-9]+)*$`. The application
   normalizes input; database CHECK constraints reject invalid stored
   values. Organization slugs are globally unique; project slugs are
   unique within an organization.

7. **Archived flags:** archiving a flag does not release its key.
   Keys remain reserved within their project. A flag key may change
   before the first successful publication but is immutable afterward.

8. **Flag type and rules:** the MVP supports Boolean flags only.
   `FlagEnvironmentConfig.defaultValue` and `FlagRule.result` are
   PostgreSQL Boolean values. Rule priority is not unique; rules are
   evaluated in `(priority ASC, id ASC)` order.

9. **Draft concurrency:** draft mutations use compare-and-swap against
   `expectedDraftRevision`. A stale revision returns HTTP 409. Related
   writes and the revision increment occur atomically.

10. **Cache and revocation:** Redis entries have no TTL and are repaired
    by reconciliation. The evaluator's in-memory cache has a 15-second
    TTL. The SDK-key revocation target is 20 seconds total: 15 seconds
    plus a 5-second operational margin. This is a target to validate,
    not a guarantee independent of system availability.

11. **Audit history:** `AuditLog.actorUserId` and `actorLabel` are
    historical values without a foreign key to `User`. Audit rows are
    append-only for the runtime application role. Ordinary account
    lifecycle disables users rather than physically deleting them.

12. **Row-level security:** RLS is planned hardening after the initial
    domain and application flows are established. Tests must use a
    restricted non-owner role; table-owner tests alone do not prove RLS
    isolation.

13. **Audit partitioning:** not planned for the MVP. Reconsider only if
    measured volume, query latency, or retention operations justify it.
    Partitioning would require revisiting primary-key and uniqueness
    design.

14. **Revision and version types:** use PostgreSQL `INTEGER` and Prisma
    `Int` for MVP revision and version counters.

15. **Project archive and publication locks:** publication locks Project
    `FOR SHARE` before Environment `FOR UPDATE`. Archiving locks Project
    `FOR UPDATE`. All relevant flows acquire locks in Project-before-
    Environment order.

16. **Deterministic publication:** serialize snapshot JSON
    deterministically, calculate SHA-256 over the exact uploaded bytes,
    and use a unique versioned R2 storage key. A rollback creates a new
    snapshot version, restores historical content to the draft,
    increments `draftRevision`, and records `sourceVersion`.

17. **Database privileges:** the runtime application role is not a
    table owner. AuditLog, PublishedSnapshot, and SdkKey mutations are
    restricted as specified in Section H. Cross-tenant worker jobs use
    a separate worker credential.

---

## 2. Deferred implementation checks

These are specific implementation checks, not unresolved domain-model
choices. Complete them before the relevant implementation step.

### 2.1 Prisma UUIDv7 behavior

**Trigger:** before writing `schema.prisma` and the first migration.

Run a minimal test with the installed Prisma version and inspect the
generated SQL. Confirm how Prisma's UUIDv7 default is generated and
whether raw SQL inserts need to provide an ID. Do not assume PostgreSQL
17.4 provides a native `uuidv7()` function.

### 2.2 Environment validation and evaluator registration

**Trigger:** before schema and migration work.

Inspect `env.schema`, `loadEnvironment`, and `AppModule.register`.
Verify these behaviors explicitly:

- Whether `DATABASE_URL` beginning with `db://` is rejected.
- Whether `APP_ROLE=evaluator` omits Prisma initialization and provider
  registration even when `DATABASE_URL` is present.
- Whether evaluator startup remains independent of PostgreSQL
  configuration as intended.

Add or update tests for the confirmed behavior.

### 2.4 Worker and migration credentials

**Trigger:** before integration tests depend on database privileges.

Define separate credentials and responsibilities for:

- **Migrator/owner role:** creates and alters schema and applies
  migrations.
- **Runtime application role:** performs only the granted application
  operations and does not own the tables.
- **Worker role:** runs authorized cross-tenant reconciliation and
  Redis rebuild queries.
- **Evaluator:** has no PostgreSQL connection and never queries the
  database.

Keep the runtime `DATABASE_URL` restricted to the application role.
The migrator URL must be used only by migration tooling and explicitly
authorized setup or seed operations. Mirror the role setup in CI.

### 2.5 RLS implementation

**Trigger:** the planned RLS hardening phase.

Choose and test a non-recursive policy design. If a security-definer
helper is used, give it a fixed `search_path` and narrowly scoped
permissions. Transaction-local tenant context may use
`set_config('app.current_org', organization_id, true)`. Never rely on
session-level tenant state in pooled connections.

Do not enable policies until their access patterns and restricted-role
tests are ready. The normal runtime role must not receive broad
`BYPASSRLS` privileges.

### 2.6 Redis recovery and evaluator readiness

**Trigger:** before implementing evaluator readiness and recovery.

Specify and test the recovery sequence:

- Rebuild the SDK-key index from eligible, non-revoked, unexpired keys.
- Rebuild current-version pointers from all ACTIVE snapshots across
  tenants.
- Do not use PENDING, SUPERSEDED, or FAILED snapshots as live pointers.
- Make the evaluator ready only after required Redis state has been
  rebuilt and verified.
- Ensure the evaluator never falls back to PostgreSQL.
- Verify that Redis entries do not expire through TTL and that the
  evaluator's in-memory cache uses the intended 15-second TTL.
- Test the 20-second revocation target under the supported operating
  conditions.

---

## 3. Explanations behind key constraints

### 3.1 Why not store a separate live-version pointer?

If a pointer column and snapshot status both describe the live version,
they can disagree. Using the ACTIVE snapshot as the canonical live-state
indicator avoids maintaining two independent sources of truth. A partial
unique index permits at most one ACTIVE snapshot per environment, and
the activation transaction supersedes the old row before activating the
new one.

### 3.2 Why do composite foreign keys include project identity?

Matching `organizationId` alone does not prove that a flag and an
environment belong to the same project. Composite foreign keys validate
the organization and project relationship at the database level.

### 3.3 Why is there no audit-actor foreign key?

Deleting a user must not require rewriting or deleting historical audit
records. `actorUserId` and `actorLabel` preserve the recorded identity
without coupling the audit row's lifetime to the User row.

### 3.4 Why must the evaluator avoid PostgreSQL?

A PostgreSQL lookup on a Redis cache miss would make flag evaluation
dependent on database availability. The evaluator therefore reads
runtime state from Redis and published payloads from R2, never querying
PostgreSQL. Redis recovery is handled by the control plane and its
authorized worker.

### 3.5 Why must privilege tests use the runtime role?

A table owner can bypass protections that apply to an ordinary runtime
role. Tests executed only as the owner cannot establish that column
permissions, append-only audit behavior, or RLS policies protect data
from the application role.

---

## 4. Step 2 readiness checklist

Before writing `schema.prisma`, confirm the following:

- [ ] The slug and flag-key format, length, normalization, and CHECK
      constraints are specified consistently.
- [ ] Email uses application-side lowercase normalization, a
      `CHECK (email = lower(email))`, and a regular `UNIQUE (email)`.
- [ ] Boolean defaults and rule results use Boolean database columns,
      not JSON values.
- [ ] Every composite foreign key references an exact matching
      PRIMARY KEY or UNIQUE tuple.
- [ ] `PublishedSnapshot` has unique `(environmentId, version)` and
      partial unique indexes for ACTIVE and PENDING rows.
- [ ] Snapshot rollback creates a new version, restores the draft,
      increments the revision, and records `sourceVersion`.
- [ ] The installed Prisma UUIDv7 behavior has been verified.
- [ ] The environment validation and evaluator-role checks have been
      verified in the existing repository.
- [ ] The migrator, runtime application, and worker roles use separate
      credentials and explicit grants. Runtime column-level permissions,
      append-only AuditLog behavior, and worker access restrictions are
      verified with integration tests.
- [ ] CI and integration tests can connect as the restricted runtime
      role.
- [ ] The Redis recovery and evaluator cache semantics are documented
      consistently.
- [ ] RLS remains explicitly planned rather than being described as
      already implemented.
- [ ] `PublishedSnapshot.draftRevision` is captured when the PENDING
      snapshot is reserved; payload construction verifies that it reads
      that exact revision, and activation rechecks the current revision.
- [ ] All columns participating in required composite foreign keys are
      `NOT NULL`. Nullable composite foreign keys have an explicitly
      documented nullability and integrity policy.

**Step naming:** `schema.prisma` plus the first database migration is
**Phase 1 / Step 2**. Phase 2 is the flag engine. This document defines
the intended domain model and constraints; it does not itself implement
the schema, migrations, grants, or tests.
