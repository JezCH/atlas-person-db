"use strict";

// YouTube signals exist to discover UNREGISTERED historical persons.
// Match live registered identities before ranking. Never add counts from
// already-aggregated raw names (original Channel IDs are required for unions).
const {
  GLOBAL_SNAPSHOT_SQL,integerOption,projectSnapshot,projectSignal
}=require("./atlas-youtube-person-signal-read-service.js");
const {reviewedPersonAliasesValuesSql}=require("./atlas-reviewed-person-registration-aliases.js");
const {reviewedLivingStatus}=require("./atlas-youtube-reviewed-living-people.js");
const QUALITY_RULES=require("../scripts/youtube-person-signal-quality-rules.v2.json");
const REVIEWED_SOURCE_UNIONS=require("../audits/youtube-discovery-reviewed-source-unions-b024.json");
const REVIEWED_V5_NONPERSON=require("../audits/youtube-v5-source-nonperson-exact-labels.json");
if(REVIEWED_V5_NONPERSON.schema!=="atlas-youtube-v5-source-review-non-person-labels/v1"||
   REVIEWED_V5_NONPERSON.reviewed_labels.length!==23)
  throw Error("YOUTUBE_V5_REVIEWED_SOURCE_LABEL_MANIFEST_INVALID");


const DISCOVERY_SCHEMA="atlas-youtube-unregistered-discovery/v1";
const CANDIDATE_ROWS_SQL=[
  "select raw_name,rank,distinct_channel_count,video_count",
  "from atlas_v2.youtube_person_signals",
  "where snapshot_id=$1 and distinct_channel_count>=3 order by rank,raw_name"
].join(" ");
const PERSON_NAMES_SQL=[
  "select p.id::text as person_id,p.canonical_key as alias_name from atlas_v2.persons p",
  "union all select pn.person_id::text,pn.name as alias_name from atlas_v2.person_names pn",
  "union all select p.id::text,aliases.alias_name from (",
  reviewedPersonAliasesValuesSql(),
  ") as aliases(alias_name,canonical_key)",
  "join atlas_v2.persons p on p.canonical_key=aliases.canonical_key",
  // Reviewed canonical keys can also appear as a Person name rather than
  // p.canonical_key; a multi-Person collision remains ambiguous.
  "union all select pn.person_id::text,aliases.alias_name from (",
  reviewedPersonAliasesValuesSql(),
  ") as aliases(alias_name,canonical_key)",
  "join atlas_v2.person_names pn on pn.name=aliases.canonical_key"
].join(" ");
const CHANNEL_THRESHOLDS=Object.freeze([3,5,10,15,20]);
const EXTRA_REVIEWED_NONPERSON=Object.freeze([
  "Full",
  "Discussion",
  "The Bermuda Triangle",
  "Bermuda Triangle",
  "The Medici",
  "Mars",
  "The Epic of Gilgamesh",
  "Full Speech",
  "Clip",
  "First Look",
  "Recap",
  "Just in",
  "Debunked",
  "The Antikythera Mechanism",
  "The Lost Colony of Roanoke",
  "The Fall of the Berlin Wall",
  "The Sumerians",
  "Unit 731",
  "Keynote Address",
  "Travel to Dubai",
  "Buddhism",
  "Christianity",
  "Greek Fire",
  "Antisemitism",
  "Anti-Semitism",
  "Ragnarok",
  "Ragnarök",
  "International Women's Day",
  "International Women’s Day",
  "Al-Andalus",
  "Al Andalus",
  "Gobekli Tepe",
  "Göbeklitepe",
  "Israel-Palestine Conflict",
  "Israel Palestine Conflict",
  "Conference",
  "Conférence",
  "Hercules",
  "HÉRCULES",
  "Moby Dick",
  "Moby-Dick",
  "Quran",
  "Qur'an",
  "Mohenjo Daro",
  "Mohenjo-daro",
  "Tutankhamun's Tomb",
  "Tutankhamun’s Tomb",
  "Custer's Last Stand",
  "Custer’s Last Stand",
  "Paris"
]);
const REVIEWED_UNRESOLVED_SURNAMES=Object.freeze(["Picasso","Dostoevsky","Schopenhauer","Chopin","Tchaikovsky","Diana"]);


