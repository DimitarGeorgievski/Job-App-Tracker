#!/usr/bin/env bash
set -Eeuo pipefail
: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${MIGRATOR_PASSWORD:?MIGRATOR_PASSWORD is required}"
: "${APP_PASSWORD:?APP_PASSWORD is required}"
: "${WORKER_PASSWORD:?WORKER_PASSWORD is required}"
psql \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --set=ON_ERROR_STOP=1 \
  --set=migrator_password="$MIGRATOR_PASSWORD" \
  --set=app_password="$APP_PASSWORD" \
  --set=worker_password="$WORKER_PASSWORD" \
  --file /docker-entrypoint-initdb.d/roles.sql
psql \
  --username "$POSTGRES_USER" \
  --dbname postgres \
  --set=ON_ERROR_STOP=1 <<'SQL'
CREATE DATABASE squidflag_test OWNER migrator;
CREATE DATABASE squidflag_privilege_test OWNER migrator;
SQL

-- Grant access to test databases
psql \
  --username "$POSTGRES_USER" \
  --dbname squidflag_test \
  --set=ON_ERROR_STOP=1 \
  --set=migrator_password="$MIGRATOR_PASSWORD" \
  --set=app_password="$APP_PASSWORD" \
  --set=worker_password="$WORKER_PASSWORD" <<'SQL'
GRANT CONNECT ON DATABASE squidflag_test TO migrator;
GRANT USAGE, CREATE ON SCHEMA public TO migrator;
GRANT CONNECT ON DATABASE squidflag_test TO app, worker;
GRANT USAGE ON SCHEMA public TO app, worker;
REVOKE CREATE ON SCHEMA public FROM app, worker;
SQL

psql \
  --username "$POSTGRES_USER" \
  --dbname squidflag_privilege_test \
  --set=ON_ERROR_STOP=1 \
  --set=migrator_password="$MIGRATOR_PASSWORD" \
  --set=app_password="$APP_PASSWORD" \
  --set=worker_password="$WORKER_PASSWORD" <<'SQL'
GRANT CONNECT ON DATABASE squidflag_privilege_test TO migrator;
GRANT USAGE, CREATE ON SCHEMA public TO migrator;
GRANT CONNECT ON DATABASE squidflag_privilege_test TO app, worker;
GRANT USAGE ON SCHEMA public TO app, worker;
REVOKE CREATE ON SCHEMA public FROM app, worker;
SQL