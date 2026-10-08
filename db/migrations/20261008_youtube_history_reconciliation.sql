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

CREATE TABLE IF NOT EXISTS atlas_v2.youtube_discovery_progress_state (
  state_key text PRIMARY KEY,
  baseline_snapshot_id text NOT NULL REFERENCES atlas_v2.youtube_person_signal_snapshots(snapshot_id) ON DELETE RESTRICT,
  supplemental_snapshot_id text REFERENCES atlas_v2.youtube_person_signal_snapshots(snapshot_id) ON DELETE RESTRICT,
  baseline_unique_channel_count integer NOT NULL,
  baseline_video_count bigint NOT NULL,
  supplemental_selected_channel_count integer NOT NULL,
  supplemental_success_channel_count integer NOT NULL,
  supplemental_video_count bigint NOT NULL,
  gross_success_channel_rows integer NOT NULL,
  gross_video_rows bigint NOT NULL,
  unique_channel_lower_bound integer NOT NULL,
  unique_channel_upper_bound integer NOT NULL,
  exact_unique_channel_count integer,
  reconciliation_status text NOT NULL,
  next_batch text NOT NULL,
  live_ingestion_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT youtube_discovery_progress_state_key_ck CHECK (state_key='current'),
  CONSTRAINT youtube_discovery_progress_state_bounds_ck CHECK (
    baseline_unique_channel_count >= 0
    AND supplemental_selected_channel_count >= 0
    AND supplemental_success_channel_count >= 0
    AND gross_success_channel_rows >= 0
    AND unique_channel_lower_bound >= 0
    AND unique_channel_upper_bound >= unique_channel_lower_bound
    AND (exact_unique_channel_count IS NULL OR exact_unique_channel_count BETWEEN unique_channel_lower_bound AND unique_channel_upper_bound)
  ),
  CONSTRAINT youtube_discovery_progress_state_status_ck CHECK (
    reconciliation_status IN ('baseline_channel_ids_missing','reconciled_exact')
  )
);

COMMENT ON TABLE atlas_v2.youtube_discovery_run_ledger IS
  'Canonical reconstruction of every YouTube discovery work unit from the initial discarded exploratory crawl through the current batch frontier.';
COMMENT ON TABLE atlas_v2.youtube_discovery_progress_state IS
  'Current YouTube discovery progress. Separates the exact batch001-007 global baseline from the internally deduplicated batch008+ supplemental segment until cross-segment Channel-ID reconciliation is possible.';
COMMENT ON COLUMN atlas_v2.youtube_person_signal_snapshots.snapshot_scope IS
  'Whether a signal snapshot represents an exact global corpus checkpoint/baseline or only a supplemental ID-preserved segment.';

COMMIT;
