import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const review=require("../audits/youtube-b024-seven-reviewed-source-identity-unions-20261021.json");
const source=require("../audits/youtube-b024-original-id-runtime-source-20261020.json");
const additional=require("../audits/youtube-b024-added-profile-title-runtime-source-20261020.json");
const protectedHolds=require("../audits/youtube-b024-clear-nonindividual-and-identity-holds-20261020.json");
const reviewedNormalized=require("../audits/youtube-b024-normalized-label-disposition-review.json");
const registeredHistory=require("../audits/youtube-b024-source-first-36-final-registered-identity-review.json");
const keyByName=new Map(source.rows.map(x=>[x[0],x]));
const addByName=new Map(additional.rows.map(x=>[x[0],x]));
const holds=new Set(protectedHolds.rows.map(x=>x.name));
const oldReg=new Set([...Object.keys(registeredHistory.registered_exact),...Object.keys(registeredHistory.registered_reviewed_alias)]);
const sorted=x=>[...x].sort();

test("seven confirmed source-name identity groups retain exact archive provenance",()=>{
 assert.equal(review.schema,"atlas-youtube-b024-reviewed-identity-source-unions/v1");
 assert.equal(source.rows.length,2241);
 assert.equal(additional.rows.length,400);
 assert.equal(review.source_archive_sha256,source.provenance.source_archive_sha256);
 assert.equal(review.source_archive_sha256,additional.source_archive_sha256);
 assert.equal(review.source_archive_sha256,protectedHolds.source_archive_sha256);
 assert.equal(review.reviewed_same_person_groups.length,7);
 assert.equal(review.rules.content_watch_or_transcript_verification_count,0);
 assert.equal(review.rules.current_production_person_registry_fully_checked,false);
 assert.equal(review.rules.production_write_allowed,false);
});

test("all reviewed labels have disjoint original IDs and exact per-canonical ID union",()=>{
 const allNames=new Set(),allVideos=new Set(),allQids=new Set();
 let totalChannels=0,totalVideos=0,prevented=0,wasHigh3=0;
 for(const g of review.reviewed_same_person_groups){
  assert.match(g.external_person_id.id,/^Q[1-9][0-9]*$/);
  assert(!allQids.has(g.external_person_id.id));allQids.add(g.external_person_id.id);
  assert(g.source_name_labels.length>=2);
  const ch=new Set(),vid=new Set();let countSum=0,strict=0,profile=0;
  for(const n of g.source_name_labels){
   assert(!allNames.has(n));allNames.add(n);
   assert(!holds.has(n));assert(!oldReg.has(n));
   const row=keyByName.get(n);assert(row,"unknown original source label: "+n);
   const ext=addByName.get(n);const ownChannels=new Set([...row[2],...(ext?.[1]||[])]);
   if(ownChannels.size>=3)wasHigh3++;
   countSum+=ownChannels.size;strict+=row[3].length;profile+=ext?.[2]?.length||0;
   for(const x of ownChannels)ch.add(x);
   for(const x of [...row[3],...(ext?.[2]||[])]){
    assert(!vid.has(x));vid.add(x);
    assert(!allVideos.has(x));allVideos.add(x);
   }
  }
  assert.deepEqual(g.unique_original_channel_ids,sorted(ch));
  assert.deepEqual(g.unique_original_video_ids,sorted(vid));
  assert.equal(g.distinct_original_channel_count,ch.size);
  assert.equal(g.distinct_original_video_count,vid.size);
  assert.equal(g.strict_title_video_count,strict);
  assert.equal(g.additional_profile_title_video_count,profile);
  assert.equal(g.naive_sum_channel_count,countSum);
  assert.equal(g.prevented_channel_double_count,countSum-ch.size);
  totalChannels+=ch.size;totalVideos+=vid.size;prevented+=countSum-ch.size;
 }
 assert.equal(allNames.size,15);
 assert.equal(totalVideos,84);assert.equal(totalChannels,80);assert.equal(prevented,3);
 assert.equal(wasHigh3,13);
 assert.equal(review.totals.high3_canonical_review_unit_count_after_7_exact_unions,846);
 assert.equal(review.totals.review_units_after_7_exact_unions,2160);
});

test("Teresa identities are distinct and previously held living Mbappe names never enter historical groups",()=>{
 const idOf=name=>review.reviewed_same_person_groups.find(g=>g.source_name_labels.includes(name))?.external_person_id.id;
 assert.equal(idOf("Mother Teresa"),"Q30547");
 assert.equal(idOf("Saint Teresa of Calcutta"),"Q30547");
 assert.equal(idOf("Saint Teresa of Ávila"),"Q174880");
 assert.equal(idOf("Saint Teresa of Jesus"),"Q174880");
 assert.notEqual(idOf("Mother Teresa"),idOf("Saint Teresa of Jesus"));
 const living=review.protected_nonmerge.living_exact_collision_hold[0];
 assert.equal(reviewedNormalized.disposition_by_normalized_key[living.normalized_review_key],"HOLD_LIVING_PERSON");
 for(const n of living.source_labels){assert(keyByName.has(n));assert.equal(idOf(n),undefined)}
 for(const n of review.protected_nonmerge.blocked_broad_aliases)assert.equal(idOf(n),undefined);
});
