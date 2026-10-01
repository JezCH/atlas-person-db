BEGIN;
SELECT pg_advisory_xact_lock(hashtext('atlas-authoring:spatial-registration-dispositions:v1'));
SET LOCAL lock_timeout='10s';

CREATE TABLE IF NOT EXISTS atlas_v2.spatial_registration_dispositions (
  polity_id uuid PRIMARY KEY REFERENCES atlas_v2.polities(id) ON DELETE RESTRICT,
  state text NOT NULL,
  evidence text NOT NULL,
  authoring_request_id text NOT NULL UNIQUE,
  materialized_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT spatial_registration_disposition_state_ck
    CHECK(state IN ('existing_disposition','reviewed_static','reviewed_place_function','reviewed_hold')),
  CONSTRAINT spatial_registration_disposition_evidence_ck
    CHECK(length(btrim(evidence)) > 0)
);

COMMIT;
