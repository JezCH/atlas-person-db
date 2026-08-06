#!/usr/bin/env bash
set -euo pipefail
rm -rf migration/phase-7/tmp/live
mkdir -p migration/phase-7/tmp/live
psql "$SUPABASE_DB_URL" --set=ON_ERROR_STOP=1 --no-psqlrc --file migration/phase-7/scripts/export-phase7b-live.sql > migration/phase-7/tmp/live/export.log 2>&1
test -s migration/phase-7/tmp/live/legacy.raw
test -s migration/phase-7/tmp/live/v2.raw
cp migration/phase-7/tmp/live/legacy.raw migration/phase-7/tmp/live/legacy.json
cp migration/phase-7/tmp/live/v2.raw migration/phase-7/tmp/live/v2.json
node migration/phase-7/scripts/phase7a-contract.mjs > migration/phase-7/tmp/live/phase7a-contract.json
node migration/phase-7/scripts/phase7b-contract.mjs > migration/phase-7/tmp/live/phase7b-contract.json
node migration/phase-7/scripts/phase7b-live-smoke.mjs migration/phase-7/tmp/live/legacy.json migration/phase-7/tmp/live/v2.json migration/phase-7/tmp/live/report.json
