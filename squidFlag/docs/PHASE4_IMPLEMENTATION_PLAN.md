# Phase 4: Core Control Plane — Implementation Plan

## Overview

Phase 4 implements the control plane for managing organizations, projects, environments, and the publication workflow. RBAC and membership authorization are foundational — all subsequent CRUD is gated by role checks.

The control plane is a NestJS API (`apps/api`) that provides:

- Organization creation with atomic initial OWNER membership
- Project management within organizations
- Environment management with draftRevision control
- Publication workflow (PENDING → ACTIVE → SUPERSEDED)
- RBAC enforcement via explicit permission matrix
- Audit logging of administrative actions
- SDK key creation and rotation (carried forward from Phase 3 foundation)

## Existing Architecture

### Database Schema (already implemented)

The Prisma schema and migrations are already in place with all required models:

| Model                 | Key Fields                                                                                         | Constraints                                             |
| --------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| User                  | id, email, passwordHash, disabledAt                                                                | UNIQUE email, lowercase CHECK                           |
| Organization          | id, name, slug, archivedAt                                                                         | UNIQUE slug, format CHECK                               |
| Membership            | id, organizationId, userId, role                                                                   | UNIQUE (org, user), roles: OWNER/ADMIN/EDITOR/VIEWER    |
| Project               | id, organizationId, name, slug, archivedAt                                                         | UNIQUE (org, slug), UNIQUE (org, id)                    |
| Environment           | id, organizationId, projectId, key, name, draftRevision                                            | UNIQUE (proj, key), format CHECK on key                 |
| FeatureFlag           | id, organizationId, projectId, key, name, flagType                                                 | UNIQUE (proj, key)                                      |
| FlagEnvironmentConfig | id, org, proj, env, flagId, enabled, defaultValue                                                  | UNIQUE (env, flag)                                      |
| FlagRule              | id, org, flagEnvConfigId, priority, conditions (JSONB), result                                     | INDEX (config, priority, id)                            |
| SdkKey                | id, org, env, keyHash, type, label, prefix, last4, expiresAt, revokedAt                            | UNIQUE keyHash                                          |
| PublishedSnapshot     | id, org, proj, env, version, status, storageKey, checksum, sizeBytes, draftRevision, sourceVersion | Partial unique indexes: one ACTIVE, one PENDING per env |
| AuditLog              | id, org, actorUserId, actorLabel, action, targetType, targetId, metadata                           | Append-only, INSERT/SELECT only for app role            |
| RefreshToken          | id, userId, tokenHash, familyId, expiresAt, revokedAt, replacedByTokenId                           | UNIQUE tokenHash, family index                          |

### Runtime Role Privileges (already implemented)

The `20261021141600_runtime_role_privileges` migration grants the `app` role:

- CRUD on all tables except AuditLog (INSERT only), PublishedSnapshot (column-level UPDATE on status/activatedAt/failureCode), SdkKey (column-level UPDATE on revokedAt/lastUsedAt)
- The `worker` role gets selective cross-tenant maintenance privileges
- The evaluator has no DATABASE_URL and never queries PostgreSQL

### API Auth (already completed in Phase 3)

- JWT access tokens (10m HS256) in HttpOnly cookie
- Opaque refresh tokens (15d, SHA-256 hashed)
- Token rotation with family tracking
- TokenReuseException for family revocation
- Global CSRF guard (Origin/Referer exact match)
- Throttler rate limiting
- First-user bootstrap with advisory lock

### Dashboard (already completed in Phase 3)

- AuthProvider with four-state model: loading, authenticated, unauthenticated, error
- apiMe() on mount for session initialization
- Login/register with React Hook Form + Zod
- HttpOnly cookie authentication pattern

## Missing Functionality for Phase 4

The following control-plane features are not yet implemented:

