---
name: investigation-complete
description: Status audit of Phase 4 implementation plan against actual codebase
---

# Implementation Status Audit: Phase 4 – Core Control Plane

## A. Overall progress

**Current stage:** Early foundation — organization creation and basic RBAC foundation implemented; all other control plane features missing.

**Completed percentage estimate:** ~15% of Phase 4 requirements.

### What is already working

- Prisma schema with all required models:
  - `Organization`
  - `Project`
  - `Environment`
  - `FeatureFlag`
  - `FlagEnvironmentConfig`
  - `FlagRule`
  - `SdkKey`
  - `PublishedSnapshot`
  - `AuditLog`
  - `RefreshToken`
  - `Membership`
  - `User`
- Four migration folders present in the repository.
- **Authentication (Phase 3 foundation):** JWT access tokens, refresh tokens, token rotation, CSRF guard, and throttler.
- **Dashboard (Phase 3):** `AuthProvider`, `apiMe()`, login/register with React Hook Form + Zod, and HttpOnly cookie authentication.
- **Organization creation:** `OrganizationsController.create()` and `OrganizationService.createOrganization()` atomically create the Organization, initial OWNER Membership, and audit log entry in one PostgreSQL transaction.
- **RBAC permission matrix:** `PERMISSION_MATRIX` in `rbac/permissions.ts` contains all 34 permission entries mapping roles (`OWNER`, `ADMIN`, `EDITOR`, `VIEWER`) to capabilities.
- **`hasPermission` function:** Centralized authorization logic that checks a role against the permission matrix.
- **`OrgPermissionGuard`:** Membership and role-checking guard that uses the permission matrix.
- **Unit tests:** OrgPermissionGuard tests cover all four roles (`OWNER`, `ADMIN`, `EDITOR`, `VIEWER`) and permission boundaries.

### What is not implemented

- No Project management (`ProjectsController`, `ProjectService`).
- No Environment management (`EnvironmentsController`, `EnvironmentService`).
- No Flag/Rule authoring (`FlagsController`, `FlagRulesController`).
- No SDK Key management (`SdkKeysController`).
- No Publication workflow (`PublishController`).
- No `RbacService` as described in the plan — only the guard and permission matrix exist.
- No `RoleGuard` or `OrganizationGuard` as named in the plan (`OrgPermissionGuard` exists instead and combines both functions).
- No audit logging beyond organization creation.
- No RBAC enforcement on CRUD endpoints beyond the organization creation path.

## B. Requirement-by-requirement audit

| Requirement / Feature         | Status     | Evidence                                                                               | Remaining work                                                                                             |
| ----------------------------- | ---------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **4.1 Permission matrix**     | PARTIAL    | `rbac/permissions.ts` has `PERMISSION_MATRIX` with 34 entries.                         | `RbacService` is not implemented; the guard exists but the service is missing.                             |
| **4.1 RoleGuard**             | MISSING    | Not found in the codebase.                                                             | Implement `RoleGuard` as described in plan §4.1.                                                           |
| **4.1 OrganizationGuard**     | MISSING    | Not found in the codebase.                                                             | The plan calls this `OrganizationGuard`; `OrgPermissionGuard` exists but may need renaming or refactoring. |
| **4.1 RbacService**           | MISSING    | Not found in the codebase.                                                             | Plan specifies `RbacService` with `hasPermission(userId, role, action, resource)`.                         |
| **4.2 Organization creation** | COMPLETE   | `org/org.controller.ts`, `org/org.service.ts`.                                         | None — fully implemented with an atomic transaction and audit log.                                         |
| **4.2 Organization rename**   | MISSING    | Not found.                                                                             | Implement `OrganizationsController.renameOrganization()` and `OrganizationService.renameOrganization()`.   |
| **4.2 Organization archive**  | MISSING    | Not found.                                                                             | Implement `OrganizationsController.archiveOrganization()` and `OrganizationService.archiveOrganization()`. |
| **4.3 Projects**              | MISSING    | Not found.                                                                             | Implement `ProjectsController` and `ProjectService` per plan §4.3.                                         |
| **4.4 Environments**          | MISSING    | Not found.                                                                             | Implement `EnvironmentsController` and `EnvironmentService` per plan §4.4.                                 |
| **4.5 Flags**                 | MISSING    | Not found.                                                                             | Implement `FlagsController` and `FlagAuthoringService` per plan §4.5.                                      |
| **4.5 Flag rules**            | MISSING    | Not found.                                                                             | Implement `FlagRulesController` and `FlagRulesService` per plan §4.5.                                      |
| **4.6 SDK Keys**              | MISSING    | Not found.                                                                             | Implement `SdkKeysController` and `SdkKeyService` per plan §4.6.                                           |
| **4.7 Publication**           | MISSING    | Not found.                                                                             | Implement `PublishController` and `PublicationService` per plan §4.7.                                      |
| **4.8 Audit logging**         | FOUNDATION | Organization creation writes an audit log entry in `org.service.createOrganization()`. | Subphase 4.8 requires additional audit events beyond organization creation.                                |
| **4.9 Testing**               | PARTIAL    | RBAC guard unit tests exist.                                                           | Add integration tests, privilege-boundary tests, concurrency tests, and E2E tests.                         |

