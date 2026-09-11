#!/usr/bin/env bash
set -euo pipefail

# SalesDesk logical backup helper.
# Use a protected Postgres connection string from Supabase Project Settings.
# Do not commit the connection string or generated backup artifacts.

: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL to the protected Postgres connection string}"

OUT_DIR="${BACKUP_DIR:-./backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_FILE="${OUT_DIR}/salesdesk-${STAMP}.dump"
COUNTS_FILE="${OUT_FILE}.counts.tsv"
CHECKSUM_FILE="${OUT_FILE}.sha256"
mkdir -p "$OUT_DIR"
umask 077

for cmd in pg_dump pg_restore psql; do command -v "$cmd" >/dev/null 2>&1 || { echo "$cmd is required (PostgreSQL client tools)." >&2; exit 2; }; done

echo "Creating SalesDesk logical backup: $OUT_FILE"
pg_dump "$SUPABASE_DB_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --verbose \
  --file="$OUT_FILE"

pg_restore --list "$OUT_FILE" >/dev/null
chmod 600 "$OUT_FILE"

# Record critical-table counts so a restore test can prove the archive contains
# the same logical business records. Missing optional tables are marked MISSING.
TABLES=(businesses business_members products customers invoices invoice_items expenses stock_movements suppliers purchases purchase_items invoice_payments branches warehouses inventory_balances sales_documents customer_followups purchase_payments business_goals business_notifications automation_rules recurring_expense_schedules recurring_invoice_schedules scheduled_reports automation_deliveries)
printf 'table\tcount\n' > "$COUNTS_FILE"
for table in "${TABLES[@]}"; do
  exists="$(psql "$SUPABASE_DB_URL" -Atqc "select to_regclass('public.${table}') is not null")"
  if [[ "$exists" == "t" ]]; then
    count="$(psql "$SUPABASE_DB_URL" -Atqc "select count(*) from public.${table}")"
    printf '%s\t%s\n' "$table" "$count" >> "$COUNTS_FILE"
  else
    printf '%s\tMISSING\n' "$table" >> "$COUNTS_FILE"
  fi
done
chmod 600 "$COUNTS_FILE"

if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$OUT_FILE" > "$CHECKSUM_FILE"
elif command -v shasum >/dev/null 2>&1; then
  shasum -a 256 "$OUT_FILE" > "$CHECKSUM_FILE"
else
  echo "A SHA-256 utility (sha256sum or shasum) is required." >&2
  exit 2
fi
chmod 600 "$CHECKSUM_FILE"

echo "Backup archive catalogue verified."
echo "Critical-table counts: $COUNTS_FILE"
echo "Archive checksum: $CHECKSUM_FILE"
echo "Store all three files together in an encrypted, access-controlled backup location."
