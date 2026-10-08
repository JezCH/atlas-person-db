BEGIN;
SELECT pg_advisory_xact_lock(hashtext('atlas-youtube:person-signal-publish:v2'));
SET LOCAL lock_timeout='10s';

-- This retirement is safe only if the ID-preserved batch008+ corpus exists.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM atlas_v2.youtube_person_signal_snapshots WHERE snapshot_scope IN ('global_baseline','global_checkpoint'))
     AND NOT EXISTS (
       SELECT 1 FROM atlas_v2.youtube_person_signal_snapshots s
       WHERE s.snapshot_id='yt-20261007T224614Z-2128ch-rebuild-v2'
         AND s.channel_count=2128
         AND (SELECT count(*) FROM atlas_v2.youtube_discovery_channels) >= 2570
     ) THEN
    RAISE EXCEPTION 'YOUTUBE_LEGACY_RETIREMENT_REQUIRES_PRESERVED_BATCH008_011';
  END IF;
END $$;

DELETE FROM atlas_v2.youtube_discovery_progress_state
WHERE state_key='current';

-- The surviving channel-ID corpus is the canonical global corpus, not a
-- supplement to an unrecoverable collection.
UPDATE atlas_v2.youtube_person_signal_snapshots
SET snapshot_scope='global_reconciled',
    source_state=source_state
      - 'legacy_baseline_snapshot_id'
      - 'legacy_baseline_channel_count'
      - 'legacy_overlap_status'
WHERE snapshot_scope='segment_supplement';

DELETE FROM atlas_v2.youtube_person_signals
WHERE snapshot_id IN (
  SELECT snapshot_id FROM atlas_v2.youtube_person_signal_snapshots
  WHERE snapshot_scope IN ('global_baseline','global_checkpoint')
);
DELETE FROM atlas_v2.youtube_person_signal_snapshots
WHERE snapshot_scope IN ('global_baseline','global_checkpoint');

-- Batch records 001–007 are retired. Retain batch008+ provenance only.
DELETE FROM atlas_v2.youtube_discovery_run_ledger
WHERE run_key IN ('prelude-ephemeral','batch001','batch002','batch003',
                  'batch004b','batch004','batch005','batch006','batch007');
UPDATE atlas_v2.youtube_discovery_run_ledger
SET phase='canonical_baseline',
    metric_scope='global_unique',
    sequence_no=sequence_no-8
WHERE phase='post_baseline_segment';

ALTER TABLE atlas_v2.youtube_person_signal_snapshots
  ALTER COLUMN snapshot_scope SET DEFAULT 'global_reconciled';

COMMIT;
