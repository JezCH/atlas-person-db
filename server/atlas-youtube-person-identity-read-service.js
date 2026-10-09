"use strict";

// Authoritative UUID ranking reader. Never pair stale UUID counts with a newer
// global raw Channel-ID snapshot or silently replace the legacy raw ranking.
const {GLOBAL_SNAPSHOT_SQL,integerOption,projectSnapshot} = require("./atlas-youtube-person-signal-read-service.js");
const PERSON_IDENTITY_SCHEMA="atlas-youtube-person-identity-signals/v1";
const IDENTITY_POLICY="reviewed_prefix_plus_conservative_in_title";
const IDENTITY_META_SQL=[
  "select identity_snapshot_id,source_snapshot_id,artifact_id,artifact_digest,",
  "source_run_id,extraction_policy,matched_video_rows,person_count,created_at",
  "from atlas_v2.youtube_person_identity_snapshots",
  "where source_snapshot_id=$1 and extraction_policy=$2",
  "order by created_at desc,identity_snapshot_id desc limit 1"
].join(" ");
const IDENTITY_COUNT_SQL=[
  "select count(*)::int as count from atlas_v2.youtube_person_identity_signals",
  "where identity_snapshot_id=$1 and distinct_channel_count >= $2"
].join(" ");
const IDENTITY_TOTAL_SQL=[
  "select count(*)::int as count,",
  "count(*) filter (where distinct_channel_count>=3)::int as channels_3,",
  "count(*) filter (where distinct_channel_count>=5)::int as channels_5,",
  "count(*) filter (where distinct_channel_count>=10)::int as channels_10,",
  "count(*) filter (where distinct_channel_count>=15)::int as channels_15,",
  "count(*) filter (where distinct_channel_count>=20)::int as channels_20",
  "from atlas_v2.youtube_person_identity_signals where identity_snapshot_id=$1"
].join(" ");
const IDENTITY_ROWS_SQL=[
  "select person_id,display_name_basis,rank,distinct_channel_count,distinct_video_count,",
  "matched_variants,evidence_rows_by_type from atlas_v2.youtube_person_identity_signals",
  "where identity_snapshot_id=$1 and distinct_channel_count >= $2",
  "order by rank limit $3 offset $4"
].join(" ");

function unavailable(snapshot,threshold,reason) {
  return Object.freeze({
    schema:PERSON_IDENTITY_SCHEMA,mode:"person",available:false,
    unavailable_reason:reason,snapshot,min_channels:threshold,threshold_counts:{},
    available_count:0,stored_count:0,rows:[]
  });
}
function projectRow(row) {
  const variants=Array.isArray(row.matched_variants)?row.matched_variants:[];
  const evidence=row.evidence_rows_by_type&&typeof row.evidence_rows_by_type==="object"
    &&!Array.isArray(row.evidence_rows_by_type)?row.evidence_rows_by_type:{};
  return Object.freeze({
    person_id:String(row.person_id),raw_name:String(row.display_name_basis),
    display_name_basis:String(row.display_name_basis),rank:Number(row.rank),
    distinct_channel_count:Number(row.distinct_channel_count),
    video_count:Number(row.distinct_video_count),
    matched_variants:variants,evidence_rows_by_type:evidence,
    evidence_kind:"reviewed_title_mentions"
  });
}
async function readYoutubePersonIdentitySignals({client,minChannels=3,limit=300,offset=0}={}) {
  if(!client||typeof client.query!=="function") throw new Error("PostgreSQL client is required");
  const threshold=integerOption(minChannels,3,{min:3,max:1000});
  const pageSize=integerOption(limit,300,{min:1,max:1000});
  const pageOffset=integerOption(offset,0,{min:0,max:100000});
  const first=projectSnapshot((await client.query(GLOBAL_SNAPSHOT_SQL)).rows?.[0]);
  if(!first) return unavailable(null,threshold,"no_global_snapshot");
  let meta;
  try {
    meta=(await client.query(IDENTITY_META_SQL,[first.snapshot_id,IDENTITY_POLICY])).rows?.[0];
  } catch(error) {
    if(error?.code==="42P01") return unavailable(first,threshold,"identity_model_not_installed");
    throw error;
  }
  if(!meta) return unavailable(first,threshold,"identity_snapshot_not_published");
  if(String(meta.source_snapshot_id)!==first.snapshot_id||String(meta.extraction_policy)!==IDENTITY_POLICY)
    return unavailable(first,threshold,"identity_provenance_mismatch");
  const id=String(meta.identity_snapshot_id);
  const [count,totals,page,latest]=await Promise.all([
    client.query(IDENTITY_COUNT_SQL,[id,threshold]),
    client.query(IDENTITY_TOTAL_SQL,[id]),
    client.query(IDENTITY_ROWS_SQL,[id,threshold,pageSize,pageOffset]),
    client.query(GLOBAL_SNAPSHOT_SQL)
  ]);
  const now=projectSnapshot(latest.rows?.[0]);
  if(!now||now.snapshot_id!==first.snapshot_id)
    return unavailable(now,threshold,"global_snapshot_changed");
  const total=Number(totals.rows?.[0]?.count);
  if(!Number.isInteger(total)||total!==Number(meta.person_count)) {
    const error=new Error("YOUTUBE_IDENTITY_SNAPSHOT_COUNT_MISMATCH");
    error.code="YOUTUBE_IDENTITY_SNAPSHOT_COUNT_MISMATCH";
    throw error;
  }
  const counts=totals.rows?.[0]||{};
  return Object.freeze({
    schema:PERSON_IDENTITY_SCHEMA,mode:"person",available:true,snapshot:first,
    identity_snapshot:{
      identity_snapshot_id:id,source_snapshot_id:String(meta.source_snapshot_id),
      artifact_id:String(meta.artifact_id),artifact_digest:String(meta.artifact_digest),
      source_run_id:String(meta.source_run_id),extraction_policy:String(meta.extraction_policy),
      matched_video_rows:Number(meta.matched_video_rows),
      person_count:total,created_at:String(meta.created_at)
    },
    min_channels:threshold,offset:pageOffset,
    available_count:Number(count.rows?.[0]?.count||0),
    stored_count:Number(count.rows?.[0]?.count||0),
    threshold_counts:{
      "3":Number(counts.channels_3||0),"5":Number(counts.channels_5||0),
      "10":Number(counts.channels_10||0),"15":Number(counts.channels_15||0),
      "20":Number(counts.channels_20||0)
    },
    rows:Object.freeze((page.rows||[]).map(projectRow))
  });
}
module.exports=Object.freeze({
  PERSON_IDENTITY_SCHEMA,IDENTITY_POLICY,IDENTITY_META_SQL,IDENTITY_COUNT_SQL,
  IDENTITY_TOTAL_SQL,IDENTITY_ROWS_SQL,unavailable,projectRow,readYoutubePersonIdentitySignals
});
