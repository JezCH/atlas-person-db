#!/usr/bin/env node
"use strict";

// Actually rank ALL still-open B024 original-ID named-biography-title candidates.
// This is a read-only, candidate-level REVIEW PRIORITY (NOT the Production rank).
// No additional original scan, YouTube fetch, Production query or person creation.
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const ROOT=path.resolve(__dirname,"..");
const {reviewedLivingStatus}=require("../atlas-youtube-reviewed-living-people.js");
const {identityKey,reviewedNonPerson}=require("../server/atlas-youtube-unregistered-discovery-read-service.js");
const expanded=require("../audits/youtube-v5-expanded-nonperson-reviewed-exact.json");
const earlierNonperson=require("../audits/youtube-v5-source-nonperson-exact-labels.json");
const priorHistorical=require("../audits/youtube-b024-source-first-36-final-registered-identity-review.json");
const rules=require("./youtube-person-signal-quality-rules.v2.json");

const SOURCE_SHA="8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946";
const INPUT_SCHEMA="atlas-youtube-b024-prior-identity-positive-refined-original-cohorts/v1";
const OUTPUT_SCHEMA="atlas-youtube-b024-all-original-id-title-review-priority/v1";
const STALE_REGISTRATION_SCREENS=new Set([
  "CONFIRMED_REGISTERED_AS_OF_2026_10_09_EXCLUDE",
  "REVIEWED_LIVING_AS_OF_2026_10_09_EXCLUDE",
  "ADDITIONAL_REGISTERED_UUID_POSITIVE_EXCLUDE",
  "ADDITIONAL_DATED_LIVING_EVIDENCE_EXCLUDE"
]);
const PREVIOUS_HOLDS=new Set([
  "NORMALIZED_ALIAS_OR_LIVING_IDENTITY_HOLD",
  "ADDITIONAL_HISTORICAL_IDENTITY_CONFLICT_HOLD",
  "CONFLICTING_OLD_REGISTERED_UUID_HOLD"
]);
const PREVIOUS_OPEN=new Set([
  "PRIOR_2026_10_09_NEEDS_REVIEW_NOT_PROVEN_UNREGISTERED",
  "NO_2026_10_09_EXACT_SCREEN_ROW_RECHECK"
]);
const date=Date.UTC(2026,9,20);
const exactNonperson=new Set();
for(const doc of [expanded,earlierNonperson]){
  if(!Array.isArray(doc.reviewed_labels) ||
     doc.reviewed_labels.length!==doc.reviewed_label_count &&
     doc!==earlierNonperson ||
     doc.original_archive_sha256 && doc.original_archive_sha256!==SOURCE_SHA)
    throw Error("B024_RANK_REVIEWED_NONPERSON_PROVENANCE_INVALID");
  for(const x of doc.reviewed_labels){
    if(!x.name)throw Error("B024_RANK_NONPERSON_NAME_MISSING");
    exactNonperson.add(identityKey(x.name));
  }
}
const surnameHolds=new Set([...rules.do_not_infer_surname_identity,
  "Picasso","Dostoevsky","Schopenhauer","Chopin","Tchaikovsky","Diana"].map(identityKey));
const historicGroups=priorHistorical.source_historical_unmatched_identity_groups;
if(priorHistorical.schema!=="youtube-b024-source-first-last-registry-screen-36/v1" ||
   priorHistorical.source_sha256!==SOURCE_SHA ||
   priorHistorical.production_identity_check?.person_records_read!==2145 ||
   Object.keys(historicGroups).length!==15)
  throw Error("B024_RANK_PREVIOUS_HISTORIC_REVIEW_INVALID");
const canonicalByName=new Map();
for(const [canonical,aliases] of Object.entries(historicGroups)){
  for(const name of aliases){
    const key=identityKey(name);
    if(canonicalByName.has(key)&&canonicalByName.get(key)!==canonical)
      throw Error("B024_HISTORICAL_ALIAS_AMBIGUOUS");
    canonicalByName.set(key,canonical);
  }
}

