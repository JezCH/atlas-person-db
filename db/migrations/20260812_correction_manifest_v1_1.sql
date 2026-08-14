BEGIN;

-- This migration may be replayed on a ledger that already contains later v2
-- records. Never narrow the discriminator during replay: v1.1 adds support
-- without invalidating schemas introduced by the following registered migration.
ALTER TABLE atlas_v2.correction_manifest_runs
  DROP CONSTRAINT IF EXISTS correction_manifest_runs_manifest_schema_check;

ALTER TABLE atlas_v2.correction_manifest_runs
  ADD CONSTRAINT correction_manifest_runs_manifest_schema_check
  CHECK (manifest_schema IN (
    'atlas-correction-manifest/v1',
    'atlas-correction-manifest/v1.1',
    'atlas-correction-manifest/v2'
  ));

COMMIT;
