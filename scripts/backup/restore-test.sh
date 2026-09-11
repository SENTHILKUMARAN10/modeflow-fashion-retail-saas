#!/usr/bin/env bash
set -euo pipefail

# DESTRUCTIVE: restores a SalesDesk backup into a dedicated disposable database.
# Never point RESTORE_TEST_DB_URL at production.

: "${BACKUP_FILE:?Set BACKUP_FILE to a .dump created by backup.sh}"
: "${RESTORE_TEST_DB_URL:?Set RESTORE_TEST_DB_URL to a disposable staging/test Postgres database}"

if [[ "${ALLOW_DESTRUCTIVE_RESTORE_TEST:-false}" != "true" ]]; then
  echo "Refusing destructive restore. Set ALLOW_DESTRUCTIVE_RESTORE_TEST=true only for a disposable restore-test database." >&2
  exit 2
fi
[[ -f "$BACKUP_FILE" ]] || { echo "Backup file not found: $BACKUP_FILE" >&2; exit 2; }
for cmd in pg_restore psql; do command -v "$cmd" >/dev/null 2>&1 || { echo "$cmd is required." >&2; exit 2; }; done

CHECKSUM_FILE="${BACKUP_FILE}.sha256"
COUNTS_FILE="${BACKUP_FILE}.counts.tsv"
if [[ -f "$CHECKSUM_FILE" ]]; then
  if command -v sha256sum >/dev/null 2>&1; then (cd "$(dirname "$BACKUP_FILE")" && sha256sum -c "$(basename "$CHECKSUM_FILE")");
  elif command -v shasum >/dev/null 2>&1; then expected="$(awk '{print $1}' "$CHECKSUM_FILE")"; actual="$(shasum -a 256 "$BACKUP_FILE"|awk '{print $1}')"; [[ "$expected" == "$actual" ]] || { echo 'Backup checksum mismatch.' >&2; exit 1; };
  else echo 'Skipping checksum verification: no SHA-256 utility found.' >&2; fi
fi

pg_restore --list "$BACKUP_FILE" >/dev/null
echo "Restoring into disposable test database..."
pg_restore "$BACKUP_FILE" --dbname="$RESTORE_TEST_DB_URL" --clean --if-exists --no-owner --no-privileges --exit-on-error

echo "Verifying critical schema, RLS and server functions..."
psql "$RESTORE_TEST_DB_URL" -v ON_ERROR_STOP=1 <<'SQL'
do $$
declare t text;begin
  foreach t in array array['businesses','business_members','products','customers','invoices','invoice_items','expenses','stock_movements','suppliers','purchases','branches','warehouses','inventory_balances','sales_documents','customer_followups','business_notifications','automation_rules'] loop
    if to_regclass('public.'||t) is null then raise exception 'Missing critical table public.%',t;end if;
  end loop;
end $$;

do $$
declare t text;enabled boolean;begin
  foreach t in array array['businesses','business_members','products','customers','invoices','expenses','stock_movements','suppliers','purchases','branches','warehouses','inventory_balances','sales_documents','customer_followups','business_notifications','automation_rules'] loop
    select c.relrowsecurity into enabled from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=t;
    if enabled is distinct from true then raise exception 'RLS is disabled on public.%',t;end if;
  end loop;
end $$;

do $$ begin
  if to_regprocedure('public.complete_multi_item_sale(uuid,text,text,jsonb,numeric,text,text,uuid,uuid)') is null then raise exception 'Missing complete_multi_item_sale';end if;
  if to_regprocedure('public.salesdesk_role_capabilities(uuid)') is null then raise exception 'Missing salesdesk_role_capabilities';end if;
  if to_regprocedure('public.salesdesk_daily_brief_v2(uuid,uuid)') is null then raise exception 'Missing salesdesk_daily_brief_v2';end if;
  if to_regprocedure('public.salesdesk_process_recurring_invoice(uuid,timestamp with time zone)') is null then raise exception 'Missing recurring invoice processor';end if;
end $$;
SQL

if [[ -f "$COUNTS_FILE" ]]; then
  echo "Comparing restored critical-table counts with the source manifest..."
  while IFS=$'\t' read -r table expected; do
    [[ "$table" == "table" || "$expected" == "MISSING" || -z "$table" ]] && continue
    actual="$(psql "$RESTORE_TEST_DB_URL" -Atqc "select count(*) from public.${table}")"
    if [[ "$actual" != "$expected" ]]; then echo "Count mismatch for ${table}: expected ${expected}, restored ${actual}" >&2; exit 1; fi
    echo "PASS ${table}: ${actual} rows"
  done < "$COUNTS_FILE"
else
  echo "Count manifest not found; structural checks passed but row-count parity was not verified." >&2
fi

echo "SalesDesk restore test PASSED. Record this run and retain no customer data in the disposable environment."
