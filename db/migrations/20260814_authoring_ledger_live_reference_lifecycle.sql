BEGIN;

-- The authoring ledger is immutable audit evidence. Its JSON result_snapshot keeps
-- the UUIDs that were created by the reviewed manifest, while person_id and
-- relationship_id are only live convenience pointers. Those pointers must not
-- prevent later lifecycle operations such as Stage 2-native Activity deletion or
-- the deferred P10 physical Person merge.
--
-- Authoring migrations are invoked on every authoring request. Serialize the one-
-- time constraint transition and inspect PostgreSQL's current FK delete action so
-- steady-state requests never DROP/ADD already-correct constraints.
SELECT pg_advisory_xact_lock(
  hashtext('atlas-authoring-migration:20260814-ledger-live-reference-lifecycle')
);

DO $$
DECLARE
  person_delete_action "char";
  relationship_delete_action "char";
BEGIN
  SELECT c.confdeltype
    INTO person_delete_action
    FROM pg_constraint AS c
   WHERE c.conrelid = 'atlas_v2.authoring_manifest_runs'::regclass
     AND c.conname = 'authoring_manifest_runs_person_id_fkey';

  IF person_delete_action IS DISTINCT FROM 'n' THEN
    ALTER TABLE atlas_v2.authoring_manifest_runs
      DROP CONSTRAINT IF EXISTS authoring_manifest_runs_person_id_fkey;
    ALTER TABLE atlas_v2.authoring_manifest_runs
      ADD CONSTRAINT authoring_manifest_runs_person_id_fkey
      FOREIGN KEY (person_id)
      REFERENCES atlas_v2.persons(id)
      ON DELETE SET NULL;
  END IF;

  SELECT c.confdeltype
    INTO relationship_delete_action
    FROM pg_constraint AS c
   WHERE c.conrelid = 'atlas_v2.authoring_manifest_runs'::regclass
     AND c.conname = 'authoring_manifest_runs_relationship_id_fkey';

  IF relationship_delete_action IS DISTINCT FROM 'n' THEN
    ALTER TABLE atlas_v2.authoring_manifest_runs
      DROP CONSTRAINT IF EXISTS authoring_manifest_runs_relationship_id_fkey;
    ALTER TABLE atlas_v2.authoring_manifest_runs
      ADD CONSTRAINT authoring_manifest_runs_relationship_id_fkey
      FOREIGN KEY (relationship_id)
      REFERENCES atlas_v2.person_politics_v2(id)
      ON DELETE SET NULL;
  END IF;
END $$;

COMMIT;
