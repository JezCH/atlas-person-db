BEGIN;

-- Never narrow the discriminator during replay.
-- This migration is replayed by the Production correction transport on every
-- apply. The ledger may already contain rows written by any later registered
-- manifest schema, so replay must never narrow the discriminator temporarily.
-- Keep every currently supported schema valid at this historical migration
-- boundary; later migrations repeat the same superset constraint idempotently.
ALTER TABLE atlas_v2.correction_manifest_runs
  DROP CONSTRAINT IF EXISTS correction_manifest_runs_manifest_schema_check;

ALTER TABLE atlas_v2.correction_manifest_runs
  ADD CONSTRAINT correction_manifest_runs_manifest_schema_check
  CHECK (manifest_schema IN (
    'atlas-correction-manifest/v1',
    'atlas-correction-manifest/v1.1',
    'atlas-correction-manifest/v1.2',
    'atlas-correction-manifest/v1.3',
    'atlas-correction-manifest/v1.4',
    'atlas-correction-manifest/v2'
  ));

COMMIT;
