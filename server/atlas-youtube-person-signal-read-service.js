"use strict";

const YOUTUBE_PERSON_SIGNAL_SCHEMA = "atlas-youtube-person-signals/v2";

const GLOBAL_SNAPSHOT_SQL = `
select
  snapshot_id,
  generated_at,
  channel_count,
  video_count,
  threshold_counts,
  parser_version,
  source_state,
  snapshot_scope
from atlas_v2.youtube_person_signal_snapshots
where snapshot_scope in ('global_reconciled','global_baseline')
order by
  case snapshot_scope when 'global_reconciled' then 0 else 1 end,
  generated_at desc,
  snapshot_id desc
limit 1
`;

const LEGACY_LATEST_SNAPSHOT_SQL = `
select
  snapshot_id,
  generated_at,
  channel_count,
  video_count,
  threshold_counts,
  parser_version,
  source_state
from atlas_v2.youtube_person_signal_snapshots
order by generated_at desc, snapshot_id desc
limit 1
`;

const SEGMENT_SNAPSHOT_SQL = `
select
  snapshot_id,
  generated_at,
  channel_count,
  video_count,
  threshold_counts,
  parser_version,
  source_state,
  snapshot_scope
from atlas_v2.youtube_person_signal_snapshots
where snapshot_scope='segment_supplement'
order by generated_at desc, snapshot_id desc
limit 1
`;

const PROGRESS_SQL = `
select
  state_key,
  baseline_snapshot_id,
  supplemental_snapshot_id,
  baseline_unique_channel_count,
  baseline_video_count,
  supplemental_selected_channel_count,
  supplemental_success_channel_count,
  supplemental_video_count,
  gross_success_channel_rows,
  gross_video_rows,
  unique_channel_lower_bound,
  unique_channel_upper_bound,
  exact_unique_channel_count,
  reconciliation_status,
  next_batch,
  live_ingestion_enabled,
  updated_at
from atlas_v2.youtube_discovery_progress_state
where state_key='current'
limit 1
`;

const SIGNAL_COUNT_SQL = `
select count(*)::int as count
from atlas_v2.youtube_person_signals
where snapshot_id=$1
  and distinct_channel_count >= $2
`;

const SIGNAL_ROWS_SQL = `
select
  raw_name,
  rank,
  distinct_channel_count,
  video_count
from atlas_v2.youtube_person_signals
where snapshot_id=$1
  and distinct_channel_count >= $2
order by rank
limit $3
`;

function integerOption(value, fallback, { min, max }) {
  if (value == null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    const error = new Error("INVALID_YOUTUBE_PERSON_SIGNAL_QUERY");
    error.code = "INVALID_YOUTUBE_PERSON_SIGNAL_QUERY";
    throw error;
  }
  return parsed;
}

function normalizeThresholdCounts(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return Object.freeze({});
  const output = {};
  for (const [key,count] of Object.entries(value)) {
    const numeric = Number(count);
    if (Number.isInteger(numeric) && numeric >= 0) output[String(key)] = numeric;
  }
  return Object.freeze(output);
}

function projectSnapshot(row) {
  if (!row) return null;
  return Object.freeze({
    snapshot_id:String(row.snapshot_id),
    generated_at:String(row.generated_at),
    channel_count:Number(row.channel_count || 0),
    video_count:Number(row.video_count || 0),
    threshold_counts:normalizeThresholdCounts(row.threshold_counts),
    parser_version:String(row.parser_version || ""),
    snapshot_scope:String(row.snapshot_scope || "legacy_unspecified"),
    source_state:Object.freeze(
      row.source_state && typeof row.source_state === "object" && !Array.isArray(row.source_state)
        ? { ...row.source_state }
        : {}
    )
  });
}

