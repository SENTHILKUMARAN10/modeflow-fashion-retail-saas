#!/usr/bin/env bash
set -euo pipefail

# DESTRUCTIVE: restores a SalesDesk backup into a dedicated disposable test database.
# Never point RESTORE_TEST_DB_URL at production.

: "${BACKUP_FILE:?Set BACKUP_FILE to a .dump created by backup.sh}"
: "${RESTORE_TEST_DB_URL:?Set RESTORE_TEST_DB_URL to a disposable staging/test Postgres database}"

if [[ "${ALLOW_DESTRUCTIVE_RESTORE_TEST:-false}" != "true" ]]; then
  echo "Refusing destructive restore. Set ALLOW_DESTRUCTIVE_RESTORE_TEST=true only for a disposable restore-test database." >&2
  exit 2
fi

[[ -f "$BACKUP_FILE" ]] || { echo "Backup file not found: $BACKUP_FILE" >&2; exit 2; }
command -v pg_restore >/dev/null 2>&1 || { echo "pg_restore is required." >&2; exit 2; }
command -v psql >/dev/null 2>&1 || { echo "psql is required." >&2; exit 2; }

pg_restore --list "$BACKUP_FILE" >/dev/null

echo "Restoring into disposable test database..."
pg_restore "$BACKUP_FILE" \
  --dbname="$RESTORE_TEST_DB_URL" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --exit-on-error

echo "Running structural verification..."
psql "$RESTORE_TEST_DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
select to_regclass('public.businesses') as businesses_table,
       to_regclass('public.products') as products_table,
       to_regclass('public.invoices') as invoices_table,
       to_regclass('public.expenses') as expenses_table;

select count(*) as businesses from public.businesses;
select count(*) as products from public.products;
select count(*) as invoices from public.invoices;
select count(*) as expenses from public.expenses;
SQL

echo "Restore test completed successfully. Record the date and result in the production runbook."
