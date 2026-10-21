#!/usr/bin/env node
"use strict";

// Deterministic, source-first B024 BULK audit. No network, no Production,
// no YouTube requests, no new leaderboard. Run --check in CI.
const fs=require("node:fs");
const path=require("node:path");
const source=require("../audits/youtube-b024-original-id-runtime-source-20261020.json");
const extra=require("../audits/youtube-b024-added-profile-title-runtime-source-20261020.json");
const holds=require("../audits/youtube-b024-clear-nonindividual-and-identity-holds-20261020.json");
const first=require("../audits/youtube-b024-seven-reviewed-source-identity-unions-20261021.json");
const second=require("../audits/youtube-b024-next-eight-source-identity-unions-20261021.json");
const history=require("../audits/youtube-b024-source-first-36-final-registered-identity-review.json");
const normalized=require("../audits/youtube-b024-normalized-label-disposition-review.json");
const living=require("../audits/youtube-live-16-reviewed-living-people-20261011.json");
const supplementaryReview=require("../audits/youtube-b024-reviewed-prior-registration-and-nonperson-20261021.json");
const OUTPUT=path.resolve(__dirname,"../audits/youtube-b024-bulk-triage-all-candidates-20261021.json");
function invariant(test,why){if(!test)throw Error("YOUTUBE_B024_BULK_TRIAGE_"+why);}
const fold=s=>s.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
function build(){
 const archive=source.provenance.source_archive_sha256;
 invariant(source.rows.length===2241,"SOURCE_COUNT");
 invariant(extra.rows.length===400,"PROFILE_GROUP_COUNT");
 invariant(holds.rows.length===62,"HOLD_COUNT");
 invariant(supplementaryReview.schema==="atlas-youtube-b024-offline-registered-positive-and-nonperson-review/v1"&&supplementaryReview.registered_positive_matches.length===14&&supplementaryReview.clear_nonindividual_source_holds.length===13,"SUPPLEMENTARY_REVIEW_SCHEMA");
 invariant(first.reviewed_same_person_groups.length===7,"FIRST_REVIEW_COUNT");
 invariant(second.reviewed_groups.length===8,"SECOND_REVIEW_COUNT");
 invariant(archive===extra.source_archive_sha256 && archive===holds.source_archive_sha256 && archive===first.source_archive_sha256 && archive===second.source.archive_sha256,"ARCHIVE_SHA");
 invariant(archive===supplementaryReview.source_archive_sha256,"SUPPLEMENTARY_ARCHIVE");
 const addon=new Map(extra.rows.map(r=>[r[0],r]));
 const raw=new Map(source.rows.map((r,i)=>[r[0],{r,i:i+1}]));
 invariant(raw.size===2241,"DUPLICATE_NAME");
 const reviewedHolds=new Set(supplementaryReview.clear_nonindividual_source_holds.map(r=>r.source_name));
 invariant(reviewedHolds.size===13,"SUPPLEMENTARY_NONPERSON_UNIQUE");
 const hold=new Set([...holds.rows.map(r=>r.name),...reviewedHolds]);
 invariant(hold.size===75,"ALL_NONPERSON_DISJOINT");
 const old=new Map([...Object.entries(history.registered_exact),...Object.entries(history.registered_reviewed_alias)]);
 const historicalExact=source.rows.filter(r=>old.has(r[0])).map(r=>r[0]);
 const oldRegistry=fs.readFileSync(path.resolve(__dirname,"../"+supplementaryReview.prior_registered_roster),"utf8").split(/\r?\n/);
 const positives=new Map();
 for(const p of supplementaryReview.registered_positive_matches){
  invariant(!positives.has(p.source_name)&&raw.has(p.source_name)&&!hold.has(p.source_name)&&!old.has(p.source_name),"REVIEWED_POSITIVE_SOURCE");
  const line=oldRegistry.find(r=>r.includes("\""+p.registered_name+"\"")&&r.includes("\"REGISTERED\"")&&r.includes("\""+p.registered_uuid+"\""));
  invariant(!!line,"REVIEWED_POSITIVE_UUID_PROVENANCE");
  positives.set(p.source_name,p);
 }
 invariant(positives.size===14,"SUPPLEMENTARY_POSITIVE_COUNT");
 for(const name of reviewedHolds)invariant(raw.has(name)&&!old.has(name)&&!positives.has(name),"REVIEWED_NONPERSON_SOURCE");
 invariant(historicalExact.length===11,"PRIOR_REGISTERED_MATCH_COUNT");
 const unionedVideoIds=new Set(),sourceVideoIds=new Set();let strictVideo=0,addedVideo=0;
 for(const r of source.rows){const add=addon.get(r[0]);strictVideo+=r[3].length;addedVideo+=add?.[2]?.length||0;
  for(const id of [...r[3],...(add?.[2]||[])]){invariant(!sourceVideoIds.has(id),"ORIGINAL_VIDEO_DUPLICATED");sourceVideoIds.add(id);}
 }
 invariant(strictVideo===6162&&addedVideo===536&&sourceVideoIds.size===6698,"ORIGINAL_VIDEO_TOTAL");
 const grp=[
  ...first.reviewed_same_person_groups.map(g=>({name:g.canonical_identity_name,q:g.external_person_id.id,labels:g.source_name_labels,anchor:""})),
  ...second.reviewed_groups.map(g=>({name:g.canonical_identity_name,q:g.external_identity.qid,labels:g.source_name_labels,anchor:g.historical_registration_anchor?.prior_registered_person_uuid||""}))
 ];
 invariant(grp.length===15,"GROUP_TOTAL");
 invariant(grp.some(g=>g.name==="Muhammad Iqbal"&&g.q==="Q484141"),"WIKIDATA_CANONICAL_ID");
 const assigned=new Set(),units=[];
 function rowData(name){const hit=raw.get(name);invariant(!!hit,"MISSING_SOURCE_NAME");const ex=addon.get(name);
   return {row:hit.i,ch:new Set([...hit.r[2],...(ex?.[1]||[])]),vid:new Set([...hit.r[3],...(ex?.[2]||[])])};
 }
 const knownLiving=new Set(living.names);
 const livingNormalized=new Set(Object.entries(normalized.disposition_by_normalized_key).filter(([,v])=>v==="HOLD_LIVING_PERSON").map(([k])=>k));
 for(const g of grp){
  const ch=new Set(),vid=new Set(),index=[];
  for(const name of g.labels){
   invariant(!assigned.has(name)&&!hold.has(name)&&!old.has(name),"GROUP_CONFLICT");
   assigned.add(name);const x=rowData(name);index.push(x.row);
   for(const id of x.ch)ch.add(id);
   for(const id of x.vid){invariant(!unionedVideoIds.has(id),"GROUP_VIDEO_DOUBLE_CREDIT");unionedVideoIds.add(id);vid.add(id);}
  }
  units.push({name:g.name,labels:g.labels,rows:index,ch:ch.size,vid:vid.size,ex:[...vid].sort().slice(0,2),qid:g.q,screen:g.anchor?"PRIOR_REGISTERED_RECHECK":"CURRENT_PRODUCTION_NOT_CHECKED",reg:g.anchor});
 }
 for(const r of source.rows){const n=r[0];
  if(assigned.has(n)||hold.has(n)||old.has(n)||positives.has(n))continue;
  const x=rowData(n),isLiving=knownLiving.has(n)||livingNormalized.has(fold(n));
  units.push({name:n,labels:[n],rows:[x.row],ch:x.ch.size,vid:x.vid.size,ex:[...x.vid].sort().slice(0,2),qid:"",screen:isLiving?"PRIOR_REVIEWED_LIVING_HOLD":"CURRENT_PRODUCTION_NOT_CHECKED",reg:""});
 }
 const candidate=units.filter(g=>g.screen==="CURRENT_PRODUCTION_NOT_CHECKED").sort((a,b)=>b.ch-a.ch||b.vid-a.vid||a.name.localeCompare(b.name,"en"));
 const three=candidate.filter(x=>x.ch>=3);
 const counts={original_source_labels:2241,held_exact_source_labels:hold.size,prior_registered_exact_source_labels:historicalExact.length,prior_registered_manifest_nameforms:old.size,source_labels_in_reviewed_groups:assigned.size,reviewed_identity_groups:grp.length,prior_registered_reviewed_source_labels:positives.size,supplementary_clear_nonindividual_source_labels:reviewedHolds.size,ungrouped_source_labels:source.rows.length-hold.size-historicalExact.length-assigned.size-positives.size,all_review_units:units.length,reviewed_registration_linked_groups:units.filter(x=>x.reg).length,reviewed_living_units:units.filter(x=>x.screen==="PRIOR_REVIEWED_LIVING_HOLD").length,remaining_priority_units:candidate.length,remaining_priority_3plus_channels:three.length};
 invariant(JSON.stringify([counts.held_exact_source_labels,counts.prior_registered_exact_source_labels,counts.source_labels_in_reviewed_groups,counts.ungrouped_source_labels,counts.all_review_units,counts.remaining_priority_units,counts.remaining_priority_3plus_channels])===JSON.stringify([75,11,32,2109,2124,2121,821]),"COUNT_RECONCILIATION");
 return {
 schema:"atlas-youtube-b024-bulk-research-triage/v3-compact",
 created_on:"2026-10-21",provenance_sha256:archive,
 goal:"READ_ONLY_RESEARCH_PRIORITY_NOT_A_NEW_PRODUCTION_LEADERBOARD",
 content_media_watched:0,current_production_complete_person_registry_checked:false,
 counts,prior_registered_source_labels:[...historicalExact,...positives.keys()].sort(),
 supplementary_review_manifest:"audits/youtube-b024-reviewed-prior-registration-and-nonperson-20261021.json",group_membership:grp,
 priority100:three.slice(0,100).map((r,i)=>({rank:i+1,...r})),
 candidate_rows:candidate.map((r,i)=>[i+1,r.name,r.rows,r.ch,r.vid,r.qid,r.ex]),
 safeguard:"Rows are name-group research proposals with explicit title-based original ID evidence. Not authenticated videos, not confirmed deceased Persons and not current unregistered Persons. Incomplete prior registry never establishes absence. LIVE registered Person + aliases check LAST."
 };
}
if(require.main===module){
 const expected=JSON.stringify(build());
 if(process.argv.includes("--check")){
  invariant(fs.existsSync(OUTPUT),"MISSING_OUTPUT");
  invariant(JSON.stringify(JSON.parse(fs.readFileSync(OUTPUT,"utf8")))===expected,"OUTPUT_STALE");
  process.stdout.write("B024 all source-labels; 14 prior registered identities and 13 additional nonindividual holds checked.\n");
 }else process.stdout.write(expected+"\n");
}
module.exports={build};
