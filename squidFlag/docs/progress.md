# SquidFlag progress log

Last updated: 2026-11-03. Update this at the end of every session.

## Where we are

Phase 1 (database) close-out findings 1–8 are **done**. Phase 2 (contracts and
flag-engine) started: `docs/contract-v1.md` written with redesigned contract.

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

## Unverified (no evidence yet)

- Phase 0 drill results (shutdown order, Postgres-down readiness, etc.)
- UUIDv7 behavior in Prisma 7.10 (version nibble never checked)
- `migrate dev` / `migrate diff` drift experiment (does Prisma drop my
  partial indexes / CHECKs?)
- Constraint tests as the `app` role, seed script, green CI after grants migration

## Open findings to fix (Phase 1 close-out)

**All 8 findings resolved.** See "Done and verified" above.

## Phase 2 notes

- Contract v1 must be redesigned before more tests: conditions as an array of
  {attribute, operator, value}; discriminated union per operator; UUID ids;
  strict on write, tolerant on read (reject only unsupported schemaVersion).
- Engine should return {value, reason, ruleId?}; no sorting on the hot path;
  no localeCompare; package tests import from ../src.
- Write docs/contract-v1.md BEFORE more code.

## Decisions made (see domain-analysis.md for full list)

- Evaluator: Redis + R2 only, no Postgres, no DATABASE_URL.
- ACTIVE PublishedSnapshot row = only live pointer. One ACTIVE + one PENDING
  per environment (partial unique indexes).
- Roles: migrator / app / worker. RLS planned after Phase 4, not now.
- Real R2 (no MinIO), bcryptjs cost 12, UUIDv7.

## Next session

1. Collect missing evidence (UUIDv7 check, drift experiment, app-role constraint tests, green CI).
2. Implement `@squidflag/contracts` per `docs/contract-v1.md` with golden-vector tests.
3. Implement `@squidflag/flag-engine` with pure evaluation logic.
