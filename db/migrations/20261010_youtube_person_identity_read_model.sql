-- Append-only Person UUID ranking read model; legacy raw-name snapshots stay intact.
BEGIN;
SELECT pg_advisory_xact_lock(hashtext('atlas-youtube:person-identity-read-model:v1'));
SET LOCAL lock_timeout='10s';

CREATE TABLE IF NOT EXISTS atlas_v2.youtube_person_identity_snapshots (
  identity_snapshot_id text PRIMARY KEY,
  source_snapshot_id text NOT NULL REFERENCES atlas_v2.youtube_person_signal_snapshots(snapshot_id) ON DELETE RESTRICT,
  artifact_id bigint NOT NULL,
  artifact_digest text NOT NULL,
  source_run_id bigint NOT NULL,
  extraction_policy text NOT NULL,
  matched_video_rows bigint NOT NULL,
  person_count integer NOT NULL,
  publication_fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT youtube_person_identity_snapshot_id_ck CHECK (btrim(identity_snapshot_id) <> ''),
  CONSTRAINT youtube_person_identity_artifact_id_ck CHECK (artifact_id > 0),
  CONSTRAINT youtube_person_identity_source_run_id_ck CHECK (source_run_id > 0),
  CONSTRAINT youtube_person_identity_digest_ck CHECK (artifact_digest ~ '^sha256:[0-9a-f]{64}$'),
  CONSTRAINT youtube_person_identity_fingerprint_ck CHECK (publication_fingerprint ~ '^[0-9a-f]{64}$'),
  CONSTRAINT youtube_person_identity_policy_ck CHECK (btrim(extraction_policy) <> ''),
  CONSTRAINT youtube_person_identity_counts_ck CHECK (matched_video_rows >= 0 AND person_count > 0),
  CONSTRAINT youtube_person_identity_source_policy_uq UNIQUE (source_snapshot_id, extraction_policy)
);

CREATE TABLE IF NOT EXISTS atlas_v2.youtube_person_identity_signals (
  identity_snapshot_id text NOT NULL
    REFERENCES atlas_v2.youtube_person_identity_snapshots(identity_snapshot_id) ON DELETE RESTRICT,
  person_id uuid NOT NULL,
  display_name_basis text NOT NULL,
  rank integer NOT NULL,
  distinct_channel_count integer NOT NULL,
  distinct_video_count integer NOT NULL,
  matched_variants jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_rows_by_type jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (identity_snapshot_id, person_id),
  CONSTRAINT youtube_person_identity_signals_rank_uq UNIQUE (identity_snapshot_id, rank),
  CONSTRAINT youtube_person_identity_signals_name_ck CHECK (btrim(display_name_basis) <> ''),
  CONSTRAINT youtube_person_identity_signals_count_ck CHECK (
    rank > 0 AND distinct_channel_count > 0 AND distinct_video_count > 0
  ),
  CONSTRAINT youtube_person_identity_signals_variants_ck CHECK (jsonb_typeof(matched_variants) = 'array'),
  CONSTRAINT youtube_person_identity_signals_evidence_ck CHECK (jsonb_typeof(evidence_rows_by_type) = 'object')
);

CREATE INDEX IF NOT EXISTS youtube_person_identity_signals_channel_rank_idx
  ON atlas_v2.youtube_person_identity_signals(identity_snapshot_id, distinct_channel_count DESC, rank);

CREATE INDEX IF NOT EXISTS youtube_person_identity_snapshots_source_idx
  ON atlas_v2.youtube_person_identity_snapshots(source_snapshot_id, created_at DESC);

COMMENT ON TABLE atlas_v2.youtube_person_identity_snapshots IS
  'Append-only verified UUID aggregation over a specific raw global YouTube snapshot; never replaces raw-name ranking.';
COMMENT ON TABLE atlas_v2.youtube_person_identity_signals IS
  'Derived title mentions per reviewed Person UUID, with distinct original Channel/Video ID unions; mentions are not biography or registration approval evidence.';
COMMIT;