function projectProgress(row) {
  if (!row) return null;
  return Object.freeze({
    baseline_snapshot_id:String(row.baseline_snapshot_id || ""),
    supplemental_snapshot_id:row.supplemental_snapshot_id == null ? null : String(row.supplemental_snapshot_id),
    baseline_unique_channel_count:Number(row.baseline_unique_channel_count || 0),
    baseline_video_count:Number(row.baseline_video_count || 0),
    supplemental_selected_channel_count:Number(row.supplemental_selected_channel_count || 0),
    supplemental_success_channel_count:Number(row.supplemental_success_channel_count || 0),
    supplemental_video_count:Number(row.supplemental_video_count || 0),
    gross_success_channel_rows:Number(row.gross_success_channel_rows || 0),
    gross_video_rows:Number(row.gross_video_rows || 0),
    unique_channel_lower_bound:Number(row.unique_channel_lower_bound || 0),
    unique_channel_upper_bound:Number(row.unique_channel_upper_bound || 0),
    exact_unique_channel_count:row.exact_unique_channel_count == null ? null : Number(row.exact_unique_channel_count),
    reconciliation_status:String(row.reconciliation_status || ""),
    next_batch:String(row.next_batch || ""),
    live_ingestion_enabled:Boolean(row.live_ingestion_enabled),
    updated_at:String(row.updated_at || "")
  });
}

function projectSignal(row) {
  return Object.freeze({
    raw_name:String(row.raw_name || ""),
    rank:Number(row.rank),
    distinct_channel_count:Number(row.distinct_channel_count),
    video_count:Number(row.video_count)
  });
}

// The legacy baseline has no preserved channel IDs. Consequently cross-snapshot
// union sizes are bounded, never an exact sum. Normalize only casing/spacing;
// transliterations and other potentially different people remain separate.
function mergeBoundedSignals(baselineRows,segmentRows,minChannels,limit) {
  const signals=new Map();
  for (const [scope,rows] of [["baseline",baselineRows],["supplemental",segmentRows]]) {
    for (const row of rows) {
      const name=String(row.raw_name || "").normalize("NFKC").trim().replace(/\s+/g," ");
      if (!name) continue;
      const key=name.toLowerCase();
      const channels=Number(row.distinct_channel_count || 0);
      const videos=Number(row.video_count || 0);
      if (!signals.has(key)) signals.set(key,{
        raw_name:name,display_channels:-1,
        baseline_channel_count:0,baseline_channel_upper_bound:0,
        supplemental_channel_count:0,supplemental_channel_upper_bound:0,
        video_count:0
      });
      const item=signals.get(key);
      if (channels > item.display_channels) {
        item.raw_name=name;
        item.display_channels=channels;
      }
      item[`${scope}_channel_count`]=Math.max(item[`${scope}_channel_count`],channels);
      item[`${scope}_channel_upper_bound`]+=channels;
      item.video_count+=videos;
    }
  }
  const ordered=[...signals.values()].map(({display_channels,...item})=>({
    ...item,
    distinct_channel_count:Math.max(item.baseline_channel_count,item.supplemental_channel_count),
    channel_count_upper_bound:item.baseline_channel_upper_bound+item.supplemental_channel_upper_bound
  })).sort((a,b)=>
    b.distinct_channel_count-a.distinct_channel_count ||
    b.channel_count_upper_bound-a.channel_count_upper_bound ||
    b.video_count-a.video_count ||
    a.raw_name.localeCompare(b.raw_name)
  );
  const qualified=ordered.filter(row=>row.distinct_channel_count>=minChannels);
  return {
    stored_count:qualified.length,
    rows:Object.freeze(qualified.slice(0,limit).map((row,index)=>Object.freeze({rank:index+1,...row})))
  };
}

async function optionalQuery(client, sql, params = []) {
  try {
    return await client.query(sql,params);
  } catch (error) {
    if (error?.code === "42P01" || error?.code === "42703") return { rows:[] };
    throw error;
  }
}

