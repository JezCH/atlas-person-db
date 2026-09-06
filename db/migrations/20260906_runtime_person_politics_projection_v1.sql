BEGIN;
SELECT pg_advisory_xact_lock(hashtext('atlas-runtime:person-politics-v1:schema'));
SET LOCAL lock_timeout = '10s';

CREATE TABLE IF NOT EXISTS atlas_v2.runtime_compile_runs (
  compile_key text PRIMARY KEY,
  compiler_version text NOT NULL,
  input_fingerprint text NOT NULL,
  output_fingerprint text NOT NULL,
  input_row_count integer NOT NULL CHECK (input_row_count >= 0),
  output_row_count integer NOT NULL CHECK (output_row_count >= 0),
  excluded_row_count integer NOT NULL CHECK (excluded_row_count >= 0),
  exclusion_summary jsonb NOT NULL CHECK (jsonb_typeof(exclusion_summary) = 'object'),
  compiled_at timestamptz NOT NULL DEFAULT now(),
  CHECK (input_row_count = output_row_count + excluded_row_count),
  CHECK (input_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (output_fingerprint ~ '^[0-9a-f]{64}$')
);

CREATE TABLE IF NOT EXISTS atlas_v2.runtime_person_politics_v1 (
  id uuid PRIMARY KEY,
  compile_key text NOT NULL REFERENCES atlas_v2.runtime_compile_runs(compile_key) ON DELETE RESTRICT,
  person_id uuid NOT NULL REFERENCES atlas_v2.persons(id) ON DELETE RESTRICT,
  polity_id uuid NOT NULL REFERENCES atlas_v2.polities(id) ON DELETE RESTRICT,
  relation_type_id uuid NOT NULL REFERENCES atlas_v2.person_polity_relation_types(id) ON DELETE RESTRICT,
  role_id uuid REFERENCES atlas_v2.roles(id) ON DELETE RESTRICT,
  period_basis_id uuid NOT NULL REFERENCES atlas_v2.period_bases(id) ON DELETE RESTRICT,
  activity_start integer NOT NULL CHECK (activity_start BETWEEN -10000 AND 9999 AND activity_start <> 0),
  activity_start_month smallint,
  activity_start_day smallint,
  activity_start_granularity text NOT NULL,
  activity_start_certainty text NOT NULL,
  activity_start_calendar text NOT NULL,
  activity_end integer,
  activity_end_month smallint,
  activity_end_day smallint,
  activity_end_granularity text,
  activity_end_certainty text,
  activity_end_calendar text,
  confidence text NOT NULL,
  chronology_status text NOT NULL,
  notes text,
  source_locator jsonb NOT NULL,
  content_hash text NOT NULL,
  provenance_snapshot jsonb NOT NULL CHECK (jsonb_typeof(provenance_snapshot) = 'object'),
  CHECK (atlas_v2.temporal_boundary_detail_valid(
    activity_start_month, activity_start_day, activity_start_granularity,
    activity_start_certainty, activity_start_calendar
  )),
  CHECK (
    (
      chronology_status = 'ongoing'
      AND activity_end IS NULL
      AND activity_end_month IS NULL
      AND activity_end_day IS NULL
      AND activity_end_granularity IS NULL
      AND activity_end_certainty IS NULL
      AND activity_end_calendar IS NULL
      AND ((source_locator->>'ongoing_as_of') ~ '^\d{4}-\d{2}-\d{2}$') IS TRUE
    )
    OR (
      chronology_status <> 'ongoing'
      AND activity_end IS NOT NULL
      AND activity_end BETWEEN -10000 AND 9999
      AND activity_end <> 0
      AND atlas_v2.temporal_boundary_detail_valid(
        activity_end_month, activity_end_day, activity_end_granularity,
        activity_end_certainty, activity_end_calendar
      )
      AND activity_end >= activity_start
    )
  )
);

CREATE INDEX IF NOT EXISTS runtime_person_politics_v1_person_idx
  ON atlas_v2.runtime_person_politics_v1(person_id, activity_start, activity_end, id);
CREATE INDEX IF NOT EXISTS runtime_person_politics_v1_polity_idx
  ON atlas_v2.runtime_person_politics_v1(polity_id, activity_start, activity_end, id);
CREATE INDEX IF NOT EXISTS runtime_person_politics_v1_compile_idx
  ON atlas_v2.runtime_person_politics_v1(compile_key);

COMMIT;
