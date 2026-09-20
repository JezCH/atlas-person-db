BEGIN;
SELECT pg_advisory_xact_lock(hashtext('atlas-runtime:person-politics-v1:exclusion-target-schema'));
SET LOCAL lock_timeout = '10s';

CREATE TABLE IF NOT EXISTS atlas_v2.runtime_compile_exclusions (
  compile_key text NOT NULL REFERENCES atlas_v2.runtime_compile_runs(compile_key) ON DELETE RESTRICT,
  activity_id uuid NOT NULL,
  person_id uuid NOT NULL,
  polity_id uuid NOT NULL,
  reason_code text NOT NULL CHECK (reason_code IN (
    'RELATION_TYPE_UNRESOLVED',
    'START_BOUNDARY_UNRESOLVED',
    'END_BOUNDARY_UNRESOLVED',
    'ONGOING_VERIFICATION_UNRESOLVED',
    'PROVENANCE_UNRESOLVED'
  )),
  PRIMARY KEY (compile_key, activity_id)
);

CREATE INDEX IF NOT EXISTS runtime_compile_exclusions_reason_idx
  ON atlas_v2.runtime_compile_exclusions(compile_key, reason_code, activity_id);

COMMIT;
