BEGIN;

SELECT pg_advisory_xact_lock(
  hashtext('atlas-authoring-migration:20260930-human-person-authoring-manifest-schema')
);

DO $$
DECLARE
  schema_check text;
BEGIN
  SELECT pg_get_constraintdef(c.oid)
    INTO schema_check
    FROM pg_constraint AS c
   WHERE c.conrelid = to_regclass('atlas_v2.authoring_manifest_runs')
     AND c.conname = 'authoring_manifest_runs_manifest_schema_check';

  IF schema_check IS NULL THEN
    ALTER TABLE atlas_v2.authoring_manifest_runs
      ADD CONSTRAINT authoring_manifest_runs_manifest_schema_check
      CHECK (
        manifest_schema IS NULL
        OR manifest_schema IN (
          'atlas-authoring-manifest/v1',
          'atlas-authoring-manifest/v2',
          'atlas-human-authoring/v1',
          'atlas-human-person-authoring/v1'
        )
      );
  ELSIF strpos(schema_check, 'atlas-human-person-authoring/v1') = 0 THEN
    IF strpos(schema_check, 'atlas-authoring-manifest/v1') = 0
       OR strpos(schema_check, 'atlas-authoring-manifest/v2') = 0
       OR strpos(schema_check, 'atlas-human-authoring/v1') = 0 THEN
      RAISE EXCEPTION 'AUTHORING_MANIFEST_SCHEMA_CHECK_DRIFT: %', schema_check;
    END IF;

    ALTER TABLE atlas_v2.authoring_manifest_runs
      DROP CONSTRAINT authoring_manifest_runs_manifest_schema_check;
    ALTER TABLE atlas_v2.authoring_manifest_runs
      ADD CONSTRAINT authoring_manifest_runs_manifest_schema_check
      CHECK (
        manifest_schema IS NULL
        OR manifest_schema IN (
          'atlas-authoring-manifest/v1',
          'atlas-authoring-manifest/v2',
          'atlas-human-authoring/v1',
          'atlas-human-person-authoring/v1'
        )
      );
  END IF;
END $$;

COMMIT;
