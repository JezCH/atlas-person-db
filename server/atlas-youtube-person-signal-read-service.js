"use strict";

const YOUTUBE_PERSON_SIGNAL_SCHEMA = "atlas-youtube-person-signals/v1";

const LATEST_SNAPSHOT_SQL = `
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
    source_state:Object.freeze(
      row.source_state && typeof row.source_state === "object" && !Array.isArray(row.source_state)
        ? { ...row.source_state }
        : {}
    )
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

async function readYoutubePersonSignals({ client, minChannels = 3, limit = 300 } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  const normalizedMinChannels = integerOption(minChannels,3,{ min:3,max:1000 });
  const normalizedLimit = integerOption(limit,300,{ min:1,max:1000 });
  const latestResult = await client.query(LATEST_SNAPSHOT_SQL);
  const snapshot = projectSnapshot(latestResult.rows?.[0] || null);
  if (!snapshot) {
    return Object.freeze({
      schema:YOUTUBE_PERSON_SIGNAL_SCHEMA,
      available:false,
      snapshot:null,
      min_channels:normalizedMinChannels,
      available_count:0,
      rows:Object.freeze([])
    });
  }
  const [countResult, rowsResult] = await Promise.all([
    client.query(SIGNAL_COUNT_SQL,[snapshot.snapshot_id,normalizedMinChannels]),
    client.query(SIGNAL_ROWS_SQL,[snapshot.snapshot_id,normalizedMinChannels,normalizedLimit])
  ]);
  return Object.freeze({
    schema:YOUTUBE_PERSON_SIGNAL_SCHEMA,
    available:true,
    snapshot,
    min_channels:normalizedMinChannels,
    available_count:Number(countResult.rows?.[0]?.count || 0),
    rows:Object.freeze((rowsResult.rows || []).map(projectSignal))
  });
}

module.exports = Object.freeze({
  YOUTUBE_PERSON_SIGNAL_SCHEMA,
  LATEST_SNAPSHOT_SQL,
  SIGNAL_COUNT_SQL,
  SIGNAL_ROWS_SQL,
  integerOption,
  normalizeThresholdCounts,
  projectSnapshot,
  projectSignal,
  readYoutubePersonSignals
});
