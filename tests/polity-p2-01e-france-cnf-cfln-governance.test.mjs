import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const require=createRequire(import.meta.url);
const plan=JSON.parse(fs.readFileSync(path.join(root,"corrections/plans/polity-france-cnf-cfln-governance-only-20261008.v1.json"),"utf8"));
const {requireExecutionPlan}=require("../server/atlas-correction-apply-handler.js");
const {synthesizeUnifiedCorrectionV2Manifest}=require("../server/atlas-correction-v2-unified-plan-synthesizer.js");

test("P2-01E uses audited Stage 2 assertion-only writer with source first and no Person mutation",()=>{
  assert.doesNotThrow(()=>requireExecutionPlan(plan));
  assert.deepEqual(plan.operations,[]);
  assert.equal(plan.execution_rules.production_executable,false);
  assert.equal(plan.execution_rules.production_mutation_authorized,false);
  assert.equal(plan.execution_rules.assertion_only_scope,true);
  assert.deepEqual(plan.stage2_assertions.map(x=>x.type),["assert_source","assert_governance_context","assert_governance_context","assert_governance_period","assert_governance_period"]);
  const snapshot={schema:"atlas-correction-v2-target-snapshot/v1",activity_ids:[],activities:[],normalized_activity_source_links:[],chronology_claims:[],relationship_descriptions:[],snapshot_digest:"sha256:"+"1".repeat(64)};
  const manifest=synthesizeUnifiedCorrectionV2Manifest(plan,snapshot);
  assert.equal(manifest.production_executable,true);
  assert.equal(manifest.operations.length,5);
  assert.match(manifest.manifest_sha256,/^sha256:[0-9a-f]{64}$/);
  assert.equal(plan.result.mutated_person_activities,0);
});

test("P2-01E exact Free France CNF/CFLN authority intervals and normalized evidence",()=>{
  const [source,cnf,cfln,cnfPeriod,cflnPeriod]=plan.stage2_assertions;
  assert.equal(source.exact_after.source.canonical_url,"https://www.assemblee-nationale.fr/dyn/histoire-et-patrimoine/deuxieme-guerre-mondiale/institution-du-comite-national-francais");
  assert.equal(cnf.exact_after.context.canonical_key,"stage2:free-french-national-committee-1941-1943");
  assert.equal(cfln.exact_after.context.canonical_key,"stage2:french-committee-of-national-liberation-1943-1944");
  assert.equal(cnf.exact_after.context.governance_type,"government");
  assert.equal(cfln.exact_after.context.governance_type,"government");
  assert.deepEqual(cnf.exact_after.names.map(x=>x.locale),["en","fr","ko"]);
  assert.deepEqual(cfln.exact_after.names.map(x=>x.locale),["en","fr","ko"]);
  const a=cnfPeriod.exact_after.period,b=cflnPeriod.exact_after.period;
  assert.equal(a.polity_id,"b138f5e4-ff83-40f6-bdb1-83b08c0256cb");
  assert.equal(b.polity_id,a.polity_id);
  assert.equal(a.governance_context_id,cnf.exact_after.context.id);
  assert.equal(b.governance_context_id,cfln.exact_after.context.id);
  assert.deepEqual([a.valid_from_year,a.valid_from_month,a.valid_from_day],[1941,9,24]);
  assert.deepEqual([a.valid_to_year,a.valid_to_month,a.valid_to_day],[1943,6,2]);
  assert.deepEqual([b.valid_from_year,b.valid_from_month,b.valid_from_day],[1943,6,3]);
  assert.deepEqual([b.valid_to_year,b.valid_to_month,b.valid_to_day],[1944,6,2]);
  assert.equal(cnfPeriod.exact_after.source_links[0].source_id,source.exact_after.source.id);
  assert.equal(cflnPeriod.exact_after.source_links[0].source_id,"4c0ef4bf-c14c-4577-ae2e-f10f779f66ea");
  assert.equal(plan.evidence.existing_gprf_start,"1944-06-03");
  assert.match(plan.evidence.scope_caveat,/Vichy de facto/);
  assert.match(plan.evidence.no_deletion,/LIVE/);
  assert.equal(plan.result.france_family_authoring_expected,65);
  assert.equal(plan.result.france_family_runtime_expected,65);
});
