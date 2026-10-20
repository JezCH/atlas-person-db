"use strict";

// Runtime handoff from the ACTUAL archived B024 Video-ID / Channel-ID sets
// to the ONE existing YouTube discovery read surface. This is title-topic
// EVIDENCE, not proof that an actual video was watched or about that person.
const SOURCE=require("../audits/youtube-b024-original-id-runtime-source-20261020.json");
const {matchesSnapshot,ARCHIVE_SHA,CROSSWALK}=require("./atlas-youtube-original-title-crosswalk-read.js");
const {reviewedLivingStatus}=require("../atlas-youtube-reviewed-living-people.js");

const SCHEMA="atlas-youtube-b024-original-video-id-live-discovery-input/v1";
const SOURCE_PROOF="ORIGINAL_ID_EXPLICIT_BIOGRAPHY_TITLE_UNVERIFIED_CONTENT";
const NONPERSON_EXACT=new Set([
  // Historical excluded names were already removed from the source before
  // publishing it to this read layer. This layer never invents extra aliases.
]);

function validArchive(data=SOURCE){
  const p=data?.provenance;
  if(data?.schema!==SCHEMA||!p||p.source_archive_sha256!==ARCHIVE_SHA||
     p.source_snapshot_id!=="yt-20261009T111844Z-10127ch-rebuild-v4"||
     p.production_v5_snapshot_id!==CROSSWALK.production_snapshot_id||
     p.original_channel_population!==10127||p.original_video_title_population!==2230031||
     p.original_bio_title_video_population!==10706||p.source_labels_screened!==2766||
     p.prior_review_candidate_rows!==2241||
     p.registered_living_nonperson_historical_exclusions!==512||
     p.held_identity_labels!==11||p.watched_media_count!==0||
     !Array.isArray(data.rows)||data.rows.length!==2241)
    throw Error("B024_SINGLE_RANK_ARCHIVED_ORIGINAL_IDS_PROVENANCE_INVALID");
  const names=new Set(),originalVideos=new Set();
  let n3=0,total=0;
  for(const row of data.rows){
    if(!Array.isArray(row)||row.length!==5||typeof row[0]!=="string"||!row[0]||
       names.has(row[0])||!Array.isArray(row[1])||!row[1].length||
       !Array.isArray(row[2])||!Array.isArray(row[3])||
       typeof row[4]!=="boolean"||
       new Set(row[1]).size!==row[1].length||
       new Set(row[2]).size!==row[2].length||
       new Set(row[3]).size!==row[3].length||
       row[2].length<1||row[3].length<1||
       row[2].some(id=>!/^UC[\w-]{22}$/.test(id))||
       row[3].some(id=>!/^[\w-]{11}$/.test(id)))
      throw Error("B024_SINGLE_RANK_ORIGINAL_SET_ROW_INVALID");
    for(const id of row[3]){
      if(originalVideos.has(id))
        throw Error("B024_SINGLE_RANK_ORIGINAL_VIDEO_ID_SHARED_BETWEEN_IDENTITIES");
      originalVideos.add(id);
    }
    names.add(row[0]);total+=row[3].length;
    if(row[2].length>=3)n3++;
  }
  if(total!==6162||n3!==799)
    throw Error("B024_SINGLE_RANK_ORIGINAL_SET_POPULATION_INVALID");
  return data.rows;
}
const VERIFIED_SOURCE_ROWS=validArchive();

