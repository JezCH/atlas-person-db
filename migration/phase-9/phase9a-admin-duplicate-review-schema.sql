BEGIN;

SELECT pg_advisory_xact_lock(hashtext('atlas-phase9a-admin-duplicate-review-v2'));

DO $$
BEGIN
  IF to_regclass('atlas_v2.persons') IS NULL THEN
    RAISE EXCEPTION 'atlas_v2.persons is required';
  END IF;
  IF to_regclass('atlas_v2.person_names') IS NULL THEN
    RAISE EXCEPTION 'atlas_v2.person_names is required';
  END IF;
  IF to_regclass('atlas_v2.person_politics_v2') IS NULL THEN
    RAISE EXCEPTION 'atlas_v2.person_politics_v2 is required';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS atlas_v2.person_duplicate_candidates (
  id uuid PRIMARY KEY,
  person_low_id uuid NOT NULL REFERENCES atlas_v2.persons(id) ON DELETE RESTRICT,
  person_high_id uuid NOT NULL REFERENCES atlas_v2.persons(id) ON DELETE RESTRICT,
  candidate_state text NOT NULL DEFAULT 'ACTIVE'
    CHECK (candidate_state IN ('ACTIVE', 'STALE')),
  current_decision text NULL
    CHECK (current_decision IS NULL OR current_decision IN ('MERGE', 'KEEP_SEPARATE', 'REVIEW')),
  confidence numeric(5,4) NOT NULL
    CHECK (confidence >= 0 AND confidence <= 1),
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_fingerprint text NOT NULL,
  decision_evidence_fingerprint text NULL,
  detector_version text NOT NULL,
  first_detected_at timestamptz NOT NULL DEFAULT now(),
  last_detected_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz NULL,
  review_count integer NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (person_low_id < person_high_id),
  UNIQUE (person_low_id, person_high_id)
);

CREATE INDEX IF NOT EXISTS person_duplicate_candidates_queue_idx
  ON atlas_v2.person_duplicate_candidates
  (candidate_state, current_decision, confidence DESC, last_detected_at DESC);

CREATE TABLE IF NOT EXISTS atlas_v2.person_duplicate_reviews (
  id uuid PRIMARY KEY,
  candidate_id uuid NOT NULL REFERENCES atlas_v2.person_duplicate_candidates(id) ON DELETE RESTRICT,
  person_low_id uuid NOT NULL,
  person_high_id uuid NOT NULL,
  decision text NOT NULL CHECK (decision IN ('MERGE', 'KEEP_SEPARATE', 'REVIEW')),
  rationale text NULL,
  evidence_snapshot jsonb NOT NULL,
  evidence_fingerprint text NOT NULL,
  reviewer_kind text NOT NULL DEFAULT 'admin_session'
    CHECK (reviewer_kind IN ('admin_session', 'server_bearer')),
  request_id text NOT NULL UNIQUE,
  reviewed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS person_duplicate_reviews_candidate_idx
  ON atlas_v2.person_duplicate_reviews(candidate_id, reviewed_at DESC);

DO $$
DECLARE
  candidate_columns integer;
  review_columns integer;
BEGIN
  SELECT count(*) INTO candidate_columns
  FROM information_schema.columns
  WHERE table_schema = 'atlas_v2'
    AND table_name = 'person_duplicate_candidates';

  SELECT count(*) INTO review_columns
  FROM information_schema.columns
  WHERE table_schema = 'atlas_v2'
    AND table_name = 'person_duplicate_reviews';

  IF candidate_columns < 16 THEN
    RAISE EXCEPTION 'person_duplicate_candidates contract incomplete: % columns', candidate_columns;
  END IF;
  IF review_columns < 11 THEN
    RAISE EXCEPTION 'person_duplicate_reviews contract incomplete: % columns', review_columns;
  END IF;
END $$;

COMMIT;
