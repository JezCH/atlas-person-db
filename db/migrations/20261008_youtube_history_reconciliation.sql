BEGIN;
SELECT pg_advisory_xact_lock(hashtext('atlas-youtube:history-reconciliation:v1'));
SET LOCAL lock_timeout='10s';

ALTER TABLE atlas_v2.youtube_person_signal_snapshots
  ADD COLUMN IF NOT EXISTS snapshot_scope text;

UPDATE atlas_v2.youtube_person_signal_snapshots
SET snapshot_scope = CASE snapshot_id
  WHEN 'yt-20261007T031934Z-2319ch' THEN 'global_checkpoint'
  WHEN 'yt-20261007T050219Z-2715ch' THEN 'global_baseline'
  WHEN 'yt-20261007T224614Z-2128ch-rebuild-v2' THEN 'segment_supplement'
  ELSE COALESCE(snapshot_scope,'legacy_unspecified')
END
WHERE snapshot_scope IS NULL
   OR snapshot_id IN (
     'yt-20261007T031934Z-2319ch',
     'yt-20261007T050219Z-2715ch',
     'yt-20261007T224614Z-2128ch-rebuild-v2'
   );

ALTER TABLE atlas_v2.youtube_person_signal_snapshots
  ALTER COLUMN snapshot_scope SET DEFAULT 'global_reconciled',
  ALTER COLUMN snapshot_scope SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='youtube_person_signal_snapshots_scope_ck'
      AND conrelid='atlas_v2.youtube_person_signal_snapshots'::regclass
  ) THEN
    ALTER TABLE atlas_v2.youtube_person_signal_snapshots
      ADD CONSTRAINT youtube_person_signal_snapshots_scope_ck
      CHECK (snapshot_scope IN (
        'global_checkpoint',
        'global_baseline',
        'segment_supplement',
        'global_reconciled',
        'legacy_unspecified'
      ));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS atlas_v2.youtube_discovery_run_ledger (
  run_key text PRIMARY KEY,
  sequence_no integer NOT NULL UNIQUE,
  phase text NOT NULL,
  metric_scope text NOT NULL,
  exact_metrics boolean NOT NULL DEFAULT true,
  selected_channel_count integer,
  success_channel_count integer,
  error_channel_count integer,
  empty_channel_count integer,
  video_count bigint,
  cumulative_channel_count integer,
  cumulative_video_count bigint,
  source_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT youtube_discovery_run_ledger_key_ck CHECK (btrim(run_key) <> ''),
  CONSTRAINT youtube_discovery_run_ledger_phase_ck CHECK (phase IN ('ephemeral_preflight','canonical_baseline','post_baseline_segment')),
  CONSTRAINT youtube_discovery_run_ledger_scope_ck CHECK (metric_scope IN ('discarded_ephemeral','global_unique','segment_unique')),
  CONSTRAINT youtube_discovery_run_ledger_nonnegative_ck CHECK (
    COALESCE(selected_channel_count,0) >= 0
    AND COALESCE(success_channel_count,0) >= 0
    AND COALESCE(error_channel_count,0) >= 0
    AND COALESCE(empty_channel_count,0) >= 0
    AND COALESCE(video_count,0) >= 0
    AND COALESCE(cumulative_channel_count,0) >= 0
    AND COALESCE(cumulative_video_count,0) >= 0
  )
);

COMMENT ON TABLE atlas_v2.youtube_discovery_run_ledger IS
  'Canonical reconstruction of every YouTube discovery work unit from the initial discarded exploratory crawl through the current batch frontier.';
COMMENT ON COLUMN atlas_v2.youtube_person_signal_snapshots.snapshot_scope IS
  'Historical scope marker retained for compatible replay; current publications use one Channel-ID based global_reconciled corpus.';

COMMIT;
