"use strict";

// Runtime handoff from the ACTUAL archived B024 Video-ID / Channel-ID sets
// to the ONE existing YouTube discovery read surface. This is title-topic
// EVIDENCE, not proof that an actual video was watched or about that person.
const SOURCE=require("../audits/youtube-b024-original-id-runtime-source-20261020.json");
const {matchesSnapshot,ARCHIVE_SHA,CROSSWALK}=require("./atlas-youtube-original-title-crosswalk-read.js");
const {reviewedLivingStatus}=require("../atlas-youtube-reviewed-living-people.js");

const SCHEMA="atlas-youtube-b024-original-video-id-live-discovery-input/v1";
const SOURCE_PROOF="ORIGINAL_ID_EXPLICIT_BIOGRAPHY_TITLE_UNVERIFIED_CONTENT";
const PROFILE_SOURCE_PROOF="ORIGINAL_ID_EXPLICIT_BIOGRAPHY_AND_PROFILE_TITLE_UNVERIFIED_CONTENT";
const EXTRA_SOURCE=require("../audits/youtube-b024-added-profile-title-runtime-source-20261020.json");
const SOURCE_HOLDS=require("../audits/youtube-b024-clear-nonindividual-and-identity-holds-20261020.json");
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

function validAdditiveProfileSource(profile=EXTRA_SOURCE,holds=SOURCE_HOLDS,strictRows=VERIFIED_SOURCE_ROWS){
  if(profile.schema!=="atlas-youtube-b024-profile-original-id-additive-runtime/v1"||
     profile.source_archive_sha256!==ARCHIVE_SHA||
     profile.derived_profile_artifact_id!==12264217300||
     profile.derived_profile_artifact_zip_sha256!==
       "sha256:2f74ff923eab322ea0bfa4bc145cda89e5fda41127567e05d3e2349e516e331e"||
     profile.source_strict_candidate_group_count!==2241||
     profile.source_strict_biography_title_video_id_count!==6162||
     profile.new_original_profile_title_video_id_count!==536||
     profile.new_profile_title_source_name_group_count!==400||
     profile.combined_unique_profile_plus_biography_title_video_ids!==6698||
     profile.video_media_playback_verified_count!==0||
     profile.current_registered_Person_full_screen_completed!==false||
     profile.production_rank_currently_changed!==false||
     profile.title_evidence_only!==true||
     !Array.isArray(profile.rows)||profile.rows.length!==400)
    throw Error("B024_ADDITIVE_ORIGINAL_ID_PROFILE_PROVENANCE_INVALID");
  const strictMap=new Map(strictRows.map(row=>[row[0],row]));
  const used=new Set(strictRows.flatMap(row=>row[3]));
  const extra=new Map();
  let added=0;
  for(const row of profile.rows){
    if(!Array.isArray(row)||row.length!==3||extra.has(row[0])||!strictMap.has(row[0])||
       !Array.isArray(row[1])||!Array.isArray(row[2])||!row[1].length||!row[2].length||
       new Set(row[1]).size!==row[1].length||new Set(row[2]).size!==row[2].length||
       row[1].some(id=>!/^UC[\w-]{22}$/.test(id))||
       row[2].some(id=>!/^[\w-]{11}$/.test(id)))
      throw Error("B024_ADDITIVE_ORIGINAL_ID_PROFILE_ROW_INVALID");
    for(const vid of row[2]){
      if(used.has(vid))throw Error("B024_ADDITIVE_ORIGINAL_VIDEO_ID_DOUBLE_CREDIT");
      used.add(vid);added++;
    }
    extra.set(row[0],{channel_ids:row[1],video_ids:row[2]});
  }
  if(added!==536||used.size!==6698)
    throw Error("B024_ADDITIVE_ORIGINAL_VIDEO_POPULATION_CHANGED");
  if(holds.schema!=="atlas-b024-pinned-nonindividual-and-identity-review-holds/v1"||
     holds.source_archive_sha256!==ARCHIVE_SHA||
     holds.source_profile_artifact_zip_sha256!==profile.derived_profile_artifact_zip_sha256||
     holds.total_held_source_labels!==62||holds.clear_nonindividual_labels!==52||
     holds.ambiguous_identity_labels!==10||!Array.isArray(holds.rows)||holds.rows.length!==62)
    throw Error("B024_NONINDIVIDUAL_HOLD_REVIEW_PROVENANCE_INVALID");
  const quarantined=new Map();
  for(const row of holds.rows){
    if(!strictMap.has(row.name)||!extra.has(row.name)||quarantined.has(row.name)||
       !["CLEAR_NONINDIVIDUAL_LABEL_HOLD","AMBIGUOUS_OR_NON_DISTINCT_IDENTITY_HOLD"].includes(row.disposition))
      throw Error("B024_HOLD_NOT_EXACT_PINNED_SOURCE_IDENTITY");
    quarantined.set(row.name,row.disposition);
  }
  let afterUnion3=0;
  for(const row of strictRows){
    const e=extra.get(row[0]);
    if(new Set([...row[2],...(e?.channel_ids||[])]).size>=3)afterUnion3++;
  }
  if(afterUnion3!==895)
    throw Error("B024_ADDITIVE_SOURCE_3CHANNEL_UNION_CHANGED");
  return Object.freeze({extra,quarantined,unfiltered_three_channel_groups:afterUnion3});
}
const VERIFIED_PROFILE=validAdditiveProfileSource();

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
  const rejected={registered:0,living:0,ambiguous:0,collision:0,nonindividual:0,identity_hold:0};
  const prelim=[];
  for(const row of sourceRows){
    const [name,aliases,originalChannels,originalVideos,reviewedHistorical]=row;
    const known=new Set();
    for(const alias of new Set([name,...aliases])){
      for(const id of index.get(identityKey(alias))||[])known.add(id);
    }
    if(known.size===1){rejected.registered++;continue;}
    if(known.size>1){rejected.ambiguous++;continue;}
    const hold=VERIFIED_PROFILE.quarantined.get(name);
    if(hold==="CLEAR_NONINDIVIDUAL_LABEL_HOLD"){rejected.nonindividual++;continue;}
    if(hold==="AMBIGUOUS_OR_NON_DISTINCT_IDENTITY_HOLD"){rejected.identity_hold++;continue;}
    if(aliases.some(alias=>reviewedLivingStatus(alias,now)?.status==="living_likely")||
       reviewedLivingStatus(name,now)?.status==="living_likely"){
      rejected.living++;continue;
    }
    const addition=VERIFIED_PROFILE.extra.get(name);
    const combinedChannels=new Set([...originalChannels,...(addition?.channel_ids||[])]);
    const combinedVideos=new Set([...originalVideos,...(addition?.video_ids||[])]);
    prelim.push({
      raw_name:name,
      source_labels:aliases,
      distinct_channel_count:combinedChannels.size,
      video_count:combinedVideos.size,
      strict_biography_original_channel_count:originalChannels.length,
      strict_biography_original_video_count:originalVideos.length,
      additional_explicit_profile_original_channel_count:addition?.channel_ids.length||0,
      additional_explicit_profile_original_video_count:addition?.video_ids.length||0,
      source_id_union_verified:true,
      count_lower_bound:false,
      identity_state:"unregistered_candidate",
      registration_match_count:0,
      historical_personhood_previously_reviewed:reviewedHistorical,
      original_video_id_example:originalVideos[0],
      original_channel_id_example:originalChannels[0],
      evidence_type:addition?PROFILE_SOURCE_PROOF:SOURCE_PROOF,
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
    newly_reviewed_nonindividual_source_holds:rejected.nonindividual,
    newly_reviewed_ambiguous_source_holds:rejected.identity_hold,
    additive_profile_original_video_id_count:536,
    source_total_title_evidence_original_video_id_count:6698,
    current_registry_distinct_persons:uniqueIds.size,
    current_registry_authoritative_person_count:expectedCurrentRegisteredPersons,
    current_registry_person_count_parity_verified:true,
    exact_source_snapshot_matched:true,
    ranking_evidence_type:PROFILE_SOURCE_PROOF,
    video_person_centeredness_certified:false,
    historical_personhood_certified_for_all:false,
    current_registration_screen_completed:true
  });
}
module.exports=Object.freeze({SOURCE_PROOF,PROFILE_SOURCE_PROOF,VERIFIED_SOURCE_ROWS,
  VERIFIED_PROFILE,validArchive,validAdditiveProfileSource,renderCurrentRegistryRank});
