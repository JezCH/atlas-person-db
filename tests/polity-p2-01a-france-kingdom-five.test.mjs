import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");
const plan=JSON.parse(read("corrections/plans/polity-france-reintroduced-kingdom-five-relink-20261008.v1.json"));
const exact=new Set([
  "2b038365-e813-49d9-96f5-b205aa6dc65f",
  "e905e9ac-93f5-4344-aaca-0988d38cbd39",
  "1ae0c204-97ad-4e5b-aa80-8e39394c43a3",
  "15d08c77-e784-4695-8951-c62c2757df1b",
  "10d804aa-dd44-44d2-b83d-3dfea8c21482"
]);
test("P2-01A must relink exactly five existing reviewed France activities, no identity retirement",()=>{
  assert.equal(plan.schema,"atlas-stage2-correction-v2-execution-plan/v1");
  assert.equal(plan.operations.length,5);
  assert.equal(new Set(plan.operations.map(x=>x.activity_id)).size,5);
  assert.deepEqual(new Set(plan.operations.map(x=>x.activity_id)),exact);
  for(const op of plan.operations){
    assert.equal(op.type,"rewrite_activity");
    assert.equal(op.baseline_before.polity_id,"7e090994-f196-4957-8295-dcfa08c53fba");
    assert.equal(op.after.polity_id,"1eaa48b6-dc60-49d6-91c4-49db556f4ddf");
    assert.equal(op.after.activity_id,op.activity_id);
    assert.equal(op.after.person_id,op.baseline_before.person_id);
    assert.equal(op.after.role_id,op.baseline_before.role_id);
    assert.equal(op.after.period_basis_id,op.baseline_before.period_basis_id);
    assert.equal(op.after.activity_start,op.baseline_before.activity_start);
    assert.equal(op.after.activity_end,op.baseline_before.activity_end);
    assert.equal(op.after.notes_policy,"PRESERVE_EXACT_LIVE_NOTES");
    assert.equal(op.after.source_links_policy,"PRESERVE_ALL_EXISTING_NORMALIZED_SOURCE_LINKS_AND_LOCATORS");
  }
  const cartier=plan.operations.filter(x=>x.after.person_id==="dd2719b0-95b3-414c-be27-c94e2f73a2d6");
  assert.deepEqual(cartier.map(x=>[x.after.activity_start,x.after.activity_end]),[[1534,1534],[1535,1536],[1541,1542]]);
  assert.deepEqual(plan.operations.map(x=>x.baseline_before.source_count),[1,2,2,2,1]);
  assert.equal(plan.execution_rules.territory_geometry_mutation_forbidden,true);
  assert.equal(plan.execution_rules.production_executable,false);
  assert.equal(plan.execution_rules.production_mutation_authorized,false);
  assert.equal(plan.operations.some(x=>/retire|delete|merge_person/.test(x.type)),false);
});
test("P2-01A additive 1180–1225 state-form protects existing 1226 and Restoration designations",()=>{
  const items=plan.stage2_assertions;
  assert.deepEqual(items.map(x=>x.type),["assert_source","assert_polity_designation"]);
  const d=items[1].exact_after;
  assert.equal(d.designation.polity_id,"1eaa48b6-dc60-49d6-91c4-49db556f4ddf");
  assert.equal(d.designation.designation_type,"state_form");
  assert.equal(d.designation.valid_from_year,1180);
  assert.equal(d.designation.valid_to_year,1225);
  assert.equal(d.designation.valid_from_granularity,"year");
  assert.equal(d.designation.valid_to_granularity,"year");
  assert.equal(items[1].exact_before.designation_absent_id,d.designation.id);
  assert.deepEqual(d.names.map(x=>x.locale+":"+x.name),["en:Kingdom of France","ko:프랑스 왕국"]);
  assert.equal(d.source_links.length,2);
  assert.ok(d.source_links.some(x=>x.source_id==="ddab47ad-a66d-47d5-acab-3136e8ae4c62"));
  assert.ok(d.source_links.some(x=>x.source_id===items[0].exact_after.source.id));
  assert.match(d.designation.notes,/retrospective/);
  assert.equal(plan.evidence.reviewed_prior_designation_id,"70124d31-f22b-4715-bfd8-99cadc18badb");
  assert.equal(plan.evidence.france_family_activity_total_preserved,undefined);
  assert.equal(plan.results.france_family_activity_total_preserved,65);
  assert.equal(plan.results.france_direct_activities_after_expected,37);
  assert.equal(plan.results.kingdom_direct_activities_after_expected,0);
});