1. **NestJS controllers and services** for Organizations, Projects, Environments
2. **Flag and rule authoring** endpoints (draft editing, rule management)
3. **SDK key management** (create, rotate, revoke)
4. **Publish workflow** (reserve PENDING, upload to R2, activate)
5. **RBAC guards** to enforce membership/role checks on API endpoints
6. **Audit log service** for recording administrative actions
7. **Environment/flag listing** with pagination and filtering
8. **Query APIs** for SDK key resolution state and snapshot status

## Proposed Subphases (Dependency Order)

### Subphase 4.1: Foundational RBAC & Membership

**Complete foundational authorization implementation** — this subphase establishes the full authorization foundation before any protected CRD operations:

- **Explicit permission matrix**: Table defining OWNER, ADMIN, EDITOR, VIEWER capabilities per resource type (detailed in §4.1 below)
- **NestJS guard: `RoleGuard`** — checks membership + required role for any operation. Uses the permission matrix to determine if the authenticated user's role permits the requested action on the target resource.
- **NestJS guard: `OrganizationGuard`** — verifying user membership in the target organization. Sets the organization context for downstream guards/services.
- **Service: `RbacService`** with `hasPermission(userId, role, action, resource)` — centralized authorization logic. All protected CRUD delegates to this service.
- **No CRUD operations yet** — this subphase establishes the authorization foundation entirely.
- **RBAC data seeded during organization creation** (see Subphase 4.2) — the initial OWNER membership carries the permissions needed to perform org-level operations.

**All subsequent subphases (4.2–4.9) must use the `RoleGuard` and `RbacService` from Subphase 4.1.** No duplicate guard implementations are permitted in later subphases.

**Organization creation authorization**: Per the approved policy, any authenticated user can create an organization. Organization creation must not require an existing OrganizationGuard membership check for the new org. The circularity of assigning OWNER permissions to a user creating an organization that does not yet exist is resolved by the atomic creation pattern itself. Organization membership permissions (once an org exists, what can members do?) are from the permission matrix, but are separate from the creation decision.

**Note**: Organization creation requires authentication but is explicitly exempt from membership-based RoleGuard authorization for the newly created organization. All other organization-scoped operations must use the established authorization foundation.

### Subphase 4.2: Organization Creation & Initial Membership

**Scope**: Organization lifecycle management — creation, retrieval, rename, and archive — with atomic initial membership and integrated transactional audit logging.

**Deliverables**:

- **Organization creation**: Any authenticated user can create an organization without requiring existing membership. The organization and its initial OWNER Membership are created atomically in a single PostgreSQL transaction.
- **OrganizationsController.create(...)**: Creates an organization for any authenticated user without requiring existing membership in the new organization.
- **OrganizationService.createOrganization(...)**: Atomically creates the Organization and its initial OWNER Membership, together with the organization creation AuditLog entry, in one PostgreSQL transaction.
- **Organization retrieval**: Details of an existing organization are accessible per the permission matrix (Org View: all four roles).
- **Organization rename**: Only OWNER can rename an organization. Requires `OrganizationGuard` + `RoleGuard` with OWNER role verification.
- **Organization archive**: Only OWNER can archive an organization. Requires `OrganizationGuard` + `RoleGuard` with OWNER role verification.
- **Explicit controller endpoints**:
  - `OrganizationsController.create(...)` — creates an organization for any authenticated user without requiring existing membership in the new organization.
  - `OrganizationsController.findOne(orgId)` — returns organization details
  - `OrganizationsController.renameOrganization(orgId, newName)` — renames organization (OWNER only)
  - `OrganizationsController.archiveOrganization(orgId)` — archives organization (OWNER only)
- **Explicit service methods**:
  - `OrganizationService.getOrganization(orgId)` — retrieves organization with membership check
  - `OrganizationService.createOrganization(...)` — atomically creates the Organization, its initial OWNER Membership, and the organization creation AuditLog entry in one PostgreSQL transaction
  - `OrganizationService.renameOrganization(orgId, newName)` — renames with OWNER authorization
  - `OrganizationService.archiveOrganization(orgId)` — archives with OWNER authorization