## C. Architecture and security review

### Architectural inconsistencies

- The plan names `RoleGuard` and `OrganizationGuard`, but the implementation uses `OrgPermissionGuard`, which combines both responsibilities. This is a reasonable implementation choice, but its naming and structure differ from the plan.
- The plan says all subsequent subphases (4.3–4.9) must use `RoleGuard` and `RbacService` from Subphase 4.1. Neither exists under those names; only `OrgPermissionGuard` and the permission matrix exist.
- The plan says “No CRUD operations yet” for 4.1, but organization creation from 4.2 has already been implemented. This creates a version gap between the plan and implementation.

### Security concerns and missing protections

- No RBAC enforcement exists on API endpoints beyond the organization creation path. New controllers/services will need the appropriate organization and role/permission checks.
- Project, environment, flag, and SDK key endpoints have not been implemented, so their authorization is also missing.
- The permission matrix is defined but is not enforced outside the `OrgPermissionGuard` path.
- Organization rename and archive are not implemented; they will need OWNER-only checks according to the matrix.

### Module dependencies and RBAC boundaries

- `OrgPermissionGuard` uses `PrismaService` to check membership and `hasPermission` to check the role.
- The permission matrix implements the approved policies:
  - OWNER can perform all permitted actions.
  - ADMIN can perform most actions except organization rename/archive.
  - EDITOR can view and edit, but cannot create or delete.
  - VIEWER can only view.
- No Row Level Security (RLS) is implemented yet. Tenant isolation currently depends on application-level `organizationId` filters and membership role checks.

### Tenant isolation and organization ownership

- Every query must include an `organizationId` filter, as required by the plan.
- Currently, only organization-level operations exist; project/environment scoping has not been implemented.
- Organization creation is explicitly exempt from a membership-based RoleGuard check for the newly created organization. The atomic creation pattern resolves this circularity.

## D. Tests and validation

### Tests reported as passing

- `rbac.guard.spec.ts` — OrgPermissionGuard tests pass, covering:
  - OWNER (26 permissions)
  - ADMIN (20 permissions)
  - EDITOR (view + edit only)
  - VIEWER (view only)
- Basic AppController test.
- Auth controller/service tests.
- R2 module tests.
- Prisma module tests.

### Test failures and missing coverage

- No integration tests exist for Phase 4 features.
- No privilege-boundary tests run using the `app` database role.
- No concurrency tests exist for simultaneous publish attempts or draft revision conflicts.
- No E2E tests exist.

### Exact failure reasons

**N/A** — all existing tests were reported as passing. Tests for unimplemented features cannot yet be run.

### Missing tests

- Integration tests for full CRUD flows (organization, project, environment, flag, rule, and SDK key).
- Publication workflow end-to-end tests.
- RBAC privilege-boundary tests (for example, verifying that the `app` role cannot UPDATE `PublishedSnapshot` fields beyond `status`, `activatedAt`, and `failureCode`).
- Constraint tests (unique constraints, CHECK constraints, and partial unique indexes).
- Concurrency tests (simultaneous publish attempts and draft revision conflicts returning HTTP 409).
- E2E tests (dashboard → API → database → R2 → evaluator round-trip).

## E. Remaining implementation work

The following order reflects the audit's proposed dependency order:

1. **4.1: `RbacService`**
   - Implement a centralized service with `hasPermission(userId, role, action, resource)`.
   - Refactor the existing guard logic or create the service alongside it.
   - This is the foundation for subsequent RBAC-protected features.