function build(input,{enforceRealSource=true}={}){
  if(input?.schema!==INPUT_SCHEMA ||
     input.input_existing_b024_original_video_ids!==10706 ||
     input.input_source_name_labels!==2766 ||
     input.full_current_ATLAS_person_and_alias_census_completed!==false ||
     input.confirmed_current_unregistered_historical_people!==0 ||
     input.real_video_primary_content_certified!==0 ||
     input.production_writes!==0 || input.new_youtube_videos_fetched!==0 ||
     input.publishable!==false || !Array.isArray(input.rows))
    throw Error("B024_RANK_PRIOR_REAL_ORIGINAL_SOURCE_INVALID");
  if(enforceRealSource&&input.rows.length!==2766)
    throw Error("B024_RANK_SOURCE_LABEL_COUNT_INVALID");
  const validLabels=new Set(),allVideos=new Set(),statusCount={};
  const open=[],excluded=[],held=[];
  for(const row of input.rows){
    const label=row.identity_label_for_review;
    if(typeof label!=="string" || validLabels.has(label) ||
       !Array.isArray(row.strong_biography_title_distinct_original_video_ids) ||
       !Array.isArray(row.strong_biography_title_distinct_original_channel_ids))
      throw Error("B024_RANK_DUPLICATE_OR_BAD_ORIGINAL_LABEL");
    validLabels.add(label);
    const videos=row.strong_biography_title_distinct_original_video_ids;
    const channels=row.strong_biography_title_distinct_original_channel_ids;
    if(new Set(videos).size!==videos.length || new Set(channels).size!==channels.length ||
       row.strong_biography_title_distinct_videos!==videos.length ||
       row.strong_biography_title_distinct_channels!==channels.length ||
       row.actual_video_content_certified!==false ||
       row.current_complete_production_person_registry_rechecked!==false)
      throw Error("B024_RANK_SOURCE_ID_OR_REVIEW_INTEGRITY_FAILED");
    for(const id of videos){
      if(allVideos.has(id))throw Error("B024_RANK_ORIGINAL_VIDEO_ID_DOUBLE_ASSIGNED");
      allVideos.add(id);
    }
    const existing=row.registration_screen_status;
    statusCount[existing]=(statusCount[existing]||0)+1;
    const nameKey=identityKey(label);
    let disposition;
    if(STALE_REGISTRATION_SCREENS.has(existing))
      disposition="PRIOR_REGISTERED_OR_LIVING_POSITIVE_EXCLUDED";
    else if(PREVIOUS_HOLDS.has(existing))
      disposition="AMBIGUOUS_IDENTITY_HOLD";
    else if(!PREVIOUS_OPEN.has(existing))
      throw Error("B024_RANK_UNRECOGNIZED_REGISTRY_SCREEN_STATUS");
    else if(exactNonperson.has(nameKey)||reviewedNonPerson(label))
      disposition="REVIEWED_NON_PERSON_EXCLUDED";
    else if(reviewedLivingStatus(label,date))
      disposition="REVIEWED_CURRENT_LIVING_EXCLUDED";
    else if(surnameHolds.has(nameKey))
      disposition="SURNAME_OR_HOMONYM_HOLD";
    else disposition="PROVISIONAL_PERSON_TOPIC_TITLE_REVIEW";
    const rowInfo={
      raw_name:label,
      canonical_historically_reviewed_name:canonicalByName.get(nameKey)||null,
      original_video_ids:videos,
      original_channel_ids:channels,
      distinct_original_channels:channels.length,
      distinct_original_videos:videos.length,
      example_original_title_and_video_id:row.source_examples?.[0]||null,
      previous_registry_screen:existing,
      candidate_disposition:disposition,
      historical_personhood_previously_reviewed:canonicalByName.has(nameKey),
      verified_media_video_content_count:0,
      presently_unregistered_ATLAS_person_verified:false
    };
    if(disposition==="PROVISIONAL_PERSON_TOPIC_TITLE_REVIEW")open.push(rowInfo);
    else if(disposition.endsWith("_HOLD"))held.push(rowInfo);
    else excluded.push(rowInfo);
  }
  if(enforceRealSource&&allVideos.size!==10706)
    throw Error("B024_RANK_REAL_ORIGINAL_VIDEO_ID_PARITY_FAILED");
  // Only human-reviewed historical aliases may union same-Person Video/Channel IDs.
  const canonicalGroups=new Map();
  for(const row of open){
    const key=row.canonical_historically_reviewed_name ?
      "H:"+row.canonical_historically_reviewed_name : "R:"+row.raw_name;
    if(!canonicalGroups.has(key))canonicalGroups.set(key,[]);
    canonicalGroups.get(key).push(row);
  }
  const ranked=[];
  for(const records of canonicalGroups.values()){
    const video=new Set(records.flatMap(x=>x.original_video_ids));
    const channel=new Set(records.flatMap(x=>x.original_channel_ids));
    const reviewedName=records[0].canonical_historically_reviewed_name;
    ranked.push({
      review_name:reviewedName||records[0].raw_name,
      source_names:records.map(x=>x.raw_name).sort(),
      original_distinct_channels:channel.size,
      original_distinct_videos:video.size,
      original_channel_ids:[...channel].sort(),
      original_video_ids:[...video].sort(),
      sample_original_title_and_video_id:records.flatMap(x=>x.example_original_title_and_video_id?
        [x.example_original_title_and_video_id]:[]).slice(0,3),
      reviewed_historical_identity_prior_2145_person_screen:Boolean(reviewedName),
      current_all_persons_and_aliases_screen_passed:false,
      independently_watched_video_count:0,
      ranking_evidence:"ORIGINAL_VIDEO_ID_STRONG_BIOGRAPHICAL_TITLE_ONLY",
      min_3_channels_review_threshold_met:channel.size>=3,
      publication_eligibility:"NOT_AUTHORIZED_CURRENT_IDENTITY_AND_MEDIA_CONTENT_PENDING"
    });
  }
  ranked.sort((a,b)=>b.original_distinct_channels-a.original_distinct_channels ||
    b.original_distinct_videos-a.original_distinct_videos ||
    a.review_name.localeCompare(b.review_name,"en"));
  ranked.forEach((r,i)=>r.provisional_review_priority=i+1);
  const counters={};
  for(const n of [1,2,3,5,10,20])
    counters[n]=ranked.filter(x=>x.original_distinct_channels>=n).length;
  return {
    schema:OUTPUT_SCHEMA,
    objective:"EXISTING_ONE_ATLAS_UNREGISTERED_HISTORICAL_PERSON_RANKING",
    evidence_type:"REVIEW_ONLY_ORIGINAL_SOURCE_VIDEO_TITLE_CUES_NOT_PLAYBACK",
    source_archive_sha256:SOURCE_SHA,
    input_original_video_ids_scanned_previously:10706,
    source_labels_processed:validLabels.size,
    positive_registered_living_and_nonperson_excluded:excluded.length,
    additional_exact_living_nonperson_exclusions:excluded.filter(x=>x.candidate_disposition==="REVIEWED_NON_PERSON_EXCLUDED"||
      x.candidate_disposition==="REVIEWED_CURRENT_LIVING_EXCLUDED").length,
    ambiguous_held:held.length,
    provisional_identity_groups:ranked.length,
    independently_reviewed_historical_groups_in_provisional_rank:ranked.filter(x=>x.reviewed_historical_identity_prior_2145_person_screen).length,
    channel_threshold_groups:counters,
    screened_current_complete_ATLAS_registration_list:false,
    currently_confirmed_unregistered_historical_persons:0,
    actually_watched_person_biography_videos:0,
    new_youtube_videos_fetched:0,
    official_production_rank_updated:false,
    source_title_rows_not_reprocessed:true,
    status_counters:statusCount,
    ranked_provisional_all_identities:ranked,
    excluded_source_labels:excluded.map(x=>({name:x.raw_name,
      reason:x.candidate_disposition,previous_registry_screen:x.previous_registry_screen})),
    identity_holds:held.map(x=>({name:x.raw_name,reason:x.candidate_disposition,
      original_channels:x.distinct_original_channels,original_videos:x.distinct_original_videos}))
  };
}
if(require.main===module){
  const args=process.argv.slice(2);
  if(args.length!==2){console.error("usage: node scripts/youtube-b024-rank-all-existing-source-candidates.cjs <prior-source-json> <out-json>");process.exit(2)}
  const result=build(JSON.parse(fs.readFileSync(args[0],"utf8")));
  const written=JSON.stringify(result);
  fs.mkdirSync(path.dirname(args[1]),{recursive:true});
  fs.writeFileSync(args[1],written+"\n");
  console.log(JSON.stringify({
    provisional_identity_groups:result.provisional_identity_groups,
    channel_threshold_groups:result.channel_threshold_groups,
    positive_registered_living_and_nonperson_excluded:result.positive_registered_living_and_nonperson_excluded,
    additional_exact_living_nonperson_exclusions:result.additional_exact_living_nonperson_exclusions,
    ambiguous_held:result.ambiguous_held,
    source_labels_processed:result.source_labels_processed,
    input_original_video_ids:result.input_original_video_ids_scanned_previously,
    sha256:crypto.createHash("sha256").update(written+"\n").digest("hex")
  }));
  for(const row of result.ranked_provisional_all_identities.slice(0,35))
    console.log(JSON.stringify({review_priority:row.provisional_review_priority,
      name:row.review_name,channels:row.original_distinct_channels,videos:row.original_distinct_videos,
      reviewed_historical:row.reviewed_historical_identity_prior_2145_person_screen,
      sample_video:row.sample_original_title_and_video_id[0]?.video_id||null}));
}
module.exports={build,OUTPUT_SCHEMA};
