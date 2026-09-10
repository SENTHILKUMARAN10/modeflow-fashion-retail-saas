#!/usr/bin/env bash
set -euo pipefail

# SalesDesk logical backup helper.
# Use a dedicated database connection string from Supabase Project Settings.
# Do not commit the connection string or backup files.

: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL to the protected Postgres connection string}"

OUT_DIR="${BACKUP_DIR:-./backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_FILE="${OUT_DIR}/salesdesk-${STAMP}.dump"
mkdir -p "$OUT_DIR"

command -v pg_dump >/dev/null 2>&1 || { echo "pg_dump is required (PostgreSQL client tools)." >&2; exit 2; }

echo "Creating encrypted-transport logical backup: $OUT_FILE"
pg_dump "$SUPABASE_DB_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --verbose \
  --file="$OUT_FILE"

# Validate that PostgreSQL can read the archive catalogue.
pg_restore --list "$OUT_FILE" >/dev/null

echo "Backup created and archive catalogue verified: $OUT_FILE"
echo "Store this file in a protected, access-controlled backup location."
