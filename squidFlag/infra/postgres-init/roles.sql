-- SquidFlag database roles and base grants
-- This file is sourced by both:
--   1. infra/postgres-init/01-roles-and-databases.sh (Docker Compose)
--   2. CI pipeline (psql -f roles.sql) before migrations
-- Roles: migrator (schema owner), app (runtime), worker (maintenance)

-- Create roles
CREATE ROLE migrator
  LOGIN
  NOSUPERUSER
  CREATEDB
  NOCREATEROLE
  NOINHERIT
  NOREPLICATION
  NOBYPASSRLS
  PASSWORD :'migrator_password';

CREATE ROLE app
  LOGIN
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOINHERIT
  NOREPLICATION
  NOBYPASSRLS
  PASSWORD :'app_password';

CREATE ROLE worker
  LOGIN
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOINHERIT
  NOREPLICATION
  NOBYPASSRLS
  PASSWORD :'worker_password';

-- Base grants on primary database (squidflag)
GRANT CONNECT ON DATABASE squidflag TO migrator;
GRANT USAGE, CREATE ON SCHEMA public TO migrator;

GRANT CONNECT ON DATABASE squidflag TO app, worker;
GRANT USAGE ON SCHEMA public TO app, worker;
REVOKE CREATE ON SCHEMA public FROM app, worker;

-- Test database for CI (created by migrator)
-- Note: squidflag_test and squidflag_privilege_test are created by the init script
-- using the migrator role, then this file is run against them to grant access.
-- See 01-roles-and-databases.sh for database creation logic.