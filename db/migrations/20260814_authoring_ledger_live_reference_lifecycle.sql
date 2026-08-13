BEGIN;

-- The authoring ledger is immutable audit evidence. Its JSON result_snapshot keeps
-- the UUIDs that were created by the reviewed manifest, while person_id and
-- relationship_id are only live convenience pointers. Those pointers must not
-- prevent later lifecycle operations such as Stage 2-native Activity deletion or
-- the deferred P10 physical Person merge.
ALTER TABLE atlas_v2.authoring_manifest_runs
  DROP CONSTRAINT IF EXISTS authoring_manifest_runs_person_id_fkey,
  DROP CONSTRAINT IF EXISTS authoring_manifest_runs_relationship_id_fkey;

ALTER TABLE atlas_v2.authoring_manifest_runs
  ADD CONSTRAINT authoring_manifest_runs_person_id_fkey
    FOREIGN KEY (person_id)
    REFERENCES atlas_v2.persons(id)
    ON DELETE SET NULL,
  ADD CONSTRAINT authoring_manifest_runs_relationship_id_fkey
    FOREIGN KEY (relationship_id)
    REFERENCES atlas_v2.person_politics_v2(id)
    ON DELETE SET NULL;

COMMIT;
