BEGIN;

ALTER TABLE atlas_v2.authoring_manifest_runs
  ADD COLUMN IF NOT EXISTS manifest_schema text,
  ADD COLUMN IF NOT EXISTS result_snapshot jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'authoring_manifest_runs_manifest_schema_check'
      AND conrelid = 'atlas_v2.authoring_manifest_runs'::regclass
  ) THEN
    ALTER TABLE atlas_v2.authoring_manifest_runs
      ADD CONSTRAINT authoring_manifest_runs_manifest_schema_check
      CHECK (
        manifest_schema IS NULL
        OR manifest_schema IN ('atlas-authoring-manifest/v1', 'atlas-authoring-manifest/v2')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'authoring_manifest_runs_result_snapshot_check'
      AND conrelid = 'atlas_v2.authoring_manifest_runs'::regclass
  ) THEN
    ALTER TABLE atlas_v2.authoring_manifest_runs
      ADD CONSTRAINT authoring_manifest_runs_result_snapshot_check
      CHECK (result_snapshot IS NULL OR jsonb_typeof(result_snapshot) = 'object');
  END IF;
END
$$;

COMMIT;