async function readYoutubePersonSignals({ client, minChannels = 3, limit = 300 } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  const normalizedMinChannels = integerOption(minChannels,3,{ min:3,max:1000 });
  const normalizedLimit = integerOption(limit,300,{ min:1,max:1000 });

  let globalResult = await optionalQuery(client,GLOBAL_SNAPSHOT_SQL);
  let snapshot = projectSnapshot(globalResult.rows?.[0] || null);
  if (!snapshot) {
    const legacyResult = await client.query(LEGACY_LATEST_SNAPSHOT_SQL);
    snapshot = projectSnapshot(legacyResult.rows?.[0] || null);
  }

  if (!snapshot) {
    return Object.freeze({
      schema:YOUTUBE_PERSON_SIGNAL_SCHEMA,
      available:false,
      snapshot:null,
      segment_snapshot:null,
      progress:null,
      ranking_scope:"unavailable",
      detail_limited:false,
      min_channels:normalizedMinChannels,
      available_count:0,
      stored_count:0,
      rows:Object.freeze([])
    });
  }

  const [progressResult,segmentResult] = await Promise.all([
    optionalQuery(client,PROGRESS_SQL),
    optionalQuery(client,SEGMENT_SNAPSHOT_SQL)
  ]);
  const segment=projectSnapshot(segmentResult.rows?.[0] || null);
  const progress=projectProgress(progressResult.rows?.[0] || null);
  const aggregateCount=Number(snapshot.threshold_counts?.[String(normalizedMinChannels)]);

  // A fully reconciled global snapshot already has exact channel counts.
  // Only the unreconciled baseline+supplement pair needs bounded merging.
  if (snapshot.snapshot_scope==="global_baseline" && segment) {
    const detailLimit=1000;
    const [baselineRows,segmentRows]=await Promise.all([
      client.query(SIGNAL_ROWS_SQL,[snapshot.snapshot_id,3,detailLimit]),
      client.query(SIGNAL_ROWS_SQL,[segment.snapshot_id,3,detailLimit])
    ]);
    const combined=mergeBoundedSignals(baselineRows.rows || [],segmentRows.rows || [],normalizedMinChannels,normalizedLimit);
    return Object.freeze({
      schema:YOUTUBE_PERSON_SIGNAL_SCHEMA,
      available:true,
      snapshot,
      segment_snapshot:segment,
      progress,
      ranking_scope:"cross_segment_bounds",
      detail_limited:(baselineRows.rows || []).length===detailLimit || (segmentRows.rows || []).length===detailLimit,
      min_channels:normalizedMinChannels,
      // This aggregate is from the baseline; no global merged total is known.
      available_count:Number.isInteger(aggregateCount) && aggregateCount>=0 ? aggregateCount : combined.stored_count,
      stored_count:combined.stored_count,
      rows:combined.rows
    });
  }

  const [countResult,rowsResult]=await Promise.all([
    client.query(SIGNAL_COUNT_SQL,[snapshot.snapshot_id,normalizedMinChannels]),
    client.query(SIGNAL_ROWS_SQL,[snapshot.snapshot_id,normalizedMinChannels,normalizedLimit])
  ]);
  const storedCount=Number(countResult.rows?.[0]?.count || 0);
  return Object.freeze({
    schema:YOUTUBE_PERSON_SIGNAL_SCHEMA,
    available:true,
    snapshot,
    segment_snapshot:segment,
    progress,
    ranking_scope:snapshot.snapshot_scope==="global_reconciled" ? "exact_global" : "single_snapshot",
    detail_limited:false,
    min_channels:normalizedMinChannels,
    available_count:Number.isInteger(aggregateCount) && aggregateCount>=0 ? aggregateCount : storedCount,
    stored_count:storedCount,
    rows:Object.freeze((rowsResult.rows || []).map(projectSignal))
  });
}

module.exports = Object.freeze({
  YOUTUBE_PERSON_SIGNAL_SCHEMA,
  GLOBAL_SNAPSHOT_SQL,
  LEGACY_LATEST_SNAPSHOT_SQL,
  SEGMENT_SNAPSHOT_SQL,
  PROGRESS_SQL,
  SIGNAL_COUNT_SQL,
  SIGNAL_ROWS_SQL,
  integerOption,
  normalizeThresholdCounts,
  projectSnapshot,
  projectProgress,
  projectSignal,
  mergeBoundedSignals,
  optionalQuery,
  readYoutubePersonSignals
});
