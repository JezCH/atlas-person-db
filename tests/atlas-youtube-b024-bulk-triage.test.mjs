import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const expected=require("../audits/youtube-b024-bulk-triage-all-candidates-20261021.json");
const {build}=require("../scripts/youtube-b024-build-bulk-triage.cjs");
const source=require("../audits/youtube-b024-original-id-runtime-source-20261020.json");
const extra=require("../audits/youtube-b024-added-profile-title-runtime-source-20261020.json");
const holds=require("../audits/youtube-b024-clear-nonindividual-and-identity-holds-20261020.json");
const supplementary=require("../audits/youtube-b024-reviewed-prior-registration-and-nonperson-20261021.json");
const domainReview=require("../audits/youtube-b024-historical-person-domain-positive-20261021.json");

test("all 2241 name labels are reconciled in one offline pass; committed output is reproducible",()=>{
 const live=build();
 assert.deepEqual(live,expected);
 assert.equal(live.counts.original_source_labels,2241);
 assert.equal(live.counts.held_exact_source_labels,75);
 assert.equal(live.counts.prior_registered_reviewed_source_labels,14);
 assert.equal(live.counts.prior_domain_registered_positive_source_labels,25);
 assert.equal(live.counts.supplementary_clear_nonindividual_source_labels,13);
 assert.equal(live.counts.prior_registered_exact_source_labels,11);
 assert.equal(live.counts.source_labels_in_reviewed_groups,32);
 assert.equal(live.counts.reviewed_identity_groups,15);
 assert.equal(live.counts.ungrouped_source_labels,2084);
 assert.equal(live.counts.all_review_units,2099);
 assert.equal(live.counts.remaining_priority_units,2096);
 assert.equal(live.counts.remaining_priority_3plus_channels,816);
 assert.equal(live.priority100.length,100);
 assert.equal(live.candidate_rows.length,2096);
 assert.equal(live.current_production_complete_person_registry_checked,false);
 assert.equal(live.content_media_watched,0);
});
test("rank uses ORIGINAL unique IDs and held/registered labels never appear as candidate units",()=>{
 const live=build();
 const h=new Set([...holds.rows.map(x=>x.name),...supplementary.clear_nonindividual_source_holds.map(x=>x.source_name)]);
 const reg=new Set(live.prior_registered_source_labels);
 const candidate=new Set(live.candidate_rows.map(x=>x[1]));
 for(const x of h)assert(!candidate.has(x));
 for(const x of reg)assert(!candidate.has(x));
 assert(!candidate.has("Khalid ibn al-Walid"));
 for(const p of supplementary.registered_positive_matches){assert(!candidate.has(p.source_name));assert(reg.has(p.source_name));}
 for(const p of domainReview.prior_registered_positive_matches){assert(!candidate.has(p.source_name));assert(reg.has(p.source_name));}
 for(const p of supplementary.clear_nonindividual_source_holds)assert(!candidate.has(p.source_name));
 for(const name of ["Muhammad Ali","King David","King Solomon","Queen Elizabeth","Emperor Claudius"])assert(candidate.has(name));
 const originals=new Map(source.rows.map(x=>[x[0],x]));
 const additions=new Map(extra.rows.map(x=>[x[0],x]));
 for(const row of live.priority100){
  const channel=new Set(),videos=new Set();
  for(const label of row.labels){
   const base=originals.get(label);assert(base);
   const p=additions.get(label);
   for(const v of [...base[2],...(p?.[1]||[])])channel.add(v);
   for(const v of [...base[3],...(p?.[2]||[])])videos.add(v);
  }
  assert.equal(row.ch,channel.size);
  assert.equal(row.vid,videos.size);
  for(const v of row.ex)assert(videos.has(v));
 }
 for(let i=1;i<live.priority100.length;i++){
  const a=live.priority100[i-1],b=live.priority100[i];
  assert(a.ch>=b.ch);
  if(a.ch===b.ch)assert(a.vid>=b.vid);
 }
});
