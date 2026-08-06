#!/usr/bin/env bash
set -euo pipefail

rm -rf migration/phase-8/tmp/phase8a
mkdir -p migration/phase-8/tmp/phase8a

node migration/phase-8/scripts/phase8a-repository-inventory.mjs migration/phase-8/tmp/phase8a/repository-inventory.json

if [[ -n "${SUPABASE_DB_URL:-}" ]]; then
  psql "$SUPABASE_DB_URL" --set=ON_ERROR_STOP=1 --no-psqlrc --file migration/phase-8/scripts/export-phase8a-db-inventory.sql > migration/phase-8/tmp/phase8a/database-export.log 2>&1
  test -s migration/phase-8/tmp/phase8a/database-inventory.json
  node migration/phase-8/scripts/phase8a-db-inventory.mjs migration/phase-8/tmp/phase8a/database-inventory.json migration/phase-8/tmp/phase8a/database-inventory-report.json
else
  printf '%s\n' '{"marker":"PHASE_8A_DATABASE_OBJECT_INVENTORY","status":"SKIPPED_NO_DATABASE_SECRET"}' > migration/phase-8/tmp/phase8a/database-inventory-report.json
fi

printf '%s\n' "PHASE_8A_INVENTORY_READY" > migration/phase-8/tmp/phase8a/marker.txt