- **Organization-scoped queries**: All queries include explicit `organizationId` filter for tenant isolation.
- **Preserved exception**: Creating an organization requires authentication but does not require existing membership in that organization. The atomic creation pattern resolves the circularity of assigning OWNER permissions to a new org.
- **Transactional AuditLog integration**: The organization creation event is the first AuditLog entry, recorded within the same transaction as the Organization + Membership creation. If the audit INSERT fails, the entire transaction rolls back.
- **Authorization tests**: Tests verify that any authenticated user can create an org, that OWNER can rename/archive, and that permissions per the matrix are enforced.
- **Audit foundation established**: Subphase 4.2 establishes the transactional audit logging strategy. Subphase 4.8 must cover additional audit coverage beyond organization creation, not duplicate this foundation.

**All subsequent subphases (4.3–4.9) must integrate audit logging from the beginning**, accepting an auditService dependency that logs within the same transaction boundary as the operational action.

### Subphase 4.3: Project Management

- NestJS controller: `ProjectsController` (create, findAll by org, findOne, rename, archive)
- Every endpoint gated by `OrganizationGuard` + role check per permission matrix
- **RBAC: Both OWNER and ADMIN can create, view, rename, and archive projects. EDITOR and VIEWER can only view projects. Ensure prose matches the permission matrix.**
- Service: `ProjectService` with organization boundary enforcement

### Subphase 4.4: Environment Management

- NestJS controller: `EnvironmentsController` (create, findAll by project, findOne, update key/name, archive)
- DraftRevision increment rules defined in the Draft Revision Increment Rules section below
- Every endpoint gated by `OrganizationGuard` + `RoleGuard`
- Validation: Key format CHECK at DB level; application validates uniqueness within project
- Service: `EnvironmentService` with lock-aware operations (Project FOR SHARE → Environment FOR UPDATE)

### Subphase 4.5: Flag & Rule Authoring

**FlagsController**:

- `create` — creates a new flag
- `findAll` — finds all flags in an environment
- `findOne` — finds a flag by key
- `update draft` — updates flag draft configuration
- `delete` — deletes a flag (OWNER and ADMIN only)

**FlagRulesController**:

- `create` — creates a new rule (OWNER and ADMIN only)
- `update conditions/result` — updates rule conditions and result (OWNER, ADMIN, and EDITOR)
- `update priority/order` — updates rule priority with the approved role permissions
- `delete` — deletes a rule (OWNER and ADMIN only)

**Service methods**:

- `FlagAuthoringService.createFlag(...)` — creates a new flag
- `FlagAuthoringService.findAllFlags(...)` — finds all flags in an environment
- `FlagAuthoringService.findOneFlag(...)` — finds a flag by key
- `FlagAuthoringService.updateDraft(...)` — updates flag draft configuration
- `FlagAuthoringService.deleteFlag(...)` — deletes a flag (OWNER/ADMIN)
- `FlagRulesService.createRule(...)` — creates a new rule (OWNER/ADMIN)
- `FlagRulesService.updateRule(...)` — updates rule conditions/result (OWNER/ADMIN/EDITOR)
- `FlagRulesService.updatePriority(...)` — updates rule priority with approved role permissions
- `FlagRulesService.deleteRule(...)` — deletes a rule (OWNER/ADMIN)

**EDITOR policy**:

- EDITOR can edit existing flags and rules.
- EDITOR cannot create or delete flags or rules.

FlagEnvironmentConfig: One config per (environment, flag) pair; draft edits increment environment draftRevision
Rules: JSONB conditions validated by contracts package; priority ASC, id ASC ordering

### Subphase 4.6: SDK Key Management (carried forward from Phase 3)

