import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const p=JSON.parse(fs.readFileSync(new URL("../corrections/plans/polity-song-northern-four-source-backed-relinks-20261011.v1.json",import.meta.url),"utf8"));
test("P2-08C four independently sourced existing northern-court records, source-sound and exact-before only",()=>{
 assert.equal(p.schema,"atlas-stage2-correction-v2-execution-plan/v1");
 assert.equal(p.operations.length,4);
 assert.equal(p.execution_rules.production_executable,false);
 assert.equal(p.execution_rules.production_mutation_authorized,false);
 assert.equal(new Set(p.operations.map(a=>a.activity_id)).size,4);
 let links=0;
 for(const o of p.operations){
  assert.equal(o.type,"rewrite_activity");
  assert.equal(o.baseline_before.polity_id,"1a1983fd-1850-5756-877c-3d2c17b85e1f");
  assert.equal(o.after.polity_id,"407d91cf-7a97-45e3-81ea-d42a3cbfba35");
  assert.equal(o.activity_id,o.after.activity_id);
  for(const k of ["person_id","role_id","period_basis_id","activity_start","activity_end","confidence","chronology_status","legacy_source_key"])assert.equal(o.baseline_before[k],o.after[k]);
  for(const side of ["start","end"]){
   const x=o.after["activity_"+side+"_detail"];
   assert.equal(x.year,o.after["activity_"+side]);
   assert.equal(x.granularity,"year");
   assert.equal(x.month,null);
   assert.equal(x.day,null);
   assert.equal(x.certainty,"exact");
  }
  assert.equal(o.after.notes_policy,"PRESERVE_EXACT_LIVE_NOTES");
  assert.equal(o.after.source_links_policy,"PRESERVE_ALL_EXISTING_NORMALIZED_SOURCE_LINKS_AND_LOCATORS");
  const ss=p.evidence.target_sources[o.activity_id];
  assert.equal(ss.length,o.baseline_before.source_count);
  assert.ok(ss.every(x=>x.source_id && x.source_locator_key.startsWith("https://")));
  links+=ss.length;
 }
 assert.equal(links,6);
 assert.equal(p.results.original_normalized_activity_source_pairs_preserved,6);
 assert.equal(p.results.all_song_activities_before_expected,14);
 assert.equal(p.results.all_song_activities_after_expected,14);
});
test("P2-08C regency is not rewritten as emperor; legacy-source-only founder and reform emperor held",()=>{
 const em=p.operations.find(x=>x.activity_id==="283d97e4-ea1f-4f13-aa40-0bb5f465cbb8");
 assert.ok(em);
 assert.equal(em.after.role_id,"18d682df-2be3-52f2-a879-35090759f6f5");
 assert.equal(em.after.relation_type_id,"67a57b37-1853-5f2a-b7ab-e6b2d32b56b6");
 assert.equal(em.after.period_basis_id,"e78bcf72-81e3-5db8-a76a-8c2ca9c6d745");
 for(const id of p.evidence.excluded_pending_original_legacy_activities){
  assert.equal(p.operations.some(x=>x.activity_id===id),false);
 }
 assert.equal(p.results.generic_song_after_expected,2);
 assert.equal(p.results.northern_song_after_expected,7);
 assert.equal(p.results.southern_song_after_expected,5);
});