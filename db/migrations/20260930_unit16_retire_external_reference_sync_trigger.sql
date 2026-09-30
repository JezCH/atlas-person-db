BEGIN;

-- Unit 16: reviewed NamuWiki mutation already delegates to the canonical writer.
DROP TRIGGER IF EXISTS authoring_manifest_runs_external_reference_sync
  ON atlas_v2.authoring_manifest_runs;
DROP FUNCTION IF EXISTS atlas_v2.sync_human_authoring_external_references();

COMMIT;
