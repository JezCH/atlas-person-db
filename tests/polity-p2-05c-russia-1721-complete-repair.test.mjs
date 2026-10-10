import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { requireExecutionPlan } = require("../server/atlas-correction-apply-handler.js");
const { TEMPORAL_POLITY_DESIGNATION_JOIN_SQL } = require("../server/atlas-polity-temporal-designation-read.js");
const { synthesizeUnifiedCorrectionV2Manifest } = require("../server/atlas-correction-v2-unified-plan-synthesizer.js");
const plan = JSON.parse(readFileSync(new URL("../corrections/plans/polity-russia-tsardom-empire-temporal-1721-20261010.v1.json", import.meta.url), "utf8"));
const tsar = plan.stage2_assertions.find(x => x.type==="assert_polity_designation" && x.exact_after.names.some(n=>n.name==="러시아 차르국")).exact_after;
const empire = plan.stage2_assertions.find(x=>x.type==="assert_polity_designation" && x.exact_after.names.some(n=>n.name==="러시아 제국")).exact_after;
const date=(y,m=1,d=1)=>[y,m,d];
const cmp=(a,b)=>{for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]-b[i]}return 0};
const bounds=x=>[date(x.valid_from_year,x.valid_from_month,x.valid_from_day),date(x.valid_to_year,x.valid_to_month??12,x.valid_to_day??31)];
const contained=(start,end,row)=>{const [from,to]=bounds(row);return cmp(from,start)<=0 && cmp(end,to)<=0};
const activity=id=>plan.operations.find(x=>x.activity_id===id).after;
const start=x=>date(x.activity_start,x.activity_start_detail.month??1,x.activity_start_detail.day??1);
const end=x=>date(x.activity_end,x.activity_end_detail.month??12,x.activity_end_detail.day??31);

test("Russia P2-05C is a guarded current writer plan and preserves identities and source provenance",()=>{
 assert.equal(requireExecutionPlan(plan),plan);
 assert.equal(plan.operations.length,4);
 assert.deepEqual(plan.operations.map(x=>x.type),["rewrite_activity","rewrite_activity","rewrite_activity","rewrite_activity"]);
 assert.deepEqual(plan.stage2_assertions.map(x=>x.type),["assert_source","assert_source","assert_polity_designation","assert_polity_designation"]);
 for(const op of plan.operations){
   assert.equal(op.activity_id,op.after.activity_id);
   assert.equal(op.baseline_before.person_id,op.after.person_id);
   assert.equal(op.baseline_before.polity_id,op.after.polity_id);
   assert.equal(op.baseline_before.role_id,op.after.role_id);
   assert.equal(op.baseline_before.legacy_source_key,op.after.legacy_source_key);
   assert.equal(op.after.notes_policy,"PRESERVE_EXACT_LIVE_NOTES");
   assert.equal(op.after.source_links_policy,"PRESERVE_ALL_EXISTING_NORMALIZED_SOURCE_LINKS_AND_LOCATORS");
 }
 assert.equal(plan.execution_rules.production_executable,false);
 assert.equal(plan.execution_rules.production_mutation_authorized,false);
});
test("1721 full containment yields exactly one historical designation for Ivan and each Peter title",()=>{
 assert.match(TEMPORAL_POLITY_DESIGNATION_JOIN_SQL,/when count\(\*\) = 1/);
 const ivan=activity("d6cdaf3b-2eab-4b98-8a17-b9c42342534f");
 const peterTsar=activity("57cdefa5-9a5d-533c-b229-47e398f1d07a");
 const peterEmperor=activity("9ec53325-3a97-58a8-a7e7-81a496a47e57");
 assert.deepEqual([ivan,peterTsar,peterEmperor].map(x=>[contained(start(x),end(x),tsar.designation),contained(start(x),end(x),empire.designation)]),[[true,false],[true,false],[false,true]]);
 assert.deepEqual([tsar.designation.valid_to_year,tsar.designation.valid_to_month,tsar.designation.valid_to_day],[1721,10,21]);
 assert.deepEqual([empire.designation.valid_from_year,empire.designation.valid_from_month,empire.designation.valid_from_day],[1721,10,22]);
 for(const x of [tsar,empire]){
  assert.equal(x.designation.polity_id,plan.evidence.canonical_polity_uuid);
  assert.equal(x.designation.designation_type,"state_form");
  assert.equal(x.designation.valid_from_calendar,"julian");
 }
});
test("new sources are asserted before other operations by existing unified synthesizer contract",()=>{
 assert.match(synthesizeUnifiedCorrectionV2Manifest.toString(),/sourceAssertions/);
 assert.match(synthesizeUnifiedCorrectionV2Manifest.toString(),/otherAssertions/);
 assert.equal(plan.stage2_assertions.filter(x=>x.type==="assert_source").length,2);
 const ids=new Set(plan.stage2_assertions.filter(x=>x.type==="assert_source").map(x=>x.exact_after.source.id));
 assert.equal(ids.size,2);
 for(const designation of [tsar,empire]) for(const link of designation.source_links)
  assert.ok(ids.has(link.source_id)||link.source_id==="79cd5f2b-c4cf-4abd-863c-b62bc120319d");
});
