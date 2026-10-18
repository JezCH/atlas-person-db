#!/usr/bin/env node
"use strict";
// OFFLINE only. The input MUST be produced by the Python original-video
// content gate, not by the existing atlas_v2.youtube_person_signals title rank.
// Output is a read-only, NON-PUBLISHABLE verified-video preview. The input
// Person registry needs a separately witnessed current Production read.
const fs=require("node:fs");
const path=require("node:path");
const {reviewedNonPerson,identityKey}=require("../server/atlas-youtube-unregistered-discovery-read-service.js");
const {reviewedLivingStatus}=require("../server/atlas-youtube-reviewed-living-people.js");
const {REVIEWED_REGISTRATION_ALIASES}=require("../server/atlas-reviewed-person-registration-aliases.js");

const SOURCE_SHA="8f3ca335012fe82c94848f63b9126b1aeec7b48c935b403605dd7752ce713946";
const VIDEO=/^[A-Za-z0-9_-]{11}$/;
const CHANNEL=/^UC[A-Za-z0-9_-]{22}$/;
const REVIEWS=new Set(["VIDEO_PLAYBACK_MANUAL","TIMESTAMPED_TRANSCRIPT"]);
const HOLD_REASONS=new Set([
 "FATHER_SON_SHARED_NAME","MULTIPLE_SAINTS_WITH_SAME_NAME",
 "PERSON_HOLIDAY_CATHEDRAL_AMBIGUITY","CONTESTED_SAINT_IDENTITY_HOLIDAY"
]);

