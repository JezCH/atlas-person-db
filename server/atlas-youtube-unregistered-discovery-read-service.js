"use strict";

// YouTube signals exist to discover UNREGISTERED historical persons.
// Match live registered identities before ranking. Never add counts from
// already-aggregated raw names (original Channel IDs are required for unions).
const {
  GLOBAL_SNAPSHOT_SQL,integerOption,projectSnapshot,projectSignal
}=require("./atlas-youtube-person-signal-read-service.js");
const {reviewedPersonAliasesValuesSql}=require("./atlas-reviewed-person-registration-aliases.js");

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
  "join atlas_v2.persons p on p.canonical_key=aliases.canonical_key"
].join(" ");
const CHANNEL_THRESHOLDS=Object.freeze([3,5,10,15,20]);

function identityKey(value) {
  return String(value??"").normalize("NFKD").toLowerCase()
    .replaceAll("æ","ae").replaceAll("œ","oe").replaceAll("ß","ss")
    .replace(/[\u0300-\u036f]/g,"").normalize("NFC")
    .replace(/[^\p{L}\p{N}]+/gu,"");
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
function candidatesFromSource(rawRows,personRows) {
  const registered=registrationIndex(personRows);
  const candidates=[],seenRaw=new Set();
  let registeredExcluded=0,homonymReview=0;
  for(const row of rawRows) {
    const signal=projectSignal(row),key=identityKey(signal.raw_name);
    if(!key||seenRaw.has(key))throw Error("YOUTUBE_DISCOVERY_DUPLICATE_RAW_IDENTITY");
    seenRaw.add(key);
    const matches=registered.get(key);
    if(matches?.size===1){registeredExcluded++;continue;}
    const ambiguous=(matches?.size||0)>1;
    if(ambiguous)homonymReview++;
    candidates.push({
      raw_name:signal.raw_name,rank:0,
      distinct_channel_count:signal.distinct_channel_count,
      video_count:signal.video_count,
      identity_state:ambiguous?"registered_homonym_review":"unregistered_candidate",
      registration_match_count:matches?.size||0
    });
  }
  candidates.sort((a,b)=>b.distinct_channel_count-a.distinct_channel_count||
    b.video_count-a.video_count||a.raw_name.localeCompare(b.raw_name,"en"));
  for(let i=0;i<candidates.length;i++) candidates[i].rank=i+1;
  return {candidates,registeredExcluded,homonymReview};
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
  const {candidates,registeredExcluded,homonymReview}=
    candidatesFromSource(signals.rows||[],people.rows||[]);
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
    homonym_review_count:homonymReview,
    dedup_policy:"reviewed_extraction_aliases_only_never_sum_aggregates",
    min_channels:threshold,offset:pageOffset,
    available_count:selected.length,stored_count:selected.length,
    threshold_counts:counts,rows:selected.slice(pageOffset,pageOffset+pageSize)
  };
}
module.exports=Object.freeze({
  DISCOVERY_SCHEMA,CANDIDATE_ROWS_SQL,PERSON_NAMES_SQL,CHANNEL_THRESHOLDS,
  identityKey,registrationIndex,candidatesFromSource,readYoutubeUnregisteredDiscovery
});
