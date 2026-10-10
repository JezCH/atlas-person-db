-- Extend the durable Batch017 archive catalog to the complete validated artifact.
-- Original videos/manifests remain distinguishable; auxiliary metadata is
-- cataloged only so a remote-only restore can reconstruct all 6,044 members.
BEGIN;

DO $atlas$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conrelid='atlas_v2.youtube_source_archives'::regclass
       AND conname='youtube_source_archives_source_kind_complete_ck'
  ) THEN
    ALTER TABLE atlas_v2.youtube_source_archives
      DROP CONSTRAINT IF EXISTS youtube_source_archives_source_kind_check;
    ALTER TABLE atlas_v2.youtube_source_archives
      DROP CONSTRAINT IF EXISTS youtube_source_archives_source_kind_ck;
    ALTER TABLE atlas_v2.youtube_source_archives
      DROP CONSTRAINT IF EXISTS youtube_source_archives_kind_ck;

    ALTER TABLE atlas_v2.youtube_source_archives
      ADD CONSTRAINT youtube_source_archives_source_kind_complete_ck
      CHECK (source_kind IN ('manifest', 'channel_videos', 'metadata'));

    ALTER TABLE atlas_v2.youtube_source_archives
      ADD CONSTRAINT youtube_source_archives_kind_complete_ck
      CHECK (
        (source_kind='channel_videos' AND channel_id IS NOT NULL) OR
        (source_kind IN ('manifest','metadata') AND channel_id IS NULL)
      );
  END IF;
END
$atlas$;

COMMENT ON TABLE atlas_v2.youtube_source_archives IS
  'Verified immutable members of the validated YouTube source artifact in private Supabase Storage. channel_videos and manifest are canonical source members; metadata rows are retained only for exact remote reconstruction of the validated artifact.';

COMMIT;
