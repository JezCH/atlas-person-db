import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFileSync} from "node:fs";
const require=createRequire(import.meta.url);

const next=require("../audits/youtube-b024-next-eight-source-identity-unions-20261021.json");
const earlier=require("../audits/youtube-b024-seven-reviewed-source-identity-unions-20261021.json");
const source=require("../audits/youtube-b024-original-id-runtime-source-20261020.json");
const extra=require("../audits/youtube-b024-added-profile-title-runtime-source-20261020.json");
const protectedHolds=require("../audits/youtube-b024-clear-nonindividual-and-identity-holds-20261020.json");
const olderRegistered=require("../audits/youtube-b024-source-first-36-final-registered-identity-review.json");

const origBy=new Map(source.rows.map(r=>[r[0],r]));
const extraBy=new Map(extra.rows.map(r=>[r[0],r]));
const held=new Set(protectedHolds.rows.map(r=>r.name));
const alreadyReviewed=new Set(earlier.reviewed_same_person_groups.flatMap(r=>r.source_name_labels));
const alreadyUsedVideos=new Set(earlier.reviewed_same_person_groups.flatMap(r=>r.unique_original_video_ids));
const historicalRegisteredLabels=new Set([...Object.keys(olderRegistered.registered_exact),...Object.keys(olderRegistered.registered_reviewed_alias)]);
const sorted=x=>[...x].sort();

test("Markdown table and evidence Wikidata identities match each reviewed JSON person",()=>{
 const markdown=readFileSync(new URL("../audits/youtube-b024-next-eight-source-identity-unions-20261021.md",import.meta.url),"utf8");
 const lines=markdown.split(/\r?\n/);
 const tableRows=lines.filter(line=>line.startsWith("|")).map(line=>line.split("|").slice(1,-1).map(cell=>cell.trim()));
 for(const {canonical_identity_name:name,external_identity:{qid}} of next.reviewed_groups){
  const rows=tableRows.filter(cells=>cells[0]===name);
  assert.equal(rows.length,1,name+": exactly one identity table row required");
  const links=[...rows[0][1].matchAll(/\[([^\]]*)\]\(([^)]*)\)/g)];
  assert.equal(links.length,1,name+": exactly one table identity link required");
  assert.equal(links[0][1],qid,name+": table displayed QID");
  assert.equal(links[0][2],"https://www.wikidata.org/wiki/"+qid,name+": table URL QID");
  const evidence=lines.filter(line=>line.startsWith("- **"+name+"** — "));
  assert.equal(evidence.length,1,name+": exactly one person evidence paragraph required");
  const urls=[...evidence[0].matchAll(/https:\/\/www\.wikidata\.org\/wiki\/([^\s<>\])]+)/g)].map(match=>match[0]);
  assert.deepEqual(urls,["https://www.wikidata.org/wiki/"+qid],name+": exactly one matching evidence URL required");
 }
});

test("same immutable B024 source, no Production claims and separate existing review tranche",()=>{
 assert.equal(next.schema,"atlas-youtube-b024-additional-source-identity-unions/v1");
 assert.equal(source.rows.length,2241);
 assert.equal(extra.rows.length,400);
 assert.equal(next.source.archive_sha256,source.provenance.source_archive_sha256);
 assert.equal(next.source.archive_sha256,extra.source_archive_sha256);
 assert.equal(next.source.archive_sha256,earlier.source_archive_sha256);
 assert.equal(next.source.archive_sha256,protectedHolds.source_archive_sha256);
 assert.equal(next.strict_scope.no_production_person_write,true);
 assert.equal(next.strict_scope.no_live_production_person_identity_sweep,true);
 assert.equal(next.strict_scope.no_watched_or_captions_authenticated,true);
 assert.equal(next.strict_scope.no_automatic_registered_exclusion_from_incomplete_snapshot,true);
 assert.equal(next.reviewed_groups.length,8);
});

