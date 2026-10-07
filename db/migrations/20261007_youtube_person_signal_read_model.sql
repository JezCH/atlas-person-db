BEGIN;
SELECT pg_advisory_xact_lock(hashtext('atlas-authoring:youtube-person-signal-read-model:v1'));
SET LOCAL lock_timeout='10s';

CREATE TABLE IF NOT EXISTS atlas_v2.youtube_person_signal_snapshots (
  snapshot_id text PRIMARY KEY,
  generated_at timestamptz NOT NULL,
  channel_count integer NOT NULL,
  video_count bigint NOT NULL,
  threshold_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  parser_version text NOT NULL,
  source_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT youtube_person_signal_snapshots_snapshot_id_ck CHECK (btrim(snapshot_id) <> ''),
  CONSTRAINT youtube_person_signal_snapshots_channel_count_ck CHECK (channel_count >= 0),
  CONSTRAINT youtube_person_signal_snapshots_video_count_ck CHECK (video_count >= 0),
  CONSTRAINT youtube_person_signal_snapshots_threshold_counts_ck CHECK (jsonb_typeof(threshold_counts) = 'object'),
  CONSTRAINT youtube_person_signal_snapshots_parser_version_ck CHECK (btrim(parser_version) <> ''),
  CONSTRAINT youtube_person_signal_snapshots_source_state_ck CHECK (jsonb_typeof(source_state) = 'object')
);

CREATE TABLE IF NOT EXISTS atlas_v2.youtube_person_signals (
  snapshot_id text NOT NULL REFERENCES atlas_v2.youtube_person_signal_snapshots(snapshot_id) ON DELETE RESTRICT,
  raw_name text NOT NULL,
  rank integer NOT NULL,
  distinct_channel_count integer NOT NULL,
  video_count integer NOT NULL,
  PRIMARY KEY (snapshot_id, raw_name),
  CONSTRAINT youtube_person_signals_rank_uq UNIQUE (snapshot_id, rank),
  CONSTRAINT youtube_person_signals_raw_name_ck CHECK (btrim(raw_name) <> ''),
  CONSTRAINT youtube_person_signals_rank_ck CHECK (rank > 0),
  CONSTRAINT youtube_person_signals_channel_count_ck CHECK (distinct_channel_count > 0),
  CONSTRAINT youtube_person_signals_video_count_ck CHECK (video_count > 0)
);

CREATE INDEX IF NOT EXISTS youtube_person_signal_snapshots_generated_idx
  ON atlas_v2.youtube_person_signal_snapshots(generated_at DESC, snapshot_id DESC);

CREATE INDEX IF NOT EXISTS youtube_person_signals_channel_rank_idx
  ON atlas_v2.youtube_person_signals(snapshot_id, distinct_channel_count DESC, rank);

COMMENT ON TABLE atlas_v2.youtube_person_signal_snapshots IS
  'Append-only snapshots of the external YouTube discovery population used to rank repeated raw person-name signals.';
COMMENT ON TABLE atlas_v2.youtube_person_signals IS
  'Derived YouTube discovery signals only. Raw names are not canonical Person identities and rows are not historical evidence or registration approval.';

COMMIT;
