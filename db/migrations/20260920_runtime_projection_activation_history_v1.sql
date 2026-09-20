BEGIN;
SELECT pg_advisory_xact_lock(hashtext('atlas-runtime:person-politics-v1:activation-schema'));
SET LOCAL lock_timeout = '10s';

CREATE TABLE IF NOT EXISTS atlas_v2.runtime_projection_activations (
  id bigserial PRIMARY KEY,
  projection_name text NOT NULL,
  compile_key text NOT NULL REFERENCES atlas_v2.runtime_compile_runs(compile_key) ON DELETE RESTRICT,
  activation_kind text NOT NULL CHECK (activation_kind IN ('baseline_observed','compile_commit')),
  runtime_sha text,
  authoring_sha text,
  row_count integer NOT NULL CHECK (row_count >= 0),
  activated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (
      activation_kind = 'baseline_observed'
      AND runtime_sha IS NULL
      AND authoring_sha IS NULL
    )
    OR (
      activation_kind = 'compile_commit'
      AND runtime_sha ~ '^[0-9a-f]{40}$'
      AND authoring_sha ~ '^[0-9a-f]{40}$'
    )
  )
);

CREATE INDEX IF NOT EXISTS runtime_projection_activations_projection_id_idx
  ON atlas_v2.runtime_projection_activations(projection_name, id DESC);

CREATE INDEX IF NOT EXISTS runtime_projection_activations_compile_idx
  ON atlas_v2.runtime_projection_activations(compile_key, id DESC);

COMMIT;
