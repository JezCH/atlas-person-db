BEGIN;
SELECT pg_advisory_xact_lock(hashtext('atlas-authoring:reviewed-candidate-boundary:v1'));
SET LOCAL lock_timeout='10s';

CREATE TABLE IF NOT EXISTS atlas_v2.person_candidate_review_revisions (
  candidate_id text NOT NULL,
  revision integer NOT NULL,
  review_state text NOT NULL,
  review_checkpoint text NOT NULL,
  reviewed_payload jsonb NOT NULL,
  payload_hash text NOT NULL,
  human_authorized boolean NOT NULL DEFAULT false,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(candidate_id,revision),
  CONSTRAINT person_candidate_review_state_ck CHECK(review_state IN ('PENDING','IN_REVIEW','APPROVED','HOLD','REJECTED','DUPLICATE_EXISTING')),
  CONSTRAINT person_candidate_review_human_approval_ck CHECK(review_state <> 'APPROVED' OR human_authorized = true)
);
CREATE UNIQUE INDEX IF NOT EXISTS person_candidate_review_payload_hash_uq
  ON atlas_v2.person_candidate_review_revisions(candidate_id,payload_hash);

CREATE TABLE IF NOT EXISTS atlas_v2.person_candidate_registration_states (
  candidate_id text PRIMARY KEY,
  review_revision integer NOT NULL,
  registration_state text NOT NULL,
  person_id uuid REFERENCES atlas_v2.persons(id) ON DELETE RESTRICT,
  authoring_request_id text,
  result_snapshot jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT person_candidate_registration_state_ck CHECK(registration_state IN ('NOT_READY','QUEUED','APPLYING','REGISTERED','VERIFIED_AUTHORING_ONLY','BLOCKED','NOT_APPLICABLE')),
  FOREIGN KEY(candidate_id,review_revision) REFERENCES atlas_v2.person_candidate_review_revisions(candidate_id,revision) ON DELETE RESTRICT
);
COMMIT;