2. **4.2: Organization rename and archive**
   - Implement `OrganizationsController.renameOrganization()` and `OrganizationsController.archiveOrganization()`.
   - Implement the corresponding service methods.
   - Enforce OWNER-only authorization through the RBAC layer.

3. **4.3: Projects**
   - Implement `ProjectsController` and `ProjectService`.
   - Support create, find all by organization, find one, rename, and archive.
   - Enforce organization and role/permission checks.
   - OWNER and ADMIN can create, view, rename, and archive; EDITOR and VIEWER can only view.

4. **4.4: Environments**
   - Implement `EnvironmentsController` and `EnvironmentService`.
   - Support create, find all by project, find one, update key/name, and archive.
   - Implement the required `DraftRevision` increment rules.
   - Enforce organization and role/permission checks.

5. **4.5: Flags and rules**
   - Implement `FlagsController` and `FlagAuthoringService`.
   - Support flag creation, listing, detail retrieval, draft updates, and deletion.
   - Implement `FlagRulesController` and `FlagRulesService`.
   - Support rule creation, condition/result/priority updates, and deletion.
   - EDITOR can edit existing flags/rules but cannot create or delete.

6. **4.6: SDK Keys**
   - Implement `SdkKeysController` and `SdkKeyService`.
   - Support create, list by environment, rotate, and revoke.
   - Restrict control-plane management to OWNER/ADMIN.
   - Keep SDK-key authentication in the data plane independent.

7. **4.7: Publication**
   - Implement `PublishController` and `PublicationService`.
   - Support publish initiation, status checks, and rollback.
   - Implement the workflow:
     1. Validate `draftRevision`.
     2. Reserve a `PENDING` publication.
     3. Upload the snapshot to R2.
     4. Activate the snapshot.
   - Restrict publishing to OWNER/ADMIN.

8. **4.8: Audit logging extension**
   - Add audit events to all mutation operations, building on the organization-creation audit-log foundation.

9. **4.9: Testing suite**
   - Add unit tests for all new services and guards.
   - Add integration tests using the `app` database role.
   - Add privilege-boundary, concurrency, and E2E tests.

## F. Recommended next step

**Recommendation: Implement Subphase 4.1 `RbacService` (or refactor `OrgPermissionGuard` into the service and guards required by the plan).**

### Why this should be next

- The plan explicitly states that subsequent subphases (4.3–4.9) must use the `RoleGuard` and `RbacService` from Subphase 4.1.
- Currently, only `OrgPermissionGuard` exists as a combined guard. The plan requires a separate `RoleGuard` for membership/role enforcement and an `RbacService` for centralized `hasPermission` logic.
- Without the planned service, subsequent controller implementations risk duplicating authorization logic.
- The permission matrix already exists in `rbac/permissions.ts`; the service should build on it rather than duplicate it.

### Files likely involved

- `apps/api/src/rbac/rbac.guard.ts` — refactor into `RoleGuard` + `OrganizationGuard`, or replace with the structure required by the plan.
- `apps/api/src/rbac/permissions.ts` — already implemented; adjust only if required.
- `apps/api/src/rbac/rbac.service.ts` — new file.
- `apps/api/src/org/org.service.ts` — existing organization creation logic; integrate with the RBAC layer only where appropriate.

### Acceptance criteria

- [ ] `RbacService` exists with a method matching the plan's authorization contract, for example:
      `hasPermission(userId: string, role: MembershipRole, action: PermissionKey, resource?: string): boolean`.
- [ ] `RoleGuard` can be instantiated and used to protect endpoints, checking membership/role through the RBAC layer.
- [ ] `OrganizationGuard` can be instantiated and used to verify user membership in the target organization.
- [ ] All permission matrix entries are correctly checked and verified by unit tests.
- [ ] Organization creation continues to work without a RoleGuard check (exempt as per plan §4.1, note 91).
- [ ] Existing `OrgPermissionGuard` tests continue to pass.

---

## Executive summary

- **Current position:** Early Phase 4 foundation; approximately 15% complete according to this audit.
- **Finished:** Organization creation, initial OWNER membership creation, organization-creation audit event, permission matrix, `hasPermission` function, and `OrgPermissionGuard` foundation.
- **Incomplete:** Planned RBAC service/guard structure, organization rename/archive, projects, environments, flags/rules, SDK key management, publication workflow, expanded audit logging, and comprehensive Phase 4 tests.
- **Recommended next task:** Implement and test the Subphase 4.1 RBAC service/guard structure before adding the remaining control-plane modules.