function asArray(value,name){if(!Array.isArray(value))throw Error(name);return value;}
function normal(v){return identityKey(v);}
function verifyHolds(manifest){
 if(!manifest||manifest.schema!=="atlas-youtube-v5-known-original-source-identity-holds/v1"||
    manifest.source_review_zip_sha256!==SOURCE_SHA||
    manifest.original_channel_count!==10127||manifest.original_video_count!==2230031||
    manifest.not_an_unregistered_person_certification!==true||
    !Array.isArray(manifest.holds)||manifest.holds.length!==4)
   throw Error("VIDEO_RANK_IDENTITY_HOLD_MANIFEST_INVALID");
 const holds=new Map();
 for(const row of manifest.holds){
   const key=normal(row.raw_name);
   if(!key||holds.has(key)||!HOLD_REASONS.has(row.reason)||
     row.source_review_status!=="IDENTITY_CONTEXT_HOLD"||
     row.person_identity_certified!==false)
     throw Error("VIDEO_RANK_REVIEWED_IDENTITY_HOLD_INVALID");
   holds.set(key,row.reason);
 }
 return holds;
}
function validateContentGate(gate){
 if(!gate||gate.schema!=="atlas-youtube-content-verified-original-id-candidate-gate/v1"||
    gate.source_zip_sha256!==SOURCE_SHA||
    gate.registered_person_exclusion_completed!==false||
    gate.production_ranking_publishable!==false||
    !Number.isSafeInteger(gate.original_requested_video_ids)||
    !Number.isSafeInteger(gate.actual_metadata_video_ids)||
    !Number.isSafeInteger(gate.explicit_content_review_decisions)||
    !Number.isSafeInteger(gate.person_centered_video_ids_verified)||
    gate.person_centered_video_ids_verified<0||
    gate.actual_metadata_video_ids>gate.original_requested_video_ids||
    gate.explicit_content_review_decisions>gate.original_requested_video_ids)
  throw Error("VIDEO_RANK_UNTRUSTED_CONTENT_GATE");
 const usedVideo=new Map(),names=new Set(),aliasOwners=new Map();
 const rows=[];
 for(const person of asArray(gate.people,"VIDEO_RANK_CONTENT_GATE_PEOPLE_MISSING")){
   const label=person?.person_identity_for_review;
   const key=normal(label);
   if(!key||names.has(key))throw Error("VIDEO_RANK_DUPLICATE_PERSON_IDENTITY");
   names.add(key);
   const aliases=asArray(person.reviewed_source_name_forms,"VIDEO_RANK_SOURCE_ALIASES_MISSING");
   // An original raw alias may equal its approved canonical display name,
   // but two entries in the SAME reviewed alias list are never acceptable.
   const normalizedAliases=new Set();
   for(const alias of aliases){
     const a=normal(alias);
     if(!a||normalizedAliases.has(a))
       throw Error("VIDEO_RANK_DUPLICATE_OR_INVALID_IDENTITY_ALIAS");
     normalizedAliases.add(a);
   }
   for(const alias of [label,...aliases]){
     const normalized=normal(alias);
     if(aliasOwners.has(normalized)&&aliasOwners.get(normalized)!==key)
       throw Error("VIDEO_RANK_ORIGINAL_ALIAS_ASSIGNED_TO_MULTIPLE_IDENTITIES");
     aliasOwners.set(normalized,key);
   }
   const channels=asArray(person.original_channel_ids,"VIDEO_RANK_VERIFIED_CHANNEL_IDS_MISSING");
   const videos=asArray(person.original_video_ids,"VIDEO_RANK_VERIFIED_VIDEO_IDS_MISSING");
   const reviews=asArray(person.content_review_provenance,"VIDEO_RANK_CONTENT_REVIEW_PROVENANCE_MISSING");
   if(channels.length!==new Set(channels).size||
      videos.length!==new Set(videos).size||
      channels.some(c=>typeof c!=="string"||!CHANNEL.test(c))||
      videos.some(v=>typeof v!=="string"||!VIDEO.test(v))||
      channels.length!==person.distinct_content_verified_channels||
      videos.length!==person.distinct_content_verified_videos||
      reviews.length!==videos.length||
      channels.length>videos.length)
     throw Error("VIDEO_RANK_ORIGINAL_ID_CARDINALITY_MISMATCH");
   const videoSet=new Set(videos),channelSet=new Set(channels);
   const reviewedVideoIds=new Set(),sourceChannels=new Set();
   for(const review of reviews) {
     const v=review?.video_id,c=review?.channel_id;
     if(!videoSet.has(v)||!channelSet.has(c)||reviewedVideoIds.has(v)||
        !REVIEWS.has(review.evidence_method)||
        typeof review.reviewer!=="string"||review.reviewer.trim().length<3||
        !review.content_segment||
        !Number.isFinite(review.content_segment.start_seconds)||
        !Number.isFinite(review.content_segment.end_seconds)||
        review.content_segment.start_seconds<0||
        review.content_segment.end_seconds-review.content_segment.start_seconds<10)
       throw Error("VIDEO_RANK_UNSUPPORTED_OR_DUPLICATE_CONTENT_REVIEW");
     if(review.evidence_method==="TIMESTAMPED_TRANSCRIPT" &&
        (!/^[a-f0-9]{64}$/.test(review.transcript_evidence_sha256||"")||
         !["YOUTUBE_CAPTION_TRACK","MANUAL_VIDEO_PLAYBACK_TRANSCRIPTION"]
          .includes(review.transcript_capture_method)||
         typeof review.transcript_captured_at!=="string"||
         !Number.isFinite(Date.parse(review.transcript_captured_at))||
         typeof review.transcript_caption_language!=="string"||
         review.transcript_caption_language.length<2))
       throw Error("VIDEO_RANK_TRANSCRIPT_ACTUAL_BYTES_PROVENANCE_REQUIRED");
     if(usedVideo.has(v))
       throw Error("VIDEO_RANK_SAME_ORIGINAL_VIDEO_CREDITED_TO_TWO_PEOPLE");
     usedVideo.set(v,label);
     reviewedVideoIds.add(v);
     sourceChannels.add(c);
   }
   if(reviewedVideoIds.size!==videoSet.size||sourceChannels.size!==channelSet.size||
      person.final_registered_person_exclusion_pending!==true)
      throw Error("VIDEO_RANK_UNVERIFIED_CHANNEL_OR_FINAL_SCREEN");
   rows.push({raw_name:label,reviewed_aliases:aliases,
     original_channel_ids:[...channelSet].sort(),
     original_video_ids:[...videoSet].sort(),
     distinct_content_verified_channels:channelSet.size,
     distinct_content_verified_videos:videoSet.size,
     original_content_reviews:reviews});
 }
 if(usedVideo.size!==gate.person_centered_video_ids_verified)
   throw Error("VIDEO_RANK_GLOBAL_VERIFIED_VIDEO_SET_MISMATCH");
 return rows;
}

