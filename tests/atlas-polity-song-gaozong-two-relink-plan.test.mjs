import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const plan=JSON.parse(fs.readFileSync(new URL("../corrections/plans/polity-song-gaozong-southern-period-two-relink-20261011.v1.json",import.meta.url),"utf8"));
test("P2-08B limited two distinct southern Song Gaozong owner relinks preserve identity and year granularity",()=>{
 assert.equal(plan.schema,"atlas-stage2-correction-v2-execution-plan/v1");
 assert.equal(plan.execution_rules.production_executable,false);
 assert.equal(plan.execution_rules.production_mutation_authorized,false);
 assert.equal(plan.operations.length,2);
 assert.equal(new Set(plan.operations.map(x=>x.activity_id)).size,2);
 assert.deepEqual(plan.operations.map(x=>[x.baseline_before.activity_start,x.baseline_before.activity_end]),[[1127,1129],[1129,1162]]);
 for(const op of plan.operations){
   assert.equal(op.type,"rewrite_activity");
   assert.equal(op.after.activity_id,op.activity_id);
   assert.equal(op.after.person_id,op.baseline_before.person_id);
   assert.equal(op.after.polity_id,"fe073a4c-d967-56e2-bb31-f74bdde1af87");
   assert.equal(op.baseline_before.polity_id,"1a1983fd-1850-5756-877c-3d2c17b85e1f");
   for(const k of ["role_id","period_basis_id","confidence","chronology_status","legacy_source_key","activity_start","activity_end"]){
     assert.equal(op.after[k],op.baseline_before[k],k);
   }
   assert.equal(op.after.relation_type_id,"7ca4de8f-01d4-542c-acc1-a06848c6742c");
   assert.equal(op.baseline_before.source_count,2);
   for(const side of ["start","end"]){
     const d=op.after["activity_"+side+"_detail"];
     assert.equal(d.granularity,"year");
     assert.equal(d.month,null);
     assert.equal(d.day,null);
     assert.equal(d.year,op.after["activity_"+side]);
     assert.equal(d.certainty,"exact");
   }
   assert.equal(op.after.notes_policy,"PRESERVE_EXACT_LIVE_NOTES");
   assert.equal(op.after.source_links_policy,"PRESERVE_ALL_EXISTING_NORMALIZED_SOURCE_LINKS_AND_LOCATORS");
   const sourceIds=plan.evidence.actual_source_ids_by_activity[op.activity_id];
   assert.equal(sourceIds.length,2);
   assert.equal(new Set(sourceIds).size,2);
   assert.equal(plan.evidence.actual_original_source_locator_keys[op.activity_id].length,2);
 }
 assert.equal(plan.results.activity_relinks,2);
 assert.equal(plan.results.normalized_source_links_on_targets_preserved,4);
 assert.equal(plan.results.gaozong_reign_segments_preserved,2);
});