function identityKey(value) {
  return String(value??"").normalize("NFKD").toLowerCase()
    .replaceAll("æ","ae").replaceAll("œ","oe").replaceAll("ß","ss")
    .replace(/[\u0300-\u036f]/g,"").normalize("NFC")
    .replace(/[^\p{L}\p{N}]+/gu,"");
}
const REVIEWED_NONPERSON_KEYS=new Set([
  ...QUALITY_RULES.non_person_exact,
  ...QUALITY_RULES.nonhistorical_person_exact,
  ...EXTRA_REVIEWED_NONPERSON
].map(identityKey));
const UNRESOLVED_SURNAME_KEYS=new Set([
  ...QUALITY_RULES.do_not_infer_surname_identity,
  ...REVIEWED_UNRESOLVED_SURNAMES
].map(identityKey));
function reviewedNonPerson(name){return REVIEWED_NONPERSON_KEYS.has(identityKey(name));}
const REVIEWED_V5_NONPERSON_KEYS=new Set(REVIEWED_V5_NONPERSON.reviewed_labels.map(x=>identityKey(x.name)));
if(REVIEWED_V5_NONPERSON_KEYS.size!==REVIEWED_V5_NONPERSON.reviewed_labels.length)
  throw Error("YOUTUBE_V5_REVIEWED_SOURCE_LABEL_COLLISION");
function reviewedV5NonPersonForSnapshot(snapshot){
  if(snapshot?.snapshot_id!==REVIEWED_V5_NONPERSON.active_snapshot_id) return new Set();
  const expected="sha256:"+REVIEWED_V5_NONPERSON.source_archive_sha256;
  if(snapshot.parser_version!==REVIEWED_V5_NONPERSON.parser_version||
     snapshot.source_state?.artifact_digest!==expected||
     snapshot.channel_count!==REVIEWED_V5_NONPERSON.source_channels||
     snapshot.video_count!==REVIEWED_V5_NONPERSON.source_videos)
    throw Error("YOUTUBE_V5_REVIEWED_SOURCE_SNAPSHOT_PARITY_MISMATCH");
  return REVIEWED_V5_NONPERSON_KEYS;
}



function originalLabelKey(value) {
  return String(value??"").normalize("NFKC").toLowerCase().trim();
}

/**
 * Substitute only the original Channel-ID/Video-ID union that has been reviewed
 * for a *specific* cumulative source snapshot. Raw source rows are immutable.
 *
 * No fuzzy matching, no count summation, no registered Person UUID leaderboard.
 * A missing/mismatched label on the same snapshot is a hard provenance failure.
 */
function applyReviewedSourceUnions(rawRows,approvedGroups=[]) {
  if(!approvedGroups.length) return {rows:rawRows,applied:0};
  const byLabel=new Map();
  for(const row of rawRows) {
    const key=originalLabelKey(row.raw_name);
    if(byLabel.has(key)) throw Error("YOUTUBE_DISCOVERY_REVIEWED_DUPLICATE_SOURCE_LABEL");
    byLabel.set(key,row);
  }
  const used=new Set(),synthetic=[];
  for(const group of approvedGroups) {
    const aliases=group.aliases;
    if(!Array.isArray(aliases)||aliases.length<2||
      typeof group.canonical_name!=="string")throw Error("YOUTUBE_DISCOVERY_REVIEWED_UNION_INVALID");
    const keys=aliases.map(a=>originalLabelKey(a.name));
    if(new Set(keys).size!==keys.length||keys.some(key=>used.has(key)))
      throw Error("YOUTUBE_DISCOVERY_REVIEWED_ALIAS_COLLISION");
    const rows=keys.map(key=>byLabel.get(key));
    if(rows.some(row=>!row))throw Error("YOUTUBE_DISCOVERY_REVIEWED_SOURCE_LABEL_MISSING");
    for(let i=0;i<aliases.length;i++) {
      if(Number(rows[i].distinct_channel_count)!==Number(aliases[i].distinct_channel_count)||
         Number(rows[i].video_count)!==Number(aliases[i].video_count))
        throw Error("YOUTUBE_DISCOVERY_REVIEWED_SOURCE_COUNT_MISMATCH");
    }
    const channelCount=Number(group.distinct_channel_count);
    const videoCount=Number(group.video_count);
    if(!Number.isSafeInteger(channelCount)||!Number.isSafeInteger(videoCount)||
       channelCount<=0||videoCount<=0||
       channelCount<Math.max(...rows.map(r=>Number(r.distinct_channel_count)))||
       channelCount>rows.reduce((v,r)=>v+Number(r.distinct_channel_count),0)||
       videoCount<Math.max(...rows.map(r=>Number(r.video_count)))||
       videoCount>rows.reduce((v,r)=>v+Number(r.video_count),0))
      throw Error("YOUTUBE_DISCOVERY_REVIEWED_UNION_COUNT_INVALID");
    for(const key of keys) used.add(key);
    synthetic.push({
      raw_name:group.canonical_name,
      distinct_channel_count:channelCount,video_count:videoCount,
      rank:Math.min(...rows.map(r=>Number(r.rank))),
      reviewed_source_labels:aliases.map(a=>a.name),
      source_id_union_verified:true,
      union_video_ids_sha256:group.union_video_ids_sha256
    });
  }
  return {rows:rawRows.filter(r=>!used.has(originalLabelKey(r.raw_name))).concat(synthetic),
          applied:synthetic.length};
}