function validatePersonRegistry(data){
 if(!data||data.ok!==true||data.mode!=="list"||data.projection!=="identity"||
    !Array.isArray(data.persons)||data.persons.length<2000)
   throw Error("VIDEO_RANK_PERSON_REGISTRY_INCOMPLETE_FAIL_CLOSED");
 const ids=new Set(),byName=new Map(),canonical=new Map();
 function add(name,id) {
   const k=normal(name);if(!k)return;
   if(!byName.has(k))byName.set(k,new Set());
   byName.get(k).add(id);
 }
 for(const row of data.persons){
   const id=String(row?.id||"").trim();
   if(!id||ids.has(id))throw Error("VIDEO_RANK_PERSON_REGISTRY_DUPLICATE_OR_MISSING_UUID");
   ids.add(id);
   const names=[row.canonical_key,row.canonical_name_en,row.preferred_name_ko,row.display_name,
     ...(Array.isArray(row.names)?row.names.map(x=>typeof x==="string"?x:x?.name):[])];
   if(!names.some(x=>typeof x==="string"&&x.trim()))
     throw Error("VIDEO_RANK_PERSON_REGISTRY_PERSON_WITHOUT_NAME");
   for(const name of names)add(name,id);
   if(row.canonical_key){
     const k=normal(row.canonical_key);
     if(!canonical.has(k))canonical.set(k,new Set());
     canonical.get(k).add(id);
   }
 }
 for(const {alias_name,canonical_key} of REVIEWED_REGISTRATION_ALIASES){
   if(!alias_name||!canonical_key)throw Error("VIDEO_RANK_REVIEWED_REGISTERED_ALIAS_INVALID");
   // An alias may refer to an existing canonical key or an exact current
   // Person name. If the bridge no longer resolves, do not claim unregistered.
   const ref=new Set([...(canonical.get(normal(canonical_key))||[]),
                      ...(byName.get(normal(canonical_key))||[])]);
   if(!ref.size) continue; // caller still holds unresolved bridges below
   for(const id of ref)add(alias_name,id);
 }
 return {byName,canonical,count:ids.size};
}

