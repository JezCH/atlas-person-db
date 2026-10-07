BEGIN;
SELECT pg_advisory_xact_lock(hashtext('atlas-youtube:discovery-channel-registry:v2'));
SET LOCAL lock_timeout='10s';

ALTER TABLE atlas_v2.youtube_person_signal_snapshots
  ADD COLUMN IF NOT EXISTS publication_fingerprint text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='youtube_person_signal_snapshots_publication_fingerprint_ck'
      AND conrelid='atlas_v2.youtube_person_signal_snapshots'::regclass
  ) THEN
    ALTER TABLE atlas_v2.youtube_person_signal_snapshots
      ADD CONSTRAINT youtube_person_signal_snapshots_publication_fingerprint_ck
      CHECK (publication_fingerprint IS NULL OR publication_fingerprint ~ '^[0-9a-f]{64}$');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS atlas_v2.youtube_discovery_channels (
  channel_id text PRIMARY KEY,
  first_seen_batch text NOT NULL,
  first_seen_at timestamptz NOT NULL,
  last_seen_batch text NOT NULL,
  last_seen_at timestamptz NOT NULL,
  latest_channel_name text NOT NULL DEFAULT '',
  latest_scan_status text NOT NULL,
  latest_video_count integer NOT NULL DEFAULT 0,
  last_snapshot_id text NOT NULL REFERENCES atlas_v2.youtube_person_signal_snapshots(snapshot_id) ON DELETE RESTRICT,
  source_artifact_id bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT youtube_discovery_channels_channel_id_ck CHECK (btrim(channel_id) <> ''),
  CONSTRAINT youtube_discovery_channels_batch_ck CHECK (btrim(first_seen_batch) <> '' AND btrim(last_seen_batch) <> ''),
  CONSTRAINT youtube_discovery_channels_scan_status_ck CHECK (latest_scan_status IN ('OK','ERR','EMPTY')),
  CONSTRAINT youtube_discovery_channels_video_count_ck CHECK (latest_video_count >= 0)
);

CREATE INDEX IF NOT EXISTS youtube_discovery_channels_snapshot_idx
  ON atlas_v2.youtube_discovery_channels(last_snapshot_id);
CREATE INDEX IF NOT EXISTS youtube_discovery_channels_batch_status_idx
  ON atlas_v2.youtube_discovery_channels(last_seen_batch, latest_scan_status);

COMMENT ON TABLE atlas_v2.youtube_discovery_channels IS
  'Persistent YouTube Channel-ID registry for reconstructable discovery corpora. This prevents later batches from relying on untraceable aggregate channel counts.';
COMMENT ON COLUMN atlas_v2.youtube_person_signal_snapshots.publication_fingerprint IS
  'SHA-256 fingerprint of the exact publication payload; used for idempotent snapshot publication.';

COMMIT;
