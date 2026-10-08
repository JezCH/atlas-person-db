-- Durable YouTube source storage and immutable checksum catalog.
-- No existing snapshots/channels/signals are changed or backfilled.
BEGIN;

-- Local CI rebuilds vanilla PostgreSQL without Supabase Storage installed.
-- On Production Supabase, provision the bucket without weakening RLS.
DO $atlas$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    EXECUTE 'INSERT INTO storage.buckets (id, name, public)
      VALUES (''atlas-youtube-source'', ''atlas-youtube-source'', false)
      ON CONFLICT (id) DO NOTHING';
  END IF;
END
$atlas$;

CREATE TABLE IF NOT EXISTS atlas_v2.youtube_source_archives (
  object_key text PRIMARY KEY,
  sha256 text NOT NULL,
  byte_count bigint NOT NULL CHECK (byte_count > 0),
  source_artifact_id bigint,
  batch_label text NOT NULL,
  source_kind text NOT NULL CHECK (source_kind IN ('manifest', 'channel_videos')),
  channel_id text,
  video_rows integer CHECK (video_rows IS NULL OR video_rows >= 0),
  verified_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT youtube_source_archives_digest_ck CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  CONSTRAINT youtube_source_archives_object_key_ck CHECK (length(trim(object_key)) > 0),
  CONSTRAINT youtube_source_archives_kind_ck CHECK (
    (source_kind='manifest' AND channel_id IS NULL) OR
    (source_kind='channel_videos' AND channel_id IS NOT NULL)
  )
);

COMMENT ON TABLE atlas_v2.youtube_source_archives IS
  'Verified immutable YouTube original-source objects in private Supabase Storage. An archive row may only be inserted after uploading and independently verifying bytes and SHA256; this table is not a claim that source objects have been migrated.';

-- No public Data API exposure. Only an authorized backend archive writer may
-- insert after validating the object against its digest.
REVOKE ALL ON atlas_v2.youtube_source_archives FROM PUBLIC, anon, authenticated;

COMMIT;