function registrationIndex(rows) {
  if(!Array.isArray(rows))throw Error("YOUTUBE_DISCOVERY_PERSON_REGISTRY_MISSING");
  const index=new Map();
  for(const row of rows) {
    const key=identityKey(row.alias_name),id=String(row.person_id||"").trim();
    if(!key||!id)continue;
    if(!index.has(key))index.set(key,new Set());
    index.get(key).add(id);
  }
  return index;
}
function candidatesFromSource(rawRows,personRows,{now=Date.now(),approvedUnions=[],reviewedSourceNonPersonKeys=new Set()}={}) {
  if(!Array.isArray(personRows)||!personRows.length)
    throw Error("YOUTUBE_DISCOVERY_PERSON_REGISTRY_EMPTY");
  const registered=registrationIndex(personRows);
  const reviewed=applyReviewedSourceUnions(rawRows,approvedUnions);
  const grouped=new Map();
  let registeredExcluded=0,reviewedLivingExcluded=0,nonpersonExcluded=0,sourceNonpersonExcluded=0,homonymReview=0,overlappingRawLabels=0;
  for(const row of reviewed.rows) {
    const signal=projectSignal(row),key=identityKey(signal.raw_name);
    if(!key)throw Error("YOUTUBE_DISCOVERY_MISSING_RAW_IDENTITY");
    // A newly registered full name must also suppress its reviewed short
    // variants; the union's aliases are all checked before deciding.
    const matchIds=new Set();
    for(const name of [signal.raw_name,...(row.reviewed_source_labels||[])]) {
      for(const id of registered.get(identityKey(name))||[]) matchIds.add(id);
    }
    const matches=matchIds; 
    if(matches.size===1){registeredExcluded++;continue;}
    if(reviewedNonPerson(signal.raw_name) || reviewedSourceNonPersonKeys.has(key)) {
      nonpersonExcluded++;
      if(reviewedSourceNonPersonKeys.has(key)) sourceNonpersonExcluded++;
      continue;
    }
    if(reviewedLivingStatus(signal.raw_name,now)?.status==="living_likely") {
      reviewedLivingExcluded++;
      continue;
    }
    const ambiguous=matches.size>1;
    if(ambiguous)homonymReview++;
    const previous=grouped.get(key);
    if(previous) {
      // Raw aggregates do NOT retain Channel IDs; summing them would inflate
      // counts. Show a defensible lower bound until source-ID reaggregation.
      overlappingRawLabels++;
      previous.source_labels.push(signal.raw_name);
      if(signal.distinct_channel_count>previous.distinct_channel_count||
         (signal.distinct_channel_count===previous.distinct_channel_count&&
          signal.video_count>previous.video_count)) {
        previous.raw_name=signal.raw_name;
        previous.distinct_channel_count=signal.distinct_channel_count;
        previous.video_count=signal.video_count;
      }
      previous.identity_state=ambiguous||previous.identity_state==="registered_homonym_review"
        ?"registered_homonym_review":"alias_union_needs_original_ids";
      previous.count_lower_bound=true;
      continue;
    }
    grouped.set(key,{
      raw_name:signal.raw_name,rank:0,
      distinct_channel_count:signal.distinct_channel_count,
      video_count:signal.video_count,
      identity_state:ambiguous?"registered_homonym_review":
        UNRESOLVED_SURNAME_KEYS.has(key)?"short_name_identity_review":"unregistered_candidate",
      registration_match_count:matches.size,
      count_lower_bound:false,source_labels:row.reviewed_source_labels||[signal.raw_name],
      source_id_union_verified:row.source_id_union_verified===true,
      union_video_ids_sha256:row.union_video_ids_sha256||null
    });
  }
  const candidates=[...grouped.values()];
  candidates.sort((a,b)=>b.distinct_channel_count-a.distinct_channel_count||
    b.video_count-a.video_count||a.raw_name.localeCompare(b.raw_name,"en"));
  for(let i=0;i<candidates.length;i++) candidates[i].rank=i+1;
  return {candidates,registeredExcluded,reviewedLivingExcluded,nonpersonExcluded,sourceNonpersonExcluded,homonymReview,overlappingRawLabels,reviewedUnionsApplied:reviewed.applied};
}
async function readYoutubeUnregisteredDiscovery({client,minChannels=3,limit=300,offset=0}={}) {
  if(!client||typeof client.query!=="function")throw Error("YOUTUBE_DISCOVERY_DB_REQUIRED");
  const threshold=integerOption(minChannels,3,{min:3,max:1000});
  const pageSize=integerOption(limit,300,{min:1,max:1000});
  const pageOffset=integerOption(offset,0,{min:0,max:100000});
  const initial=projectSnapshot((await client.query(GLOBAL_SNAPSHOT_SQL)).rows?.[0]);
  if(!initial)return {
    schema:DISCOVERY_SCHEMA,available:false,snapshot:null,min_channels:threshold,
    available_count:0,stored_count:0,threshold_counts:{},rows:[]
  };
  const [signals,people]=await Promise.all([
    client.query(CANDIDATE_ROWS_SQL,[initial.snapshot_id]),
    client.query(PERSON_NAMES_SQL)
  ]);
  const reviewedGroups=initial.snapshot_id===REVIEWED_SOURCE_UNIONS.source_snapshot_id
    ?REVIEWED_SOURCE_UNIONS.approved_groups
    :initial.parser_version==="yt-title-person-reviewed-v5" &&
      initial.source_state?.source_name_generation_independent_of_registered_persons===true &&
      initial.source_state?.reviewed_source_unions_nameform_only_not_biography===true &&
      Array.isArray(initial.source_state?.reviewed_source_unions)
        ?initial.source_state.reviewed_source_unions:[];
  const reviewedSourceNonPersonKeys=reviewedV5NonPersonForSnapshot(initial);
  const {candidates,registeredExcluded,reviewedLivingExcluded,nonpersonExcluded,sourceNonpersonExcluded,homonymReview,overlappingRawLabels,reviewedUnionsApplied}=
    candidatesFromSource(signals.rows||[],people.rows||[],{
      approvedUnions:reviewedGroups,reviewedSourceNonPersonKeys
    });
  const final=projectSnapshot((await client.query(GLOBAL_SNAPSHOT_SQL)).rows?.[0]);
  if(!final||final.snapshot_id!==initial.snapshot_id)
    throw Error("YOUTUBE_DISCOVERY_SNAPSHOT_CHANGED");
  const counts={};
  for(const n of CHANNEL_THRESHOLDS)
    counts[String(n)]=candidates.reduce((sum,row)=>sum+(row.distinct_channel_count>=n?1:0),0);
  const selected=candidates.filter(row=>row.distinct_channel_count>=threshold);
  return {
    schema:DISCOVERY_SCHEMA,available:true,snapshot:final,
    purpose:"unregistered_historical_person_discovery",
    population:"original_channel_id_cumulative_title_candidates",
    identity_rule:"unique_exact_registered_match_excluded_ambiguous_reviewed",
    registration_checked:true,registered_excluded_count:registeredExcluded,
    reviewed_living_excluded_count:reviewedLivingExcluded,
    reviewed_nonperson_excluded_count:nonpersonExcluded,
    reviewed_original_source_nonperson_excluded_count:sourceNonpersonExcluded,
    homonym_review_count:homonymReview,overlapping_raw_labels:overlappingRawLabels,
    reviewed_source_id_unions_applied:reviewedUnionsApplied,
    title_context_source_included:initial.source_state?.additional_title_context_extraction===true,
    video_person_centeredness_certified:false,
    ranking_evidence_note:"Original title name/topic cues are source-backed review candidates, not certified Person-centered video evidence.",
    dedup_policy:"source_id_verified_reviewed_unions_plus_unknown_alias_lower_bounds",
    min_channels:threshold,offset:pageOffset,
    available_count:selected.length,stored_count:selected.length,
    threshold_counts:counts,rows:selected.slice(pageOffset,pageOffset+pageSize)
  };
}
module.exports=Object.freeze({
  DISCOVERY_SCHEMA,CANDIDATE_ROWS_SQL,PERSON_NAMES_SQL,CHANNEL_THRESHOLDS,
  identityKey,reviewedNonPerson,reviewedV5NonPersonForSnapshot,registrationIndex,applyReviewedSourceUnions,candidatesFromSource,readYoutubeUnregisteredDiscovery
});
