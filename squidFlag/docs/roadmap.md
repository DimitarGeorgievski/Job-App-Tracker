# SquidFlag roadmap

Goal: a standalone feature-flag platform. Other apps ask "is feature X on for
this user?" and get an answer fast, without hitting PostgreSQL.

Last updated: 2026-11-03

## Architecture in one paragraph

Control plane (NestJS + Postgres) manages orgs, projects, environments, flags,
rules, keys and publishing. Publishing writes an immutable JSON snapshot to R2.
Data plane (evaluator) reads Redis and R2 only, never PostgreSQL, and evaluates
flags in memory. No WebSockets.

## Status

| Phase | What                                                   | Status                         |
| ----- | ------------------------------------------------------ | ------------------------------ |
| 0     | Workspace, tooling, config, logging, health, tests, CI | Done                           |
| 1     | Database schema, roles, migrations, constraint tests   | Done (8 findings resolved)     |
| 2     | Contracts (zod) and flag engine                        | Done (111 tests passing)       |
| 3     | Dashboard authentication                               | **Done (API)**                 |
| 4     | Orgs, projects, environments, RBAC, audit log          | Not started                    |
| 5     | Flag and rule authoring (draft)                        | Not started                    |
| 6     | Publishing (PENDING -> ACTIVE) and R2                  | Not started (R2Service exists) |
| 7     | Redis cache and sync                                   | Not started                    |
| 8     | SDK keys and evaluator                                 | Not started                    |
| 9     | Public API and Node SDK                                | Not started                    |
| 10    | Dashboard UI                                           | Not started                    |
| 11    | Hardening, observability, deployment                   | Not started                    |

## Next up

2. **Phase 3**: Dashboard frontend (login page, protected routes, auth context, api-client)
3. **Phase 4**: Orgs, projects, environments, RBAC, audit log

## MVP: first working loop

Toggle a flag in the dashboard, publish, and see an app's evaluation flip in
seconds.

Needs phases 2 through 8 plus a basic UI. Done when:

- [x] Login works (JWT in HttpOnly cookie, refresh rotation) — API complete
- [ ] Create org, project and flag; edit rules as a draft
- [ ] Publish creates a snapshot in R2 and activates it
- [ ] Evaluator answers `POST /v1/evaluate` using Redis and R2 only
- [ ] Killing PostgreSQL does not stop evaluations
- [ ] JobTracker uses one real SquidFlag flag

## After the MVP

- Percentage rollouts (deterministic hash of userId + flagKey)
- Segments
- Bulk evaluate, ETag config download, Node SDK with local evaluation
- Row-level security (after Phase 4 plumbing exists)
- Security hardening: threat model, key rotation, leak runbook, backups
- Observability: metrics, propagation-lag dashboard, alerts
- Deployment: Docker image, CI/CD, migrations as a one-off job
- Extract the evaluator into its own service

## Later, not scheduled

String/number/JSON flags and variants, scheduled releases, approvals, webhooks,
SSO/MFA, browser SDK, other-language SDKs, edge evaluation.

## Rules that never change

- Claude write the code; I guides and reviews.
- Evaluator never touches PostgreSQL.
- The ACTIVE snapshot row is the only live pointer.
- Applied migrations are append-only.
- Nothing is "done" without evidence (test, drill or run output).
