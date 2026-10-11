import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const {requireExecutionPlan}=require("../server/atlas-correction-apply-handler.js");
const {normalizeStage2AssertionOperation,stage2AssertionCountDelta}=require("../server/atlas-correction-v2-stage2-assertions.js");
const {synthesizeUnifiedCorrectionV2Manifest}=require("../server/atlas-correction-v2-unified-plan-synthesizer.js");
const {requireUnifiedV2Manifest,unifiedCountDeltas}=require("../server/atlas-correction-manifest-v2-unified-service.js");
const {TEMPORAL_POLITY_DESIGNATION_JOIN_SQL}=require("../server/atlas-polity-temporal-designation-read.js");

const plan=JSON.parse(fs.readFileSync(new URL("../corrections/plans/polity-sweden-historiographic-stormaktstiden-20261011.v1.json",import.meta.url),"utf8"));
const Sweden="93613017-b4c4-5f82-8e96-3ce6b2d3a61e";
const SwedenNorway="a47f57af-8ac2-4724-81b0-43074c64f84c";
const sourceIds=["2e1bd0b9-9b74-5870-bab9-9d05dbd45e81","80b599d8-8f2c-5974-873b-5790057199c0"];
const designationId="bf92c969-7557-51b9-87c9-6aa650e75495";

test("authenticated plan contains exactly two academically identified sources and one Swedish historiographic era",()=>{
 assert.equal(requireExecutionPlan(plan),plan);
 assert.equal(plan.operations.length,0);
 assert.deepEqual(plan.stage2_assertions.map(x=>x.type),["assert_source","assert_source","assert_polity_designation"]);
 assert.equal(plan.execution_rules.production_executable,false);
 assert.equal(plan.execution_rules.production_mutation_authorized,false);
 assert.equal(plan.execution_rules.no_person_activity_or_source_link_rewrite,true);
 assert.equal(plan.execution_rules.no_polity_create_merge_relink_delete,true);
 assert.equal(plan.evidence.source_inventory_workflow,38128160741);
 assert.equal(plan.evidence.actual_sweden_designation_count_before,0);
 for(const [index,row] of plan.stage2_assertions.slice(0,2).entries()){
   assert.equal(row.exact_before.source_absent_id,sourceIds[index]);
   assert.equal(row.exact_after.source.id,sourceIds[index]);
   assert.match(row.exact_after.source.canonical_url,/^https:\/\//);
   assert.ok(row.exact_after.source.citation_text);
 }
 const b=plan.stage2_assertions[2];
 assert.equal(b.exact_before.designation_absent_id,designationId);
 assert.equal(b.exact_after.designation.id,designationId);
 assert.equal(b.exact_after.designation.polity_id,Sweden);
 assert.equal(b.exact_after.designation.designation_type,"historiographic_period");
 assert.equal(b.exact_after.designation.valid_from_year,1611);
 assert.equal(b.exact_after.designation.valid_to_year,1718);
 for(const p of ["valid_from","valid_to"]) {
   assert.equal(b.exact_after.designation[p+"_month"],null);
   assert.equal(b.exact_after.designation[p+"_day"],null);
   assert.equal(b.exact_after.designation[p+"_granularity"],"year");
 }
 assert.equal(b.exact_after.names.length,2);
 assert.deepEqual(b.exact_after.names.map(x=>[x.locale,x.name]).sort(),
   [["en","Swedish Empire"],["ko","스웨덴 제국"]]);
 assert.equal(new Set(b.exact_after.names.map(x=>x.id)).size,2);
 assert.deepEqual(b.exact_after.source_links.map(x=>x.source_id).sort(),[...sourceIds].sort());
 assert.equal(plan.evidence.existing_sweden_norway_union_id,SwedenNorway);
 assert.equal(plan.evidence.four_required_display_activity_ids.length,4);
 assert.equal(plan.stage2_assertions.some(x=>x.type.includes("polity_identity_relation")||x.type.includes("rewrite_activity")),false);
});
test("canonical source-before-designation synthesis yields only allowed global count deltas and exact trace",()=>{
 const snapshot={schema:"atlas-correction-v2-target-snapshot/v1",snapshot_digest:"sha256:"+"a".repeat(64),
   activity_ids:[],activities:[],normalized_activity_source_links:[],chronology_claims:[],relationship_descriptions:[]};
 const target=synthesizeUnifiedCorrectionV2Manifest(plan,snapshot);
 const normalized=requireUnifiedV2Manifest(target);
 const expected=plan.stage2_assertions.map((x,i)=>normalizeStage2AssertionOperation(x,i+1));
 assert.deepEqual(normalized.operations,expected);
 const delta=unifiedCountDeltas(normalized.operations);
 assert.equal(delta.sources,2);
 assert.equal(delta.designations,1);
 assert.equal(delta.designation_names,2);
 assert.equal(delta.designation_sources,2);
 assert.equal(delta.polity_sources,0);
 for(const [key,val] of Object.entries(delta)) if(!["sources","designations","designation_names","designation_sources"].includes(key))assert.equal(val,0,key);
 assert.equal(stage2AssertionCountDelta(normalized.operations[2]).designations,1);
});
test("real temporal resolver requires exactly one full-span containing designation and forbids guessing when ambiguous",()=>{
 assert.match(TEMPORAL_POLITY_DESIGNATION_JOIN_SQL,/count\(\*\) = 1/);
 assert.match(TEMPORAL_POLITY_DESIGNATION_JOIN_SQL,/pd\.polity_id = pp\.polity_id/);
 assert.match(TEMPORAL_POLITY_DESIGNATION_JOIN_SQL,/pd\.valid_from_year/);
 assert.match(TEMPORAL_POLITY_DESIGNATION_JOIN_SQL,/pd\.valid_to_year/);
 assert.match(TEMPORAL_POLITY_DESIGNATION_JOIN_SQL,/td_en/);
 assert.match(TEMPORAL_POLITY_DESIGNATION_JOIN_SQL,/td_ko/);
});
