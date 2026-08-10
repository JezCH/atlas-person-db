BEGIN;

SELECT pg_advisory_xact_lock(hashtext('atlas-phase9b-person-merge-schema'));

DO $$
BEGIN
  IF to_regclass('atlas_v2.person_duplicate_candidates') IS NULL THEN
    RAISE EXCEPTION 'Phase 9A candidate schema is required';
  END IF;
  IF to_regclass('atlas_v2.person_duplicate_reviews') IS NULL THEN
    RAISE EXCEPTION 'Phase 9A review schema is required';
  END IF;
END $$;

-- Candidate person UUIDs become immutable historical snapshots after a merge.
-- Active candidates are still generated only from existing atlas_v2.persons.
ALTER TABLE atlas_v2.person_duplicate_candidates
  DROP CONSTRAINT IF EXISTS person_duplicate_candidates_person_low_id_fkey;
ALTER TABLE atlas_v2.person_duplicate_candidates
  DROP CONSTRAINT IF EXISTS person_duplicate_candidates_person_high_id_fkey;

CREATE TABLE IF NOT EXISTS atlas_v2.person_merge_audits (
  id uuid PRIMARY KEY,
  request_id text NOT NULL UNIQUE,
  candidate_id uuid NOT NULL,
  review_id uuid NOT NULL,
  survivor_person_id uuid NOT NULL,
  source_person_id uuid NOT NULL,
  evidence_fingerprint text NOT NULL,
  reviewer_kind text NOT NULL
    CHECK (reviewer_kind IN ('admin_session', 'server_bearer')),
  survivor_before jsonb NOT NULL,
  source_before jsonb NOT NULL,
  mutation_summary jsonb NOT NULL,
  merged_at timestamptz NOT NULL DEFAULT now(),
  CHECK (survivor_person_id <> source_person_id)
);

CREATE INDEX IF NOT EXISTS person_merge_audits_candidate_idx
  ON atlas_v2.person_merge_audits(candidate_id, merged_at DESC);
CREATE INDEX IF NOT EXISTS person_merge_audits_survivor_idx
  ON atlas_v2.person_merge_audits(survivor_person_id, merged_at DESC);
CREATE INDEX IF NOT EXISTS person_merge_audits_source_idx
  ON atlas_v2.person_merge_audits(source_person_id, merged_at DESC);

DO $$
DECLARE
  remaining_candidate_person_fks integer;
  audit_columns integer;
BEGIN
  SELECT count(*) INTO remaining_candidate_person_fks
  FROM pg_constraint
  WHERE contype='f'
    AND conrelid='atlas_v2.person_duplicate_candidates'::regclass
    AND confrelid='atlas_v2.persons'::regclass;
  IF remaining_candidate_person_fks <> 0 THEN
    RAISE EXCEPTION 'candidate person FK retirement incomplete: %', remaining_candidate_person_fks;
  END IF;

  SELECT count(*) INTO audit_columns
  FROM information_schema.columns
  WHERE table_schema='atlas_v2' AND table_name='person_merge_audits';
  IF audit_columns <> 13 THEN
    RAISE EXCEPTION 'person_merge_audits contract incomplete: % columns', audit_columns;
  END IF;
END $$;

COMMIT;
