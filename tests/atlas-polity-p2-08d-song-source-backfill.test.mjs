import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
const p=JSON.parse(fs.readFileSync(new URL("../corrections/plans/polity-song-taizu-shenzong-source-backfill-20261011.v1.json",import.meta.url),"utf8"));
test("P2-08D two existing original Song ruler sources augmented without relinking or retiring dynasty",()=>{
 assert.equal(p.schema,"atlas-stage2-correction-v2-execution-plan/v1");
 assert.equal(p.execution_rules.production_executable,false);
 assert.equal(p.execution_rules.production_mutation_authorized,false);
 assert.equal(p.operations.length,2);
 assert.equal(p.stage2_assertions.length,1);
 assert.equal(p.stage2_assertions[0].type,"assert_source");
 assert.equal(p.stage2_assertions[0].exact_after.source.id,"0759fdcc-20b8-435b-9286-b4c57207cec7");
 assert.equal(p.stage2_assertions[0].exact_before.source_absent_id,"0759fdcc-20b8-435b-9286-b4c57207cec7");
 assert.equal(p.results.new_source_records,1);
 assert.equal(p.results.new_activity_source_links,2);
 assert.equal(p.results.all_song_activity_source_links_after_expected,21);
 for(const x of p.operations){
  assert.equal(x.type,"rewrite_activity");
  assert.equal(x.activity_id,x.after.activity_id);
  assert.equal(x.baseline_before.polity_id,"1a1983fd-1850-5756-877c-3d2c17b85e1f");
  assert.equal(x.after.polity_id,x.baseline_before.polity_id);
  for(const k of ["person_id","role_id","period_basis_id","activity_start","activity_end","confidence","chronology_status","legacy_source_key"])assert.equal(x.baseline_before[k],x.after[k],k);
  assert.equal(x.after.confidence,"legacy_asserted");
  assert.equal(x.after.chronology_status,"exact_as_recorded");
  assert.equal(x.baseline_before.source_count,1);
  assert.equal(x.after.add_source_links.length,1);
  assert.equal(x.after.source_links_policy,"PRESERVE_ALL_EXISTING_NORMALIZED_SOURCE_LINKS_AND_LOCATORS");
  assert.equal(x.after.notes_policy,"PRESERVE_EXACT_LIVE_NOTES");
  for(const side of ["start","end"]){const d=x.after["activity_"+side+"_detail"];assert.equal(d.month,null);assert.equal(d.day,null);assert.equal(d.granularity,"year");assert.equal(d.year,x.after["activity_"+side]);}
  assert.equal(p.evidence.original_legacy_source_ids[x.activity_id].source_id.length,36);
 }
});
test("P2-08D reuse preexisting Taizu Cambridge Source and allocate exactly one Shenzong scholarly Source",()=>{
 const [a,b]=p.operations;
 assert.equal(a.after.add_source_links[0].source_id,"5496aca8-5198-4887-a348-c66ee25eacfd");
 assert.equal(b.after.add_source_links[0].source_id,"0759fdcc-20b8-435b-9286-b4c57207cec7");
 assert.notEqual(a.after.add_source_links[0].source_id,b.after.add_source_links[0].source_id);
 assert.equal(p.evidence.why_no_rebind.includes("zero linked Activities"),true);
 assert.equal(p.results.generic_song_direct_after_expected,2);
 assert.equal(p.results.northern_song_direct_after_expected,7);
});