import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const plan=JSON.parse(fs.readFileSync(path.join(root,"corrections/plans/polity-french-third-republic-state-form-20261008.v1.json"),"utf8"));
test("P2-01B exactly two reviewed Third Republic Activities must retain identity/chronology and sources",()=>{
  assert.equal(plan.schema,"atlas-stage2-correction-v2-execution-plan/v1");
  assert.equal(plan.operations.length,2);
  assert.deepEqual(plan.operations.map(x=>x.activity_id),["6b528503-9cb7-4015-8c0d-b89b8cfe7fff","93bace7c-b31e-494e-ac60-a5d173659b1d"]);
  for(const op of plan.operations){
    assert.equal(op.type,"rewrite_activity");
    assert.equal(op.baseline_before.polity_id,"3d72277f-c92e-476c-8174-804f700d10cc");
    assert.equal(op.after.polity_id,"b138f5e4-ff83-40f6-bdb1-83b08c0256cb");
    assert.equal(op.after.activity_id,op.activity_id);
    for(const f of ["person_id","role_id","period_basis_id","activity_start","activity_end","confidence","chronology_status","legacy_source_key"])assert.deepEqual(op.after[f],op.baseline_before[f]);
    assert.equal(op.baseline_before.source_count,1);
    assert.equal(op.after.notes_policy,"PRESERVE_EXACT_LIVE_NOTES");
    assert.equal(op.after.source_links_policy,"PRESERVE_ALL_EXISTING_NORMALIZED_SOURCE_LINKS_AND_LOCATORS");
  }
  assert.deepEqual(plan.operations.map(x=>[x.after.activity_start,x.after.activity_end]),[[1910,1910],[1913,1920]]);
  assert.equal(plan.execution_rules.production_executable,false);
  assert.equal(plan.execution_rules.production_mutation_authorized,false);
  assert.equal(plan.execution_rules.territory_geometry_mutation_forbidden,true);
  assert.equal(plan.operations.some(x=>/retire|delete/.test(x.type)),false);
});
test("P2-01B Third Republic era 1870-09-04 to 1940-07-10 remains visible without affecting Fifth Republic",()=>{
  const [src,designation]=plan.stage2_assertions;
  assert.deepEqual(plan.stage2_assertions.map(x=>x.type),["assert_source","assert_polity_designation"]);
  assert.equal(src.exact_before.source_absent_id,src.exact_after.source.id);
  const d=designation.exact_after;
  assert.equal(designation.exact_before.designation_absent_id,d.designation.id);
  assert.equal(d.designation.polity_id,"b138f5e4-ff83-40f6-bdb1-83b08c0256cb");
  assert.equal(d.designation.designation_type,"state_form");
  assert.deepEqual([d.designation.valid_from_year,d.designation.valid_from_month,d.designation.valid_from_day],[1870,9,4]);
  assert.deepEqual([d.designation.valid_to_year,d.designation.valid_to_month,d.designation.valid_to_day],[1940,7,10]);
  assert.deepEqual(d.names.map(x=>x.locale+":"+x.name),["en:French Third Republic","fr:Troisième République","ko:프랑스 제3공화국"]);
  assert.equal(d.source_links.length,2);
  assert.ok(d.source_links.some(x=>x.source_id===src.exact_after.source.id));
  assert.ok(d.source_links.some(x=>x.source_id==="75586017-b4b5-4a93-9148-d00db06bbdc9"));
  assert.match(d.designation.notes,/P2-01C/);
  assert.match(d.designation.notes,/1958/);
  assert.equal(plan.results.third_republic_activities_after_expected,0);
  assert.equal(plan.results.generic_french_republic_activities_after_expected,16);
  assert.equal(plan.results.france_family_total_activities_preserved,65);
  assert.match(plan.evidence.retirement_policy,/explicit user authorization/);
});