function renderCurrentRegistryRank({
  snapshot,registryRows,identityKey,now=Date.now(),sourceRows=VERIFIED_SOURCE_ROWS,
  minDistinctRegisteredPersons=2000,expectedCurrentRegisteredPersons
}={}){
  if(!matchesSnapshot(snapshot))
    throw Error("B024_SINGLE_RANK_GLOBAL_SOURCE_SNAPSHOT_MISMATCH");
  if(!Array.isArray(registryRows)||typeof identityKey!=="function")
    throw Error("B024_SINGLE_RANK_CURRENT_REGISTRY_REQUIRED");
  const uniqueIds=new Set(registryRows.map(r=>String(r.person_id||"")).filter(Boolean));
  if(!Number.isSafeInteger(expectedCurrentRegisteredPersons) ||
     expectedCurrentRegisteredPersons<minDistinctRegisteredPersons ||
     uniqueIds.size!==expectedCurrentRegisteredPersons)
    throw Error("B024_SINGLE_RANK_CURRENT_REGISTRY_INCOMPLETE");
  // Counting 2,000 rows is NOT a full-roster proof. The authoritative live
  // Person table must have exactly as many UUIDs as the complete roster query
  // returned. A partial read with 2,100 / 2,145 rows must fail closed.
  const index=new Map();
  for(const row of registryRows){
    const key=identityKey(row.alias_name),id=String(row.person_id||"").trim();
    if(!key||!id)continue;
    if(!index.has(key))index.set(key,new Set());
    index.get(key).add(id);
  }
  const rejected={registered:0,living:0,ambiguous:0,collision:0};
  const prelim=[];
  for(const row of sourceRows){
    const [name,aliases,originalChannels,originalVideos,reviewedHistorical]=row;
    const known=new Set();
    for(const alias of new Set([name,...aliases])){
      for(const id of index.get(identityKey(alias))||[])known.add(id);
    }
    if(known.size===1){rejected.registered++;continue;}
    if(known.size>1){rejected.ambiguous++;continue;}
    if(aliases.some(alias=>reviewedLivingStatus(alias,now)?.status==="living_likely")||
       reviewedLivingStatus(name,now)?.status==="living_likely"){
      rejected.living++;continue;
    }
    prelim.push({
      raw_name:name,
      source_labels:aliases,
      distinct_channel_count:originalChannels.length,
      video_count:originalVideos.length,
      source_id_union_verified:true,
      count_lower_bound:false,
      identity_state:"unregistered_candidate",
      registration_match_count:0,
      historical_personhood_previously_reviewed:reviewedHistorical,
      original_video_id_example:originalVideos[0],
      original_channel_id_example:originalChannels[0],
      evidence_type:SOURCE_PROOF,
      video_person_centeredness_certified:false,
      presently_unregistered_historical_person_certified:false
    });
  }
  // If two independently unreviewed source-name strings normalize to the
  // SAME person key, they must not silently appear as separate ranked people
  // or be summed absent reviewed identity evidence.
  const grouping=new Map();
  for(const row of prelim){
    const key=identityKey(row.raw_name);
    if(!grouping.has(key))grouping.set(key,[]);
    grouping.get(key).push(row);
  }
  const eligible=[];
  for(const group of grouping.values()){
    if(group.length>1){rejected.collision+=group.length;continue;}
    eligible.push(group[0]);
  }
  eligible.sort((a,b)=>b.distinct_channel_count-a.distinct_channel_count||
    b.video_count-a.video_count||a.raw_name.localeCompare(b.raw_name,"en"));
  eligible.forEach((row,i)=>row.rank=i+1);
  const counts={};
  for(const n of [3,5,10,15,20])
    counts[String(n)]=eligible.filter(row=>row.distinct_channel_count>=n).length;
  return Object.freeze({
    candidates:eligible,threshold_counts:counts,
    prior_source_label_count:2241,
    current_registered_excluded_count:rejected.registered,
    additional_current_living_excluded_count:rejected.living,
    ambiguous_current_registration_holds:rejected.ambiguous,
    unreviewed_name_normalization_holds:rejected.collision,
    current_registry_distinct_persons:uniqueIds.size,
    current_registry_authoritative_person_count:expectedCurrentRegisteredPersons,
    current_registry_person_count_parity_verified:true,
    exact_source_snapshot_matched:true,
    ranking_evidence_type:SOURCE_PROOF,
    video_person_centeredness_certified:false,
    historical_personhood_certified_for_all:false,
    current_registration_screen_completed:true
  });
}
module.exports=Object.freeze({SOURCE_PROOF,VERIFIED_SOURCE_ROWS,validArchive,renderCurrentRegistryRank});
