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

-- Candidate UUIDs become immutable historical snapshots after a merge.
-- Candidate generation still reads only live atlas_v2.persons identities.
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
  missing_columns text[];
  mismatched_columns text[];
BEGIN
  SELECT count(*) INTO remaining_candidate_person_fks
  FROM pg_constraint
  WHERE contype='f'
    AND conrelid='atlas_v2.person_duplicate_candidates'::regclass
    AND confrelid='atlas_v2.persons'::regclass;
  IF remaining_candidate_person_fks <> 0 THEN
    RAISE EXCEPTION 'candidate person FK retirement incomplete: %', remaining_candidate_person_fks;
  END IF;

  WITH required(column_name, data_type) AS (VALUES
    ('id','uuid'),
    ('request_id','text'),
    ('candidate_id','uuid'),
    ('review_id','uuid'),
    ('survivor_person_id','uuid'),
    ('source_person_id','uuid'),
    ('evidence_fingerprint','text'),
    ('reviewer_kind','text'),
    ('survivor_before','jsonb'),
    ('source_before','jsonb'),
    ('mutation_summary','jsonb'),
    ('merged_at','timestamp with time zone')
  ), actual AS (
    SELECT column_name,data_type
    FROM information_schema.columns
    WHERE table_schema='atlas_v2' AND table_name='person_merge_audits'
  )
  SELECT array_agg(r.column_name ORDER BY r.column_name)
    INTO missing_columns
  FROM required r
  LEFT JOIN actual a USING(column_name)
  WHERE a.column_name IS NULL;

  IF coalesce(cardinality(missing_columns),0) > 0 THEN
    RAISE EXCEPTION 'person_merge_audits missing required columns: %', missing_columns;
  END IF;

  WITH required(column_name, data_type) AS (VALUES
    ('id','uuid'),('request_id','text'),('candidate_id','uuid'),('review_id','uuid'),
    ('survivor_person_id','uuid'),('source_person_id','uuid'),('evidence_fingerprint','text'),
    ('reviewer_kind','text'),('survivor_before','jsonb'),('source_before','jsonb'),
    ('mutation_summary','jsonb'),('merged_at','timestamp with time zone')
  )
  SELECT array_agg(r.column_name || ':' || a.data_type ORDER BY r.column_name)
    INTO mismatched_columns
  FROM required r
  JOIN information_schema.columns a
    ON a.table_schema='atlas_v2' AND a.table_name='person_merge_audits' AND a.column_name=r.column_name
  WHERE a.data_type <> r.data_type;

  IF coalesce(cardinality(mismatched_columns),0) > 0 THEN
    RAISE EXCEPTION 'person_merge_audits column type mismatch: %', mismatched_columns;
  END IF;
END $$;

COMMIT;