- NestJS controller: `SdkKeysController` (create, findAll by env, rotate, revoke)
- **RBAC separation**: Dashboard user RBAC governs key creation/rotation permissions (OWNER/ADMIN only in control plane). SDK key authentication and resolution in the data plane is independent of dashboard user sessions — the evaluator uses Redis + R2 only, with no DATABASE_URL, no Prisma client, and no PostgreSQL queries.
- Service: `SdkKeyService` with restricted writes (only revokedAt/lastUsedAt mutable)

### Subphase 4.7: Publication Workflow

- NestJS controller: `PublishController` (initiate publish, check status, rollback)
- Workflow sequence with draftRevision validation
- RBAC: Only OWNER and ADMIN can publish
- Service: `PublicationService` orchestrating the lifecycle

### Subphase 4.8: Audit Logging

**Transactional audit strategy established in Subphase 4.2**: Subphase 4.2 contains the complete canonical transactional audit strategy definition. Subphase 4.8 builds upon this foundation.

**Subphase 4.8 scope**: Additional audit event coverage, actor information, metadata, request correlation, and audit-specific tests. Does not repeat the full transactional strategy — that foundation is in Subphase 4.2.

**Audit failure distinctions**:

- **AuditLog INSERT failure** (e.g., constraint violation on `organizationId` or other CHECK): The entire transaction rolls back — the operational action does NOT succeed independently. This is consistent PostgreSQL transaction behavior.
- **Operational mutation failure** (e.g., 409 Conflict, validation error): No audit entry is written; the transaction rolls back.

**Actor context**: Captured within the transaction, `actorUserId` from the JWT-authenticated user, `actorLabel` from profile name or 'system'.

**Request correlation**: Request ID is passed through the HTTP request context and retained in the `metadata` field of the AuditLog entry if the application requires request-level correlation. The AuditLog `org` field is still required — requests occurring before an organization context exists are handled through the application's error handling flow.

**Cross-reference**: Subphase 4.2 establishes the audit foundation. Subphases 4.3–4.7 integrate audit writes into mutation transactions. Subphase 4.9 covers audit testing.

### Subphase 4.9: Testing & Verification

**Scope**: Comprehensive testing of all Phase 4 deliverables across unit, integration, privilege-boundary, concurrency, and E2E dimensions.

**Deliverables**:

- **Unit tests**: RBAC permission matrix, draftRevision logic, audit logging, audit failure handling, Draft Revision Increment Rules (all 8 rules), compare-and-swap protocol, version allocation
- **Integration tests**: Full CRUD flows as app role, privilege boundary tests, publication workflow end-to-end (draft → PENDING → R2 upload → ACTIVE), constraint tests (unique constraints, CHECK constraints, partial unique indexes), concurrency: simultaneous publish attempts, draft revision conflicts (409 Conflict)
- **Privilege-boundary tests**: App role cannot UPDATE PublishedSnapshot beyond status/activatedAt/failureCode, app role cannot UPDATE SdkKey beyond revokedAt/lastUsedAt, app role INSERT-only on AuditLog
- **Concurrency tests**: Simultaneous publish attempts, draft revision conflicts (409 Conflict), lock ordering verification (Project FOR SHARE → Environment FOR UPDATE)
- **E2E tests**: Dashboard → API → database → R2 → evaluator round-trip (Phase 3 auth foundation); Key rotation → evaluate with new key → old key rejected within 20s target; Audit log entries appended on significant actions; 409 Conflict on stale expectedDraftRevision

**All test suites must run as the `app` database role** (not the table owner), verifying runtime privilege boundaries. No uninspected test results may be claimed.

### Database / Migration Strategy

The Prisma schema and migrations provide the foundational models and constraints for Phase 4 features. The following table distinguishes verified existing database capabilities from items requiring integration testing, based on inspection of the actual repository migration directory:

