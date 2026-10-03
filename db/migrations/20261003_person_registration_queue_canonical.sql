BEGIN;
SELECT pg_advisory_xact_lock(hashtext('atlas-authoring:person-registration-queue-canonical:v1'));
SET LOCAL lock_timeout='10s';

ALTER TABLE atlas_v2.person_candidate_registration_states
  ALTER COLUMN review_revision DROP NOT NULL,
  ALTER COLUMN registration_state SET DEFAULT 'QUEUED',
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS representative_domain text,
  ADD COLUMN IF NOT EXISTS priority text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid=to_regclass('atlas_v2.person_candidate_registration_states')
      AND conname='person_candidate_registration_metadata_object_ck'
  ) THEN
    ALTER TABLE atlas_v2.person_candidate_registration_states
      ADD CONSTRAINT person_candidate_registration_metadata_object_ck
      CHECK (jsonb_typeof(metadata)='object');
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS person_candidate_registration_pending_idx
  ON atlas_v2.person_candidate_registration_states(candidate_id)
  WHERE person_id IS NULL;

COMMIT;
