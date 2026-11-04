# SquidFlag progress log

Last updated: 2026-11-03. Update this at the end of every session.

## Where we are

Phase 1 (database) close-out findings 1–8 are **done**. Phase 2 (contracts and
flag-engine) **complete**: contracts v1 implemented with 16 operators, flag-engine
with pure evaluation logic, 111 unit tests passing.
**Phase 3 (Dashboard authentication) complete**: JWT access tokens (10m HS256) +
opaque refresh tokens (15d, SHA-256 hash), rotation with family tracking, TokenReuseException
triggering family revocation, global CSRF guard (Origin/Referer), throttler rate limiting,
first-user bootstrap with advisory lock + auto-login, HttpOnly SameSite=lax cookies.

## Done and verified

- Phase 0 closed: workspace, tsconfig base, ESLint/Prettier, zod env config,
  Fastify + pino logging, role-aware health endpoints, Jest suites
  (unit / int / e2e), boundary checks (depcruise + architecture script),
  CI green.
- Env validation rejects `db://` (unit test exists).
- `prisma skills sync` removed from the codebase.
- Schema written (12 entities) + init migration with hand-written SQL
  (CHECKs, partial unique indexes) + runtime-role-privileges migration.
- R2Service and R2Module written with unit tests (built ahead of roadmap).
- **Phase 1 close-out findings 1–8 complete:**
  1. `onUpdate: Restrict` on all relations (schema + migration)
  2. Worker grants match duties (UPDATE PublishedSnapshot, DELETE+UPDATE RefreshToken)
  3. Evaluator rejects `DATABASE_URL` at parse time (`.refine()` + 3 unit tests)
  4. 3 unjustified indexes dropped from init migration
  5. CI init script: `roles.sql` + updated `01-roles-and-databases.sh`
  6. Invariants test: `apps/api/test/invariants.int-spec.ts`
  7. 8 cheap CHECKs added to init migration
  8. Doc cleanup: `domain-analysis-v2.md` (E2/E3, duplicate decisions, #10, #11, pagination)
- **Phase 2 complete:**
  - `docs/contract-v1.md` — full v1 spec with 16 condition operators, discriminated unions, UUIDv7
  - `@squidflag/contracts` — Zod schemas, `parseSnapshot`, `UnsupportedSchemaVersionError`, golden-vector tests
  - `@squidflag/flag-engine` — `evaluate`/`evaluateAll`, all 16 operators, semver compare, priority-ordered rules
  - Unit tests: 111 passing (54 api + 57 test), lint clean, build passes
- **Phase 3 complete (API):**
  - `apps/api/src/auth/` — full auth module with service, controller, guards, DTOs, exceptions
  - JWT access tokens: HS256, 10m TTL, in HttpOnly cookie
  - Refresh tokens: opaque 32-byte base64url, SHA-256 hash stored, 15d TTL
  - Rotation: new token created first, conditional update of old token (revokedAt=null), replacedByTokenId linked
  - TokenReuseException: any `revokedAt !== null` token presented → family revoked in separate committed transaction
  - Expired tokens (`expiresAt < now` with `revokedAt === null`) → 401 without family revocation
  - User disabling: checked on login/refresh; existing access tokens valid up to 10 min (TTL-based)
  - Global CsrfGuard: Origin first, fallback to Referer parsed with `new URL()`, exact match vs CORS_ORIGINS
  - Throttler: named buckets (short 100/min, long 1000/hr); login 5/min, register 3/hr, refresh 10/min
  - First-user bootstrap: advisory lock (key 1234567890), auto-login with both cookies, returns `{ user }`
  - Logout: idempotent, clears both cookies with matching `path: '/'`
  - `/auth/me`: protected, returns JWT payload only (no DB lookup)
  - `@fastify/cookie` registered, CORS with `credentials: true`
  - JWT_SECRET required for `all`/`control` roles only; not required for `evaluator`
  - Controller thin: only HTTP concerns (DTO parse, cookie extract, delegate to service)
  - Service: all business logic, 240+ lines, pure TypeScript, no `any`, no console
  - Build passes, typecheck passes, lint passes (0 errors, 0 warnings)
  - Auth integration: 82/82 tests passing (previously 73/82, 9 auth tests failed with 401)
  - APP_ENV provider fix: added `{ provide: APP_ENV, useValue: config }` to AuthModule.register() at auth.module.ts:42 resolved bootstrap error

## Unverified (no evidence yet)

- `migrate dev` / `migrate diff` drift experiment (does Prisma drop my
  partial indexes / CHECKs?)
- Constraint tests as the `app` role, seed script, green CI after grants migration

## Open findings to fix (Phase 1 close-out)

**All 8 findings resolved.** See "Done and verified" above.

## Decisions made (see domain-analysis.md for full list)

- Evaluator: Redis + R2 only, no Postgres, no DATABASE_URL.
- ACTIVE PublishedSnapshot row = only live pointer. One ACTIVE + one PENDING
  per environment (partial unique indexes).
- Roles: migrator / app / worker. RLS planned after Phase 4, not now.
- Real R2 (no MinIO), bcryptjs cost 12, UUIDv7.

## Next session

2. Phase 3: Dashboard frontend (login page, protected routes, auth context, api-client with single-flight refresh).
3. Phase 4: Orgs, projects, environments, RBAC, audit log.
