BEGIN;

CREATE TABLE IF NOT EXISTS atlas_v2.correction_manifest_runs (
  request_id text PRIMARY KEY,
  manifest_hash text NOT NULL,
  manifest_schema text NOT NULL,
  result_snapshot jsonb NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT correction_manifest_runs_manifest_schema_check
    CHECK (manifest_schema IN ('atlas-correction-manifest/v1')),
  CONSTRAINT correction_manifest_runs_result_snapshot_check
    CHECK (jsonb_typeof(result_snapshot) = 'object')
);

COMMIT;
