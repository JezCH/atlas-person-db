#!/usr/bin/env bash
set -euo pipefail
rm -rf migration/phase-7/tmp/activation
mkdir -p migration/phase-7/tmp/activation
node migration/phase-7/scripts/phase7a-contract.mjs > migration/phase-7/tmp/activation/phase7a-contract.json
node migration/phase-7/scripts/phase7b-contract.mjs > migration/phase-7/tmp/activation/phase7b-contract.json
node migration/phase-7/scripts/phase7c-preflight.mjs > migration/phase-7/tmp/activation/phase7c-static.json
psql "$SUPABASE_DB_URL" --set=ON_ERROR_STOP=1 --no-psqlrc --file migration/phase-7/scripts/export-phase7c-preflight.sql > migration/phase-7/tmp/activation/export.log 2>&1
test -s migration/phase-7/tmp/activation/preflight-db.json
node migration/phase-7/scripts/phase7c-db-preflight.mjs migration/phase-7/tmp/activation/preflight-db.json migration/phase-7/tmp/activation/phase7c-db.json
printf '%s\n' "PHASE_7C_PREFLIGHT_READY" > migration/phase-7/tmp/activation/marker.txt
