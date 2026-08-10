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
  candidate_contract_errors text;
  review_contract_errors text;
BEGIN
  WITH expected(column_name, data_type) AS (
    VALUES
      ('id', 'uuid'),
      ('person_low_id', 'uuid'),
      ('person_high_id', 'uuid'),
      ('candidate_state', 'text'),
      ('current_decision', 'text'),
      ('confidence', 'numeric'),
      ('evidence', 'jsonb'),
      ('evidence_fingerprint', 'text'),
      ('decision_evidence_fingerprint', 'text'),
      ('detector_version', 'text'),
      ('first_detected_at', 'timestamp with time zone'),
      ('last_detected_at', 'timestamp with time zone'),
      ('reviewed_at', 'timestamp with time zone'),
      ('review_count', 'integer'),
      ('updated_at', 'timestamp with time zone')
  )
  SELECT string_agg(
           expected.column_name || ':' || expected.data_type || '!=' || coalesce(actual.data_type, '<missing>'),
           ', ' ORDER BY expected.column_name
         )
    INTO candidate_contract_errors
    FROM expected
    LEFT JOIN information_schema.columns actual
      ON actual.table_schema = 'atlas_v2'
     AND actual.table_name = 'person_duplicate_candidates'
     AND actual.column_name = expected.column_name
   WHERE actual.column_name IS NULL
      OR actual.data_type <> expected.data_type;

  WITH expected(column_name, data_type) AS (
    VALUES
      ('id', 'uuid'),
      ('candidate_id', 'uuid'),
      ('person_low_id', 'uuid'),
      ('person_high_id', 'uuid'),
      ('decision', 'text'),
      ('rationale', 'text'),
      ('evidence_snapshot', 'jsonb'),
      ('evidence_fingerprint', 'text'),
      ('reviewer_kind', 'text'),
      ('request_id', 'text'),
      ('reviewed_at', 'timestamp with time zone')
  )
  SELECT string_agg(
           expected.column_name || ':' || expected.data_type || '!=' || coalesce(actual.data_type, '<missing>'),
           ', ' ORDER BY expected.column_name
         )
    INTO review_contract_errors
    FROM expected
    LEFT JOIN information_schema.columns actual
      ON actual.table_schema = 'atlas_v2'
     AND actual.table_name = 'person_duplicate_reviews'
     AND actual.column_name = expected.column_name
   WHERE actual.column_name IS NULL
      OR actual.data_type <> expected.data_type;

  IF candidate_contract_errors IS NOT NULL THEN
    RAISE EXCEPTION 'person_duplicate_candidates contract mismatch: %', candidate_contract_errors;
  END IF;
  IF review_contract_errors IS NOT NULL THEN
    RAISE EXCEPTION 'person_duplicate_reviews contract mismatch: %', review_contract_errors;
  END IF;
END $$;

COMMIT;
