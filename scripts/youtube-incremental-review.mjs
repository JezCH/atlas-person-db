#!/usr/bin/env node
// Compare a newly reconstructed cumulative YouTube snapshot against the
// immediately preceding Production snapshot. No writes to Person or YouTube DB.
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const BASE=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");

export function nameKey(value) {
  return String(value??"").normalize("NFKD").toLowerCase()
    .replaceAll("æ","ae").replaceAll("œ","oe").replaceAll("ß","ss")
    .replace(/[\u0300-\u036f]/g,"").normalize("NFC")
    .replace(/[^a-z0-9가-힣]/g,"");
}
export function tier(channels) {
  return channels>=10?"P0":channels>=5?"P1":"P2";
}
const TIER_ORDER={P0:0,P1:1,P2:2};
function validateSignals(payload,label) {
  const rows=Array.isArray(payload?.signals)?payload.signals:payload?.rows;
  if(!Array.isArray(rows)||!rows.length)throw Error("YOUTUBE_AUDIT_"+label+"_SIGNALS_INVALID");
  const ids=new Set(),names=new Set();
  for(let i=0;i<rows.length;i++) {
    const s=rows[i];
    if(!Number.isSafeInteger(s.rank)||s.rank!==i+1)throw Error("YOUTUBE_AUDIT_"+label+"_RANK_INVALID");
    if(typeof s.raw_name!=="string"||!s.raw_name.trim()||names.has(s.raw_name))throw Error("YOUTUBE_AUDIT_"+label+"_NAME_INVALID");
    if(!Number.isInteger(s.distinct_channel_count)||s.distinct_channel_count<3||
       !Number.isInteger(s.video_count)||s.video_count<s.distinct_channel_count)
      throw Error("YOUTUBE_AUDIT_"+label+"_COUNTS_INVALID");
    names.add(s.raw_name);
    const key=nameKey(s.raw_name);
    if(!key)throw Error("YOUTUBE_AUDIT_"+label+"_EMPTY_NAME_KEY");
    ids.add(key);
  }
  const snap=payload?.snapshot;
  if(!snap?.snapshot_id)throw Error("YOUTUBE_AUDIT_"+label+"_SNAPSHOT_MISSING");
  const declared=Number(snap?.threshold_counts?.["3"]);
  if(Number.isFinite(declared)&&declared!==rows.length)
    throw Error("YOUTUBE_AUDIT_"+label+"_SNAPSHOT_TOTAL_MISMATCH");
  return {rows,snapshot_id:snap.snapshot_id};
}
function groupByIdentity(rows) {
  const map=new Map();
  for(const item of rows) {
    const key=nameKey(item.raw_name);
    if(!map.has(key))map.set(key,[]);
    map.get(key).push(item);
  }
  return map;
}
function registeredPersonIndex(payload) {
  if(!payload) return new Map();
  if(!Array.isArray(payload.persons)||payload.ok!==true||payload.mode!=="list")
    throw Error("YOUTUBE_AUDIT_PERSON_RUNTIME_INVALID");
  const index=new Map();
  function add(name,id) {
    const key=nameKey(name);
    if(!key||!id)return;
    if(!index.has(key))index.set(key,new Set());
    index.get(key).add(String(id));
  }
  for(const person of payload.persons) {
    if(!person?.id)continue;
    const candidates=[person.canonical_name_en,person.preferred_name_ko,person.display_name,
      ...(Array.isArray(person.names)?person.names.map(x=>x?.name):[])];
    for(const name of candidates)add(name,person.id);
  }
  return index;
}
function reviewedDecisions(raw) {
  const entries=Array.isArray(raw?.decisions)?raw.decisions:[];
  const map=new Map();
  for(const row of entries) {
    const key=nameKey(row.name);
    if(!key||!["NON_INDIVIDUAL","AMBIGUOUS","UNIDENTIFIED","MYTH_FICTION"].includes(row.disposition)
      ||!String(row.reason||"").trim()||!String(row.reviewed_at||"").match(/^\d{4}-\d{2}-\d{2}$/)
      ||map.has(key))throw Error("YOUTUBE_AUDIT_INVALID_REVIEW_DECISION");
    map.set(key,row);
  }
  return map;
}
export function computeIncrementalAudit(current,previous,{
  decisions={decisions:[]},registeredAliases=[],livingNames=[],persons=null,currentAsOf=new Date().toISOString()
}={}) {
  const curr=validateSignals(current,"CURRENT");
  const prev=validateSignals(previous,"PREVIOUS");
  if(curr.snapshot_id===prev.snapshot_id)
    throw Error("YOUTUBE_AUDIT_SAME_SNAPSHOT_ID");
  const old=groupByIdentity(prev.rows),newMap=groupByIdentity(curr.rows);
  const resolved=reviewedDecisions(decisions);
  const registered=new Set(registeredAliases.map(nameKey));
  const personIndex=registeredPersonIndex(persons);
  const living=new Set(livingNames.map(nameKey));
  const queued=[];
  let added=0,reappeared=0,upgraded=0,channelGrowth=0,unchanged=0;
  for(const s of curr.rows) {
    const key=nameKey(s.raw_name),was=old.get(key)||[];
    const past=was.find(x=>x.raw_name===s.raw_name)||was[0];
    const collision=newMap.get(key).length>1||was.length>1;
    const prevChannels=past?.distinct_channel_count??0;
    const change=!past?"NEW":tier(s.distinct_channel_count)!==tier(prevChannels)
      &&TIER_ORDER[tier(s.distinct_channel_count)]<TIER_ORDER[tier(prevChannels)]?"PRIORITY_UP"
      :s.distinct_channel_count>prevChannels?"CHANNEL_GAIN"
      :s.distinct_channel_count<prevChannels?"CHANNEL_LOSS":"UNCHANGED";
    const priorDiff=past?.raw_name!==s.raw_name&&past!==undefined;
    const decision=resolved.get(key);
    const matchedPersonIds=[...(personIndex.get(key)||[])];
    const evidence=decision?.disposition||
      (matchedPersonIds.length?"REGISTERED_PERSON_ID":living.has(key)?"REVIEWED_LIVING_NAME"
        :registered.has(key)?"REVIEWED_PERSON_ALIAS":"UNRESOLVED");
    const needsAttention=(
      evidence==="UNRESOLVED"&&
      (change==="NEW"||change==="PRIORITY_UP"||collision)
    )||priorDiff;
    if(change==="NEW")added++;
    if(change==="PRIORITY_UP")upgraded++;
    if(change==="CHANNEL_GAIN")channelGrowth++;
    if(change==="UNCHANGED")unchanged++;
    if(needsAttention||change!=="UNCHANGED")queued.push({
      identity_key:key,raw_name:s.raw_name,rank:s.rank,
      channels:s.distinct_channel_count,previous_channels:prevChannels,
      videos:s.video_count,delta:change,tier:tier(s.distinct_channel_count),
      disposition:evidence,registered_person_ids:matchedPersonIds,
      needs_review:needsAttention,
      normalized_name_collision:collision,alias_spelling_changed:priorDiff,
      reviewed_at:decision?.reviewed_at??null
    });
  }
  const gone=[...old.entries()].filter(([key])=>!newMap.has(key));
  const attention=queued.filter(x=>x.needs_review).sort((a,b)=>
    TIER_ORDER[a.tier]-TIER_ORDER[b.tier]||b.channels-a.channels||a.rank-b.rank);
  const summary={
    schema:"atlas-youtube-incremental-audit/v1",at:currentAsOf,
    previous_snapshot:prev.snapshot_id,current_snapshot:curr.snapshot_id,
    previous_signals:prev.rows.length,current_signals:curr.rows.length,
    new_raw_names:added,priority_upgrades:upgraded,channel_growth:channelGrowth,
    unchanged,disappeared_keys:gone.length,
    reviewed_decisions:resolved.size,
    attention_total:attention.length,
    attention_p0:attention.filter(x=>x.tier==="P0").length,
    attention_p1:attention.filter(x=>x.tier==="P1").length,
    attention_p2:attention.filter(x=>x.tier==="P2").length
  };
  return {summary,changed:queued,attention,disappeared:gone.map(([key,rows])=>({
    identity_key:key,raw_names:rows.map(x=>x.raw_name)
  }))};
}
function csvEscape(v){return '"'+String(v??"").replaceAll('"','""').replace(/[\r\n]/g," ")+'"';}
export function attentionCsv(result) {
  const keys=["tier","rank","raw_name","channels","previous_channels","delta",
    "disposition","registered_person_ids","normalized_name_collision","alias_spelling_changed","identity_key"];
  return keys.join(",")+"\n"+result.attention.map(item=>keys.map(k=>csvEscape(item[k])).join(",")).join("\n")+"\n";
}
export function main(args=process.argv.slice(2)) {
  const opts={};
  for(let i=0;i<args.length;i+=2){if(!args[i]?.startsWith("--")||!args[i+1])throw Error("INVALID_AUDIT_ARGUMENTS");opts[args[i].slice(2)]=args[i+1];}
  for(const key of ["current","previous","output"])if(!opts[key])throw Error("MISSING_"+key.toUpperCase());
  const file=p=>JSON.parse(fs.readFileSync(p,"utf8"));
  const {REVIEWED_REGISTRATION_ALIASES}=require(path.join(BASE,"server/atlas-reviewed-person-registration-aliases.js"));
  const {REVIEWED_LIVING_NAMES,REVIEW_EXPIRES_AT}=require(path.join(BASE,"atlas-youtube-reviewed-living-people.js"));
  const result=computeIncrementalAudit(file(opts.current),file(opts.previous),{
    decisions:opts.decisions?file(opts.decisions):{decisions:[]},
    registeredAliases:REVIEWED_REGISTRATION_ALIASES.map(x=>x.alias_name),
    livingNames:Date.now()<Date.parse(REVIEW_EXPIRES_AT)?REVIEWED_LIVING_NAMES:[],
    persons:opts.persons?file(opts.persons):null
  });
  fs.mkdirSync(opts.output,{recursive:true});
  fs.writeFileSync(path.join(opts.output,"audit.json"),JSON.stringify(result,null,2)+"\n");
  fs.writeFileSync(path.join(opts.output,"attention.csv"),attentionCsv(result));
  console.log(JSON.stringify(result.summary));
  return result.summary;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main();