function preview(gate,personExport,holdsManifest,{minimumVerifiedChannels=3}={}){
 if(!Number.isInteger(minimumVerifiedChannels)||minimumVerifiedChannels<3)
   throw Error("VIDEO_RANK_MINIMUM_CERTIFIED_CHANNELS_MUST_BE_THREE");
 // 1. Originate ONLY in actual video-level reviewer output, never raw titles.
 const rows=validateContentGate(gate);
 const holds=verifyHolds(holdsManifest);
 // 2. Independent title/identity eligibility, BEFORE registry screening.
 const eligible=[],holdRows=[],zeroRows=[];
 for(const item of rows){
   if(!item.distinct_content_verified_videos){zeroRows.push(item.raw_name);continue;}
   const keys=new Set([item.raw_name,...item.reviewed_aliases].map(normal));
   const reasons=new Set([...keys].map(x=>holds.get(x)).filter(Boolean));
   if(reasons.size>1)throw Error("VIDEO_RANK_CONFLICTING_REVIEWED_PERSON_HOLDS");
   const h=reasons.values().next().value;
   if(h){holdRows.push({raw_name:item.raw_name,reason:h,verified_channels:item.distinct_content_verified_channels});continue;}
   if([...keys].some(k=>reviewedNonPerson(k))){
     holdRows.push({raw_name:item.raw_name,reason:"REVIEWED_NONPERSON_SOURCE_NAME",verified_channels:item.distinct_content_verified_channels});continue;
   }
   if([...new Set([item.raw_name,...item.reviewed_aliases])].some(n=>reviewedLivingStatus(n)?.status==="living_likely")){
     holdRows.push({raw_name:item.raw_name,reason:"REVIEWED_LIVING_IDENTITY",verified_channels:item.distinct_content_verified_channels});continue;
   }
   eligible.push(item);
 }
 // 3. Mandatory full Person registry is consulted LAST. No empty or truncated
 // registry may be treated as an empty set of known Persons.
 const registered=validatePersonRegistry(personExport);
 const candidates=[],registeredExcluded=[],belowThreshold=[];
 for(const item of eligible){
   const keys=[...new Set([item.raw_name,...item.reviewed_aliases].map(normal))];
   const matches=new Set();
   for(const k of keys)for(const id of (registered.byName.get(k)||[]))matches.add(id);
   if(matches.size>1){
      holdRows.push({raw_name:item.raw_name,reason:"MULTIPLE_REGISTERED_PERSON_IDS_MATCH",registered_id_count:matches.size,
        verified_channels:item.distinct_content_verified_channels});
      continue;
   }
   if(matches.size===1){registeredExcluded.push(item.raw_name);continue;}
   // Alias bridge from reviewed registered Persons that did NOT resolve in the
   // supplied registry must remain a HOLD, not be newly claimed unregistered.
   const aliasBridges=REVIEWED_REGISTRATION_ALIASES.filter(a=>
     keys.includes(normal(a.alias_name)));
   if(aliasBridges.length){
     const unresolved=aliasBridges.some(a=>
       !registered.byName.has(normal(a.canonical_key))&&
       !registered.canonical.has(normal(a.canonical_key)));
     if(unresolved){
       holdRows.push({raw_name:item.raw_name,reason:"REVIEWED_REGISTERED_ALIAS_UNRESOLVED",
         verified_channels:item.distinct_content_verified_channels});
       continue;
     }
   }
   if(item.distinct_content_verified_channels<minimumVerifiedChannels){
     belowThreshold.push({raw_name:item.raw_name,verified_channels:item.distinct_content_verified_channels});
     continue;
   }
   candidates.push({...item});
 }
 candidates.sort((a,b)=>b.distinct_content_verified_channels-a.distinct_content_verified_channels||
    b.distinct_content_verified_videos-a.distinct_content_verified_videos||
    a.raw_name.localeCompare(b.raw_name,"en"));
 const ranked=candidates.map((c,i)=>({...c,rank:i+1}));
 return {
   schema:"atlas-youtube-verified-content-unregistered-preview/v1",
   source_snapshot_id:gate.source_snapshot_id,source_zip_sha256:SOURCE_SHA,
   provenance:"OFFLINE_REVIEWED_VIDEO_GATE_NOT_TITLE_SIGNAL_TABLE",
   original_content_verified_video_ids:gate.person_centered_video_ids_verified,
   reviewed_content_identity_groups:rows.length,
   current_production_registry_readback_witnessed:false,
   person_registry_input_rows:registered.count,
   registered_person_screen_applied_to_supplied_export:true,
   registered_person_screen_proven_current:false,
   registered_excluded_count:registeredExcluded.length,
   registered_excluded_names:registeredExcluded,
   identity_hold_count:holdRows.length,identity_holds:holdRows,
   below_three_verified_channels_count:belowThreshold.length,
   below_threshold:belowThreshold,
   zero_content_groups_count:zeroRows.length,
   rank_candidate_count:ranked.length,
   threshold_verified_channels:minimumVerifiedChannels,
   rank_candidates:ranked,
   publication_authorized:false,production_writes:0,
   // A separate authorized live-registry readback, human approval, merge,
   // deployment and public acceptance are required for publication.
   registered_person_last_stage_runtime_acceptance_pending:true
 };
}

function main(args){
 const paths={};
 for(let i=0;i<args.length;i+=2){
   if(!["--content-gate","--persons","--identity-holds","--output"].includes(args[i])||
      !args[i+1]||Object.hasOwn(paths,args[i]))
     throw Error("USAGE: --content-gate gate.json --persons complete-identity-export.json --identity-holds reviewed-holds.json --output preview.json");
   paths[args[i]]=args[i+1];
 }
 if(Object.keys(paths).length!==4)throw Error("VIDEO_RANK_PREVIEW_REQUIRED_INPUTS_MISSING");
 const load=key=>JSON.parse(fs.readFileSync(path.resolve(paths[key]),"utf8"));
 const result=preview(load("--content-gate"),load("--persons"),load("--identity-holds"));
 const out=path.resolve(paths["--output"]);
 fs.mkdirSync(path.dirname(out),{recursive:true});
 fs.writeFileSync(out,JSON.stringify(result,null,2)+"\n");
 process.stdout.write(JSON.stringify({schema:result.schema,rank_candidate_count:result.rank_candidate_count,
   registered_excluded_count:result.registered_excluded_count,
   identity_hold_count:result.identity_hold_count,publication_authorized:false})+"\n");
}
if(require.main===module)main(process.argv.slice(2));
module.exports={SOURCE_SHA,verifyHolds,validateContentGate,validatePersonRegistry,preview};
