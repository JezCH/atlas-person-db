"use strict";

// The original B024 archive was independently replayed, but its name hits
// remain TITLE MENTIONS, never human-reviewed person-centred video evidence.
// Overlay this audit on the EXISTING ONE discovery table; do not overwrite
// ranked title-signal counts or publish a second leaderboard.
const SHARDS=Object.freeze([
  require("../audits/youtube-b024-v5-crosswalk-matched-part1.json"),
  require("../audits/youtube-b024-v5-crosswalk-matched-part2.json"),
  require("../audits/youtube-b024-v5-crosswalk-matched-part3.json")
]);
const ARCHIVE_SHA="8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946";
const SCHEMA="atlas-youtube-b024-v5-original-id-crosswalk-matched/v1";
const EXPECTED_SOURCE_LABEL_SHA="b9d9bcdb4fa98e0f917a1dc32106a84fc11b788b86780078e9c207b5c44e550c";

function buildCrosswalkIndex(shards=SHARDS){
  if(!Array.isArray(shards)||shards.length===0)
    throw Error("YOUTUBE_TITLE_CROSSWALK_SHARDS_INVALID");
  const [first]=shards;
  const required=["source_5965_sha256","production_snapshot_id","source_snapshot_id","kind","schema"];
  for(const file of shards){
    if(required.some(key=>file?.[key]!==first[key])||
       file.schema!==SCHEMA||file.kind!=="exact_name_matched"||
       file.source_5965_sha256!==EXPECTED_SOURCE_LABEL_SHA||
       !Array.isArray(file.rows))
      throw Error("YOUTUBE_TITLE_CROSSWALK_PROVENANCE_INVALID");
  }
  const index=new Map();
  for(const file of shards){
    for(const row of file.rows){
      // [historic rank, production label, source label,
      //  production channels/videos, source original channels/videos, origin]
      if(!Array.isArray(row)||row.length!==8||
         typeof row[1]!=="string"||row[1]!==row[2]||
         !Number.isSafeInteger(row[0])||row[0]<1||
         [3,4,5,6].some(i=>!Number.isSafeInteger(row[i])||row[i]<1)||
         typeof row[7]!=="string")
        throw Error("YOUTUBE_TITLE_CROSSWALK_SOURCE_ROW_INVALID");
      if(index.has(row[1]))throw Error("YOUTUBE_TITLE_CROSSWALK_DUPLICATE_LABEL");
      index.set(row[1],Object.freeze({
        signal_channels:row[3],signal_videos:row[4],
        source_title_channels:row[5],source_title_videos:row[6]
      }));
    }
  }
  return Object.freeze({
    index,
    production_snapshot_id:first.production_snapshot_id,
    source_snapshot_id:first.source_snapshot_id,
    original_archive_sha256:ARCHIVE_SHA
  });
}

const CROSSWALK=buildCrosswalkIndex();

function matchesSnapshot(snapshot,crosswalk=CROSSWALK){
  return Boolean(snapshot &&
    snapshot.snapshot_id===crosswalk.production_snapshot_id &&
    snapshot.parser_version==="yt-title-person-reviewed-v5" &&
    snapshot.channel_count===10127 &&
    snapshot.video_count===2230031 &&
    snapshot.source_state?.artifact_digest==="sha256:"+crosswalk.original_archive_sha256);
}

function annotateSourceTitleCounts(candidates,snapshot,crosswalk=CROSSWALK){
  if(!Array.isArray(candidates))throw Error("YOUTUBE_TITLE_CROSSWALK_CANDIDATES_REQUIRED");
  if(!matchesSnapshot(snapshot,crosswalk))return {
    candidates,compared:0,eligible:false
  };
  let compared=0;
  const result=candidates.map(candidate=>{
    const original=crosswalk.index.get(candidate.raw_name);
    // Do not silently graft a historical snapshot's counts onto an edited,
    // merged-identity or lower-bound Person name. Exact ORIGINAL title stats
    // must match the historical live signal inputs that generated the audit.
    if(!original||candidate.source_id_union_verified===true||
       candidate.count_lower_bound===true||
       candidate.source_labels?.length!==1||
       candidate.source_labels[0]!==candidate.raw_name||
       candidate.distinct_channel_count!==original.signal_channels||
       candidate.video_count!==original.signal_videos)return candidate;
    compared++;
    return {
      ...candidate,
      original_source_title_audit:{
        source_snapshot_id:crosswalk.source_snapshot_id,
        distinct_title_mention_channels:original.source_title_channels,
        distinct_title_mention_videos:original.source_title_videos,
        evidence_scope:"INDEPENDENT_ORIGINAL_VIDEO_TITLE_NAME_MENTION",
        verified_individual_primary_video_content:false,
        same_person_alias_union_certified:false,
        not_eligible_for_ranking_count_replacement:true
      }
    };
  });
  return {candidates:result,compared,eligible:true};
}

module.exports=Object.freeze({buildCrosswalkIndex,matchesSnapshot,annotateSourceTitleCounts,
 CROSSWALK,ARCHIVE_SHA});
