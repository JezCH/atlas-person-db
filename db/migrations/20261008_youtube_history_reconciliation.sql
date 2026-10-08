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
  ALTER COLUMN snapshot_scope SET DEFAULT 'segment_supplement',
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

INSERT INTO atlas_v2.youtube_discovery_run_ledger(
  run_key,sequence_no,phase,metric_scope,exact_metrics,
  selected_channel_count,success_channel_count,error_channel_count,empty_channel_count,
  video_count,cumulative_channel_count,cumulative_video_count,source_state,notes
) VALUES
('prelude-ephemeral',0,'ephemeral_preflight','discarded_ephemeral',false,
 NULL,NULL,NULL,NULL,NULL,NULL,NULL,
 '{"reported_channels":"~550","reported_videos":"~359000","persistence":"ephemeral_sandboxes"}'::jsonb,
 'Initial exploratory crawl. Raw registry was not durably preserved and this run is excluded from canonical totals.'),
('batch001',1,'canonical_baseline','global_unique',true,
 300,294,6,0,192784,294,192784,
 '{"persistence":"channels.ndjson+videos/+state.json","next_batch":"batch002"}'::jsonb,
 'First durable persistent-workspace baseline.'),
('batch002',2,'canonical_baseline','global_unique',true,
 NULL,120,NULL,NULL,86297,414,279081,'{}'::jsonb,NULL),
('batch003',3,'canonical_baseline','global_unique',true,
 NULL,120,NULL,NULL,80298,534,359379,'{}'::jsonb,NULL),
('batch004b',4,'canonical_baseline','global_unique',true,
 500,496,NULL,NULL,213308,1030,572687,
 '{"operation":"500-channel expansion"}'::jsonb,
 'Completed-file registry merge; this is the expansion that moved 534 to 1,030 channels.'),
('batch004',5,'canonical_baseline','global_unique',true,
 NULL,426,NULL,NULL,101383,1456,674070,'{}'::jsonb,NULL),
('batch005',6,'canonical_baseline','global_unique',true,
 NULL,419,NULL,NULL,42179,1875,716249,'{}'::jsonb,NULL),
('batch006',7,'canonical_baseline','global_unique',true,
 NULL,444,NULL,NULL,51457,2319,767706,
 '{"snapshot_id":"yt-20261007T031934Z-2319ch"}'::jsonb,NULL),
('batch007',8,'canonical_baseline','global_unique',true,
 NULL,396,NULL,NULL,50889,2715,818595,
 '{"snapshot_id":"yt-20261007T050219Z-2715ch","next_batch":"batch008"}'::jsonb,
 'Last exact global cumulative corpus before staging switched to a separate artifact workflow.'),
('batch008',9,'post_baseline_segment','segment_unique',true,
 620,466,154,0,144022,466,144022,
 '{"artifact_run_id":37575099033,"baseline_denylist_applied":false}'::jsonb,
 'No batch001-007 Channel-ID denylist was applied; unique only inside the post-baseline segment.'),
('batch009',10,'post_baseline_segment','segment_unique',true,
 650,503,147,0,88863,969,232885,
 '{"artifact_run_id":37587287988,"prior_segment_excluded":["batch008"]}'::jsonb,NULL),
('batch010',11,'post_baseline_segment','segment_unique',true,
 650,602,48,0,132402,1571,365287,
 '{"artifact_run_id":37599569031,"artifact_id":11472885719,"prior_segment_excluded":["batch008","batch009"]}'::jsonb,NULL),
('batch011',12,'post_baseline_segment','segment_unique',true,
 650,557,93,0,79059,2128,444346,
 '{"artifact_run_id":37604763364,"artifact_id":11474777563,"prior_segment_excluded":["batch008","batch009","batch010"]}'::jsonb,
 'Rolling artifact contains batch008 through batch011. Cross-overlap with batch001-007 cannot be proven because the old Channel-ID registry was not durably retained.')
ON CONFLICT(run_key) DO UPDATE SET
  sequence_no=EXCLUDED.sequence_no,
  phase=EXCLUDED.phase,
  metric_scope=EXCLUDED.metric_scope,
  exact_metrics=EXCLUDED.exact_metrics,
  selected_channel_count=EXCLUDED.selected_channel_count,
  success_channel_count=EXCLUDED.success_channel_count,
  error_channel_count=EXCLUDED.error_channel_count,
  empty_channel_count=EXCLUDED.empty_channel_count,
  video_count=EXCLUDED.video_count,
  cumulative_channel_count=EXCLUDED.cumulative_channel_count,
  cumulative_video_count=EXCLUDED.cumulative_video_count,
  source_state=EXCLUDED.source_state,
  notes=EXCLUDED.notes;

INSERT INTO atlas_v2.youtube_discovery_progress_state(
  state_key,baseline_snapshot_id,supplemental_snapshot_id,
  baseline_unique_channel_count,baseline_video_count,
  supplemental_selected_channel_count,supplemental_success_channel_count,supplemental_video_count,
  gross_success_channel_rows,gross_video_rows,
  unique_channel_lower_bound,unique_channel_upper_bound,exact_unique_channel_count,
  reconciliation_status,next_batch,live_ingestion_enabled,updated_at
) VALUES (
  'current',
  'yt-20261007T050219Z-2715ch',
  'yt-20261007T224614Z-2128ch-rebuild-v2',
  2715,818595,
  2570,2128,444346,
  4843,1262941,
  2715,4843,NULL,
  'baseline_channel_ids_missing','batch012',false,now()
)
ON CONFLICT(state_key) DO UPDATE SET
  baseline_snapshot_id=EXCLUDED.baseline_snapshot_id,
  supplemental_snapshot_id=EXCLUDED.supplemental_snapshot_id,
  baseline_unique_channel_count=EXCLUDED.baseline_unique_channel_count,
  baseline_video_count=EXCLUDED.baseline_video_count,
  supplemental_selected_channel_count=EXCLUDED.supplemental_selected_channel_count,
  supplemental_success_channel_count=EXCLUDED.supplemental_success_channel_count,
  supplemental_video_count=EXCLUDED.supplemental_video_count,
  gross_success_channel_rows=EXCLUDED.gross_success_channel_rows,
  gross_video_rows=EXCLUDED.gross_video_rows,
  unique_channel_lower_bound=EXCLUDED.unique_channel_lower_bound,
  unique_channel_upper_bound=EXCLUDED.unique_channel_upper_bound,
  exact_unique_channel_count=EXCLUDED.exact_unique_channel_count,
  reconciliation_status=EXCLUDED.reconciliation_status,
  next_batch=EXCLUDED.next_batch,
  live_ingestion_enabled=EXCLUDED.live_ingestion_enabled,
  updated_at=now();

COMMENT ON TABLE atlas_v2.youtube_discovery_run_ledger IS
  'Canonical reconstruction of every YouTube discovery work unit from the initial discarded exploratory crawl through the current batch frontier.';
COMMENT ON TABLE atlas_v2.youtube_discovery_progress_state IS
  'Current YouTube discovery progress. Separates the exact batch001-007 global baseline from the internally deduplicated batch008+ supplemental segment until cross-segment Channel-ID reconciliation is possible.';
COMMENT ON COLUMN atlas_v2.youtube_person_signal_snapshots.snapshot_scope IS
  'Whether a signal snapshot represents an exact global corpus checkpoint/baseline or only a supplemental ID-preserved segment.';

COMMIT;
