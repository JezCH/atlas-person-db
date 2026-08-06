#!/usr/bin/env bash
set -euo pipefail
rm -rf migration/phase-6/tmp/preview
mkdir -p migration/phase-6/tmp/preview
psql "$SUPABASE_DB_URL" --set=ON_ERROR_STOP=1 --no-psqlrc --file migration/phase-6/scripts/export-preview-snapshots.sql > migration/phase-6/tmp/preview/export.log 2>&1
test -s migration/phase-6/tmp/preview/legacy.raw
test -s migration/phase-6/tmp/preview/v2.raw
cp migration/phase-6/tmp/preview/legacy.raw migration/phase-6/tmp/preview/legacy.json
cp migration/phase-6/tmp/preview/v2.raw migration/phase-6/tmp/preview/v2.json
node migration/phase-6/scripts/preview-smoke.mjs migration/phase-6/tmp/preview/legacy.json migration/phase-6/tmp/preview/v2.json migration/phase-6/tmp/preview/report.json
