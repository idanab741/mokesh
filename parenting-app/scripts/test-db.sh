#!/usr/bin/env bash
# Applies the migrations to a throwaway database on a local Postgres and runs the RLS tests.
# Usage: PGURL=postgres://user:pass@host:port/postgres ./scripts/test-db.sh
set -euo pipefail
cd "$(dirname "$0")/.."
ADMIN_URL="${PGURL:-postgres://postgres@localhost:5432/postgres}"
DB="parenting_rls_test"
psql "$ADMIN_URL" -q -c "drop database if exists $DB" -c "create database $DB"
TEST_URL="${ADMIN_URL%/*}/$DB"
run() { psql "$TEST_URL" -q -v ON_ERROR_STOP=1 -f "$1"; }
run supabase/tests/00_local_auth_stub.sql
for f in supabase/migrations/*.sql; do
  case "$f" in *storage*) echo "skip $f (needs Supabase storage schema)";; *) echo "apply $f"; run "$f";; esac
done
run supabase/tests/rls_test.sql 2>&1 | grep -E "ok -|FAILED|ERROR|ALL RLS" 
psql "$ADMIN_URL" -q -c "drop database if exists $DB"