test("8 new canonical identities are exact unioned original-ID sets; previous 7 disjoint",()=>{
 const usedLabels=new Set(),usedVideoIds=new Set(),usedQids=new Set(earlier.reviewed_same_person_groups.map(g=>g.external_person_id.id));
 let perPersonCh=0,videoTotal=0,overcount=0,strictVideos=0,profileVideos=0,high3Names=0,high3Groups=0;
 for(const g of next.reviewed_groups){
  assert.match(g.external_identity.qid,/^Q[1-9][0-9]*$/);
  assert(!usedQids.has(g.external_identity.qid));usedQids.add(g.external_identity.qid);
  assert(g.source_name_labels.length>=2);
  const ch=new Set(),vid=new Set();let naive=0,strict=0,profile=0;
  for(const name of g.source_name_labels){
   assert(!usedLabels.has(name));usedLabels.add(name);
   assert(!alreadyReviewed.has(name));assert(!held.has(name));assert(!historicalRegisteredLabels.has(name));
   const r=origBy.get(name);assert(r,"unknown original source label "+name);
   const e=extraBy.get(name);
   const localCh=new Set([...r[2],...(e?.[1]||[])]);
   naive+=localCh.size;
   if(localCh.size>=3)high3Names++;
   for(const c of localCh)ch.add(c);
   for(const v of [...r[3],...(e?.[2]||[])]){
    assert(!vid.has(v));assert(!usedVideoIds.has(v));assert(!alreadyUsedVideos.has(v));
    vid.add(v);usedVideoIds.add(v);
   }
   strict+=r[3].length;profile+=e?.[2]?.length||0;
  }
  assert.deepEqual(g.unique_original_channel_ids,sorted(ch));
  assert.deepEqual(g.unique_original_video_ids,sorted(vid));
  assert.equal(g.distinct_original_channel_count,ch.size);
  assert.equal(g.distinct_original_video_count,vid.size);
  assert.equal(g.naive_channel_count_sum,naive);
  assert.equal(g.overcount_prevented,naive-ch.size);
  assert.equal(g.strict_title_ids,strict);
  assert.equal(g.additional_profile_title_ids,profile);
  perPersonCh+=ch.size;videoTotal+=vid.size;overcount+=naive-ch.size;strictVideos+=strict;profileVideos+=profile;
  if(ch.size>=3)high3Groups++;
 }
 assert.equal(usedLabels.size,17);
 assert.equal(usedVideoIds.size,60);
 assert.equal(perPersonCh,57);
 assert.equal(overcount,1);
 assert.equal(strictVideos,55);
 assert.equal(profileVideos,5);
 assert.equal(high3Names,8);
 assert.equal(high3Groups,8);
 assert.deepEqual(next.new_group_totals,{
  groups:8,sourceLabels:17,uniqueVideoIds:60,perIdentityChannelTotals:57,
  overcountPrevented:1,sourceLabelsThree:8,canonicalGroupsThree:8,strictTitleIds:55,addedProfileTitleIds:5
 });
});

test("the 2026-10-10 Khalid registered UUID is preserved as HISTORICAL ONLY; Khaleda death is evidenced",()=>{
 const group=name=>next.reviewed_groups.find(g=>g.canonical_identity_name===name);
 const khalid=group("Khalid ibn al-Walid");
 assert.equal(khalid.external_identity.qid,"Q26918");
 assert.equal(khalid.historical_registration_anchor.prior_source_name,"Khalid Ibn Al Walid");
 assert.equal(khalid.historical_registration_anchor.prior_registered_person_uuid,olderRegistered.registered_exact["Khalid Ibn Al Walid"].uuid);
 assert.equal(khalid.atlas_registry_state,"PRIOR_REGISTERED_UUID_CURRENT_STATE_UNVERIFIED");
 assert.equal(khalid.historical_registration_anchor.current_registered_person_recheck_required,true);
 const zia=group("Khaleda Zia");
 assert.equal(zia.death_date,"2025-12-30");
 assert(zia.person_identity_source_urls.some(x=>x.includes("reuters.com/")));
 assert.equal(zia.atlas_registry_state,"FULL_CURRENT_REGISTRY_NOT_SCREENED");
 assert.equal(next.cumulative_review_state.live_production_current_registered_screen_done,false);
 assert.equal(next.cumulative_review_state.reviewed_video_content_approved,0);
});

test("dangerous shared tokens remain non-merges; cumulative review units remain honest",()=>{
 const sameGroup=(a,b)=>next.reviewed_groups.some(g=>g.source_name_labels.includes(a)&&g.source_name_labels.includes(b));
 for(const [a,b] of [["Muhammad Ali","Quaid e Azam Muhammad Ali Jinnah"],["Saint Francis of Assisi","Saint Francis Xavier"],["Saint Dominic","Saint Dominic Savio"],["Saint Paul","Saint Paul of the Cross"]]){
  assert(!sameGroup(a,b),a+" and "+b+" incorrectly merged");
 }
 const allCurrentAliases=new Set(next.reviewed_groups.flatMap(g=>g.source_name_labels));
 for(const name of next.prevented_unsafe_merges.ambiguous_forms_needing_context)assert(!allCurrentAliases.has(name));
 assert.equal(next.cumulative_review_state.reviewed_identity_groups,earlier.totals.reviewed_groups+next.new_group_totals.groups);
 assert.equal(next.cumulative_review_state.source_name_labels_resolved,32);
 assert.equal(next.cumulative_review_state.original_video_ids_in_reviewed_groups,144);
 assert.equal(next.cumulative_review_state.duplicate_channels_prevented,4);
 assert.equal(next.cumulative_review_state.identity_research_units_after_collapsing,2151);
 assert.equal(next.cumulative_review_state.identity_research_units_with_three_plus_channels,846);
});
