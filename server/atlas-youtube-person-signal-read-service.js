"use strict";

// Every retained YouTube batch contributes to one cumulative Channel-ID corpus.
// The unrecoverable batch001–007 summaries are not eligible for current rankings.
const YOUTUBE_PERSON_SIGNAL_SCHEMA="atlas-youtube-person-signals/v2";

const GLOBAL_SNAPSHOT_SQL=`
select snapshot_id,generated_at,channel_count,video_count,threshold_counts,
       parser_version,source_state,snapshot_scope
from atlas_v2.youtube_person_signal_snapshots
where snapshot_scope='global_reconciled'
order by generated_at desc,snapshot_id desc
limit 1
`;

const SIGNAL_COUNT_SQL=`
select count(*)::int as count
from atlas_v2.youtube_person_signals
where snapshot_id=$1 and distinct_channel_count >= $2
`;

const SIGNAL_ROWS_SQL=`
select raw_name,rank,distinct_channel_count,video_count
from atlas_v2.youtube_person_signals
where snapshot_id=$1 and distinct_channel_count >= $2
order by rank
limit $3
`;

const PAGED_SIGNAL_ROWS_SQL=`
select raw_name,rank,distinct_channel_count,video_count
from atlas_v2.youtube_person_signals
where snapshot_id=$1 and distinct_channel_count >= $2
order by rank
limit $3 offset $4
`;

function integerOption(value,fallback,{min,max}) {
  if(value==null || value==="") return fallback;
  const number=Number(value);
  if(!Number.isInteger(number) || number<min || number>max) {
    const error=new Error("INVALID_YOUTUBE_PERSON_SIGNAL_QUERY");
    error.code="INVALID_YOUTUBE_PERSON_SIGNAL_QUERY";
    throw error;
  }
  return number;
}

function normalizeThresholdCounts(value) {
  if(!value || typeof value!=="object" || Array.isArray(value)) return Object.freeze({});
  const output={};
  for(const [key,count] of Object.entries(value)) {
    const n=Number(count);
    if(Number.isInteger(n) && n>=0) output[String(key)]=n;
  }
  return Object.freeze(output);
}

function projectSnapshot(row) {
  if(!row) return null;
  return Object.freeze({
    snapshot_id:String(row.snapshot_id),
    generated_at:String(row.generated_at),
    channel_count:Number(row.channel_count || 0),
    video_count:Number(row.video_count || 0),
    threshold_counts:normalizeThresholdCounts(row.threshold_counts),
    parser_version:String(row.parser_version || ""),
    snapshot_scope:String(row.snapshot_scope || "legacy_unspecified"),
    source_state:Object.freeze(row.source_state && typeof row.source_state==="object" && !Array.isArray(row.source_state) ? {...row.source_state} : {})
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

async function readYoutubePersonSignals({client,minChannels=3,limit=300,offset=0}={}) {
  if(!client || typeof client.query!=="function") throw new Error("PostgreSQL client is required");
  const threshold=integerOption(minChannels,3,{min:3,max:1000});
  const pageSize=integerOption(limit,300,{min:1,max:1000});
  const pageOffset=integerOption(offset,0,{min:0,max:10000});

  const snapshot=projectSnapshot((await client.query(GLOBAL_SNAPSHOT_SQL)).rows?.[0]);
  if(!snapshot) return Object.freeze({
    schema:YOUTUBE_PERSON_SIGNAL_SCHEMA,available:false,snapshot:null,
    min_channels:threshold,available_count:0,stored_count:0,rows:Object.freeze([])
  });

  const [countResult,rowsResult]=await Promise.all([
    client.query(SIGNAL_COUNT_SQL,[snapshot.snapshot_id,threshold]),
    client.query(pageOffset ? PAGED_SIGNAL_ROWS_SQL : SIGNAL_ROWS_SQL,pageOffset ? [snapshot.snapshot_id,threshold,pageSize,pageOffset] : [snapshot.snapshot_id,threshold,pageSize])
  ]);
  const storedCount=Number(countResult.rows?.[0]?.count || 0);
  const aggregateCount=Number(snapshot.threshold_counts?.[String(threshold)]);
  return Object.freeze({
    schema:YOUTUBE_PERSON_SIGNAL_SCHEMA,available:true,snapshot,
    min_channels:threshold,
    offset:pageOffset,
    available_count:Number.isInteger(aggregateCount)&&aggregateCount>=0?aggregateCount:storedCount,
    stored_count:storedCount,
    rows:Object.freeze((rowsResult.rows || []).map(projectSignal))
  });
}

module.exports=Object.freeze({
  YOUTUBE_PERSON_SIGNAL_SCHEMA,GLOBAL_SNAPSHOT_SQL,
  SIGNAL_COUNT_SQL,SIGNAL_ROWS_SQL,PAGED_SIGNAL_ROWS_SQL,integerOption,normalizeThresholdCounts,
  projectSnapshot,projectSignal,readYoutubePersonSignals
});
