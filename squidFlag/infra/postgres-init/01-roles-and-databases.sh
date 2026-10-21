#!/usr/bin/env bash
set -Eeuo pipefail
: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${MIGRATOR_PASSWORD:?MIGRATOR_PASSWORD is required}"
: "${APP_PASSWORD:?APP_PASSWORD is required}"
: "${WORKER_PASSWORD:?WORKER_PASSWORD is required}"
if [[ "$POSTGRES_USER" != "postgres" || "$POSTGRES_DB" != "squidflag" ]]; then
  echo "Expected POSTGRES_USER=postgres and POSTGRES_DB=squidflag." >&2
  exit 1
fi
psql \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --set=ON_ERROR_STOP=1 \
  --set=migrator_password="$MIGRATOR_PASSWORD" \
  --set=app_password="$APP_PASSWORD" \
  --set=worker_password="$WORKER_PASSWORD" <<'SQL'
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
GRANT CONNECT ON DATABASE squidflag TO migrator;
GRANT USAGE, CREATE ON SCHEMA public TO migrator;
GRANT CONNECT ON DATABASE squidflag TO app, worker;
GRANT USAGE ON SCHEMA public TO app, worker;
REVOKE CREATE ON SCHEMA public FROM app, worker;
CREATE DATABASE squidflag_test OWNER migrator;
SQL
psql \
  --username "$POSTGRES_USER" \
  --dbname squidflag_test \
  --set=ON_ERROR_STOP=1 <<'SQL'
GRANT CONNECT ON DATABASE squidflag_test TO migrator;
GRANT USAGE, CREATE ON SCHEMA public TO migrator;
SQL