| Capability                                                                                                                | Status                           | Notes                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Migration files present in repository**                                                                                 | **Verified**                     | Four migration folders exist: `20261021095624_init`, `20261021141600_runtime_role_privileges`, `20261103124821`, `20261103144717`.                                                                                                                                      |
| Migration applied to local database                                                                                       | **Requires verification**        | Must check `prisma migrate status` or raw SQL against the local database to confirm which migrations have been applied.                                                                                                                                                 |
| Migration applied in CI/test databases                                                                                    | **Requires verification**        | CI/test database state must be checked independently; cannot assumed based on repository presence alone.                                                                                                                                                                |
| Runtime role privileges (app role column-level grants)                                                                    | **Requires integration testing** | Test evidence not yet inspected for this document; must verify via test suite running as app role. Restrictions include: app role cannot UPDATE PublishedSnapshot beyond status/activatedAt/failureCode, and app role cannot UPDATE SdkKey beyond revokedAt/lastUsedAt. |
| Partial unique indexes `PublishedSnapshot_one_active_per_environment` and `PublishedSnapshot_one_pending_per_environment` | **Requires integration testing** | Created in init migration SQL (access patterns #8, #16 from domain-analysis.md). Cannot be represented in Prisma schema; indexes documented in domain-analysis.md. Integration tests attempting duplicate insertions must confirm constraint enforcement.               |
| App role cannot UPDATE PublishedSnapshot beyond status/activatedAt/failureCode                                            | **Requires integration testing** | Must verify via test suite running as app role.                                                                                                                                                                                                                         |
| App role cannot UPDATE SdkKey beyond revokedAt/lastUsedAt                                                                 | **Requires integration testing** | Must verify via test suite running as app role.                                                                                                                                                                                                                         |
| Partial unique indexes enforcement (duplicate ACTIVE/PENDING snapshots)                                                   | **Requires integration testing** | Must try inserting duplicates and expect constraint violation.                                                                                                                                                                                                          |
| If new constraint required beyond existing schema                                                                         | **Open**                         | Must add hand-written SQL migration (append-only, never edit applied migrations). Invariants test suite must cover it.                                                                                                                                                  |

**Verification action items**:

- Check `prisma migrate status` or raw SQL to confirm which migrations are applied to the local database
- Verify CI/test database migration state independently
- Run integration test suite as `app` role to verify column-level privilege boundaries
- Verify Prisma-generated queries respect the restricted app role's column-level grants
- Test that the app role cannot UPDATE PublishedSnapshot beyond status/activatedAt/failureCode
- Test that the app role cannot UPDATE SdkKey beyond revokedAt/lastUsedAt
- Confirm that partial unique indexes are enforced (try inserting duplicate ACTIVE/PENDING snapshots)

**Never assume** that a migration exists or is applied without checking the repository migration directory and actual database state. The repository contains four migration folders; applied state must be verified per environment.

## Authorization / Tenant-Isolation Strategy

1. **Organization boundary**: Every query must include `organizationId` filter. Access determined by user's membership role in that organization.
2. **Project boundary**: `FeatureFlag` and `Environment` are children of Project. Composite FK `Project(organizationId, id)` enforced via unique constraints.
3. **Environment boundary**: `FlagEnvironmentConfig` is per (environment, flag). Unique `(environmentId, flagId)` constraint.
4. **Flag-level access**: Rules are within `FlagEnvironmentConfig`, which ties to `FeatureFlag` via composite FK.
5. **SDK key resolution** (data plane): Pure Redis + R2, no PostgreSQL. Control plane (SDK key management, dashboard RBAC) enforces organization scoping for key creation and rotation; this governance is distinct from data plane evaluation, which uses Redis + R2 only.
6. **Evaluator isolation**: No DATABASE_URL, no Prisma client, no PostgreSQL queries ever. Redis cache + R2 payloads only. The evaluator does not depend on dashboard user sessions, OAuth states, or any control-plane data for flag evaluation.

**Tenant isolation flow for API requests**:

1. Authenticate user → verify membership role in target organization
2. Set `app.current_org` transaction-locally as a convenience variable for query scoping (`set_config('app.current_org', org_id, true)`)
   - **`app.current_org` is NOT an authorization mechanism**; it is a transaction-local setting that assists query construction but does not replace application-level tenant isolation.
3. Execute tenant-scoped queries on same connection, each including explicit `organizationId` filter
4. All composite foreign keys and unique constraints validated by DB
5. RLS is NOT enabled — application-level tenant isolation relies on explicit `organizationId` filters and membership role checks at every query boundary

**AuditLog schema verification**:

- **organizationId (org) nullability**: The `org` field in AuditLog is required (NOT null) — every audit entry must be associated with an organization. The field stores the organization ID as a UUID string.
- **requestId field availability**: The AuditLog model does not include a `requestId` field. The existing fields `actorUserId`, `actorLabel`, `action`, `targetType`, `targetId`, and `metadata` are used to capture authentication and operational context. Request correlation may be retained within the `metadata` field if the existing structure supports it; `requestId` is not a dedicated AuditLog field.
- **Authentication events**: The existing AuditLog model can represent authentication events using the `action` field (e.g., 'login', 'logout', 'create_org') combined with `actorUserId` and `actorLabel`. AuditLog can record organization-scoped authentication or administrative events **only when a valid organization context exists**. **Events occurring before an organization context exists** (e.g., early authentication attempts prior to org creation) must not be written to this organization-scoped model. The handling of such authentication events without organization context is an unresolved architectural question — they must be handled through the application's error handling flow, not by inventing a solution or using a temporary organization placeholder. No new fields or global audit mechanisms are required.

### 4.1: Explicit Permission Matrix

| Permission      | OWNER | ADMIN | EDITOR | VIEWER |
| --------------- | ----- | ----- | ------ | ------ |
| Org View        | ✓     | ✓     | ✓      | ✓      |
| Org Rename      | ✓     | ✗     | ✗      | ✗      |
| Org Archive     | ✓     | ✗     | ✗      | ✗      |
| Project Create  | ✓     | ✓     | ✗      | ✗      |
| Project View    | ✓     | ✓     | ✓      | ✓      |
| Project Rename  | ✓     | ✓     | ✗      | ✗      |
| Project Archive | ✓     | ✓     | ✗      | ✗      |
| Env Create      | ✓     | ✓     | ✓      | ✗      |
| Env View        | ✓     | ✓     | ✓      | ✓      |
| Env Rename      | ✓     | ✓     | ✓      | ✗      |
| Env Archive     | ✓     | ✓     | ✓      | ✗      |
| Flag Create     | ✓     | ✓     | ✗      | ✗      |
| Flag View       | ✓     | ✓     | ✓      | ✓      |
| Flag Edit       | ✓     | ✓     | ✓      | ✗      |
| Flag Delete     | ✓     | ✓     | ✗      | ✗      |
| Rule Create     | ✓     | ✓     | ✗      | ✗      |
| Rule View       | ✓     | ✓     | ✓      | ✓      |
| Rule Edit       | ✓     | ✓     | ✓      | ✗      |
| Rule Delete     | ✓     | ✓     | ✗      | ✗      |
| SDK Key Create  | ✓     | ✓     | ✗      | ✗      |
| SDK Key View    | ✓     | ✓     | ✓      | ✗      |
| SDK Key Rotate  | ✓     | ✓     | ✗      | ✗      |
| SDK Key Revoke  | ✓     | ✓     | ✗      | ✗      |
| Publish         | ✓     | ✓     | ✗      | ✗      |

**Verify programmatically or by explicitly counting cells that every row has exactly four permission values and that every value is under the correct column.**

### 4.1.1: Authorization Decision Logic — Approved Policies

The four policy decisions for Phase 4 have been explicitly approved:

1. **Organization creation**: Any authenticated user can create an organization. The organization and its initial OWNER membership must be created atomically in one PostgreSQL transaction.
2. **ADMIN project creation**: ADMIN is allowed to create projects.
3. **EDITOR flag/rule editing**: EDITOR can view and edit existing flags and rules. EDITOR cannot create or delete flags or rules.
4. **Publication**: Both OWNER and ADMIN can publish.

Every ✓ and ✗ in the permission matrix reflects these approved policies and should not be changed without explicit approval.

### Draft Revision Increment Rules

1. **Environment mutation** — Any write to Environment fields (name, key, archivedAt) that passes the expectedDraftRevision compare-and-swap increments Environment.draftRevision by 1

2. **FeatureFlag metadata mutation** — Any change to Flag fields (name, description, flagType) that affects future snapshot contents increments Environment.draftRevision of every non-archived environment in the project within the same transaction

3. **FlagEnvironmentConfig edit** — Editing enabled/defaultValue of a FlagEnvironmentConfig increments Environment.draftRevision atomically with the mutation

4. **Rule creation** — Adding a new Rule to a FlagEnvironmentConfig increments Environment.draftRevision atomically with the mutation. This applies whether the rule is created via draft edit or direct API write.

5. **Rule update** — Updating rule conditions (JSONB) or result (Boolean) of an existing Rule increments Environment.draftRevision atomically with the mutation.

6. **Priority change** — Changing a Rule's priority increments Environment.draftRevision atomically with the mutation. This is item 4 in the original list, now explicitly separated from creation/update/deletion.

7. **Rule deletion** — Removing a Rule from a FlagEnvironmentConfig increments Environment.draftRevision atomically with the mutation.

8. **Publish attempt** — A publish operation that validates expectedDraftRevision does NOT increment Environment.draftRevision on success/failure; the revision is captured in PublishedSnapshot.draftRevision at the time of PENDING reservation.

**Compare-and-swap protocol:**

- Every draft mutation receives `expectedDraftRevision`
- Current revision read under transaction lock
- If current revision !== expectedRevision → HTTP 409 Conflict, no changes applied
- If current revision === expectedRevision → apply changes and increment draftRevision atomically
- Deadlock prevention: acquire locks in Project FOR SHARE → Environment FOR UPDATE order; for project-level metadata, update environments in deterministic id ASC order

**Version allocation on publish:**

- New version = current MAX(version) for the environment + 1
- PENDING snapshot row inserted with draftRevision captured from the environment's current revision
- After successful R2 upload and verification: old ACTIVE → SUPERSEDED, new PENDING → ACTIVE (one transaction)

### Unit Tests (already partially exist, expand as needed)

- Contract: `parseSnapshot`, `UnsupportedSchemaVersionError`, golden vectors for all 16 condition operators
- Flag engine: `evaluate`/`evaluateAll` with all operator types, empty conditions, priority ordering
- Auth service: token rotation, reuse detection, family revocation
- Publication logic: draftRevision compare-and-swap, version allocation, ACTIVE/PENDING index enforcement

### Integration Tests (run as `app` role, NOT table owner)

- Full CRUD flows for organizations, projects, environments, flags, rules, SDK keys
- Publication workflow end-to-end (draft → PENDING → R2 upload → ACTIVE)
- RBAC: different roles get different access levels
- Privilege boundaries: app role cannot UPDATE PublishedSnapshot beyond status/activatedAt/failureCode
- Constraint tests: unique constraints, CHECK constraints, partial unique indexes
- Concurrency: simultaneous publish attempts, draft revision conflicts (409 Conflict)

### E2E Tests (dashboard → API → database)

- Login → create org → create project → create env → create flag with rules → publish → evaluate
- Key rotation → evaluate with new key → old key rejected within 20s target
- Audit log entries appended on significant actions
- 409 Conflict on stale expectedDraftRevision

## Risks & Unresolved Questions Requiring Approval

| Risk                                                                                                                        | Mitigation                                                                                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Prisma UUIDv7 generation** — Prisma 7 behavior must be verified. Raw SQL inserts must supply UUIDv7 IDs consistently.     | Run verification test before schema finalization (deferred check from domain-analysis §2.1)                                                                                   |
| **Partial unique index portability** — Prisma cannot represent partial unique indexes; they are hand-written SQL.           | Accepted design constraint; indexes documented in domain-analysis §D6. Integration testing required to verify enforcement of ACTIVE and PENDING partial unique indexes.       |
| **Draft revision concurrency** — compare-and-swap under transaction lock must handle edge cases (stale revision, deadlock). | documented lock order: Project FOR SHARE → Environment FOR UPDATE; deterministic env ID order for project-level metadata                                                      |
| **R2 upload failure handling** — if upload fails after PENDING snapshot reserved, must mark FAILED and reconcile.           | Reconciler handles abandoned PENDING rows; activation must recheck state before committing                                                                                    |
| **Redis loss + evaluator recovery** — evaluator must never fall back to PostgreSQL.                                         | Documented: 503 until key index rebuilt; once ready, unknown key → 401. Worker rebuilds indexes from PostgreSQL.                                                              |
| **SDK key revocation propagation** — 20s target depends on in-memory cache TTL (15s) + margin (5s).                         | Accepted as target; not a guarantee independent of system availability. Tests verify behavior under supported conditions.                                                     |
| **Worker role privilege escalation** — worker must not receive broad cross-tenant privileges.                               | Worker role has narrowly defined grants (RefreshToken revokedAt/update, PublishedSnapshot status/failureCode). All cross-tenant operations use explicit organization filters. |
| **Evaluator cache TTL vs revocation** — in-memory cache 15s TTL, revocation target 20s.                                     | Accepted design; margin covers normal propagation delay. Tests verify behavior.                                                                                               |

## Deliverables

Following user approval, the following files will be created/modified (no changes until explicit approval):

1. **NestJS controllers**: `apps/api/src/organizations/*.ts`, `apps/api/src/projects/*.ts`, `apps/api/src/environments/*.ts`, `apps/api/src/flags/*.ts`, `apps/api/src/flag-rules/*.ts`, `apps/api/src/sdk-keys/*.ts`, `apps/api/src/publish/*.ts`, `apps/api/src/audit/*.ts`
2. **NestJS services**: corresponding service files with business logic
3. **NestJS guards**: `RoleGuard`, `OrganizationGuard`, `ProjectGuard`, `EnvironmentGuard`
4. **DTOs**: Create/Update DTOs for all resources
5. **Module**: `AuthModule` integration with new controllers/services (already partially set up)
6. **Prisma schema changes** — may be required when justified by actual repository inspection and approved by you. Changes to the schema are not categorically impossible but would only be proposed when existing constraints are insufficient for a required Phase 4 feature.
7. **Migration changes** — may be required when justified by actual repository inspection and approved by you. Changes to migrations are not categorically impossible but would only be proposed when existing migrations cannot express a required constraint (e.g., partial unique indexes as hand-written SQL) and approved by you.

## Code Style Compliance

All new code must adhere to the project's style rules:

- No `console.log` statements in production code
- No `any` or `unknown` types
- No floating promises — all async flows properly awaited
- No logging of request bodies, secrets, or SDK keys
- Config from injected/config object, not `process.env` directly
- Packages consumed through `dist` (run `npm run build:packages`)
- Strict on write, tolerant on read for snapshots
- No `localeCompare` or locale-dependent logic
- **No comments, JSDoc, TODOs, or FIXMEs** in new code
- Conventional commits with scope `squidflag`
- `.env` ignored; only `.env.example` tracked

**Also added to project CLAUDE.md**: "Do not add comments to the code you write." (already present from earlier instructions)
