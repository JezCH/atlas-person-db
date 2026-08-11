BEGIN;

CREATE TABLE IF NOT EXISTS atlas_v2.authoring_manifest_runs (
  request_id text PRIMARY KEY,
  manifest_hash text NOT NULL,
  person_id uuid REFERENCES atlas_v2.persons(id) ON DELETE RESTRICT,
  relationship_id uuid REFERENCES atlas_v2.person_politics_v2(id) ON DELETE RESTRICT,
  applied_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
