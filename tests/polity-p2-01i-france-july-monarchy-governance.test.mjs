import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const require=createRequire(import.meta.url);
const plan=JSON.parse(fs.readFileSync(path.join(root,"corrections/plans/polity-france-july-monarchy-governance-20261009.v1.json"),"utf8"));
const {requireExecutionPlan}=require("../server/atlas-correction-apply-handler.js");
const {synthesizeUnifiedCorrectionV2Manifest}=require("../server/atlas-correction-v2-unified-plan-synthesizer.js");

test("P2-01I: July Monarchy is a source-backed constitutional context on France umbrella, not new country or Person Activity",()=>{
  assert.doesNotThrow(()=>requireExecutionPlan(plan));
  assert.deepEqual(plan.operations,[]);
  assert.deepEqual(plan.polity_relation_assertions,[]);
  assert.equal(plan.execution_rules.production_executable,false);
  assert.equal(plan.execution_rules.production_mutation_authorized,false);
  assert.equal(plan.execution_rules.polity_deletion_forbidden,true);
  assert.deepEqual(plan.stage2_assertions.map(a=>a.type),["assert_source","assert_source","assert_governance_context","assert_governance_period"]);
  const [oath,abdication,context,period]=plan.stage2_assertions;
  assert.match(oath.exact_after.source.canonical_url,/la-charte-constitutionnelle-revisee$/);
  assert.match(abdication.exact_after.source.canonical_url,/revolution-de-fevrier$/);
  assert.equal(oath.exact_before.source_absent_id,oath.exact_after.source.id);
  assert.equal(abdication.exact_before.source_absent_id,abdication.exact_after.source.id);
  assert.equal(context.exact_after.context.governance_type,"constitutional_regime");
  assert.match(context.exact_after.context.canonical_key,/july-monarchy/);
  assert.deepEqual(context.exact_after.names.map(n=>n.locale),["en","fr","ko"]);
  assert.equal(context.exact_after.names[2].name,"프랑스 7월 왕정");
  const g=period.exact_after.period;
  assert.equal(g.polity_id,"1eaa48b6-dc60-49d6-91c4-49db556f4ddf");
  assert.notEqual(g.polity_id,plan.evidence.french_republic_uuid);
  assert.equal(g.governance_context_id,context.exact_after.context.id);
  assert.deepEqual([g.valid_from_year,g.valid_from_month,g.valid_from_day],[1830,8,9]);
  assert.deepEqual([g.valid_to_year,g.valid_to_month,g.valid_to_day],[1848,2,24]);
  assert.equal(g.valid_from_granularity,"day");
  assert.equal(g.valid_to_granularity,"day");
  assert.deepEqual(period.exact_after.source_links.map(x=>x.source_id),[oath.exact_after.source.id,abdication.exact_after.source.id]);
  assert.equal(plan.result.mutated_person_activities,0);
  assert.equal(plan.result.france_family_runtime_expected,65);
});

test("P2-01I: prevents overlap-hiding retroactive 1830 Bourbon state_form rewrites and false terminal family status",()=>{
  const notes=plan.stage2_assertions.at(-1).exact_after.period.notes;
  assert.match(notes,/valid_to_granularity='year'/);
  assert.match(notes,/P2-01I does NOT mutate/);
  assert.match(notes,/separate exact source-aware designation-boundary review/);
  assert.match(notes,/Lafayette's coarse 1827-1830 Activity/);
  assert.match(plan.evidence.no_vested_1789_1852_states_merge,/12 Authoring Activities/);
  assert.match(plan.evidence.no_deletion,/65 current Person Activities/);
  assert.match(plan.evidence.restoration_precision_caveat,/1830 August 2/);
  assert.match(plan.evidence.restoration_precision_caveat,/August 14/);
});

test("P2-01I: reviewed assertion-only plan produces exact 4-op transport without Person writes",()=>{
  const snap={schema:"atlas-correction-v2-target-snapshot/v1",activity_ids:[],activities:[],normalized_activity_source_links:[],chronology_claims:[],relationship_descriptions:[],snapshot_digest:"sha256:"+"b".repeat(64)};
  const manifest=synthesizeUnifiedCorrectionV2Manifest(plan,snap);
  assert.equal(manifest.production_executable,true);
  assert.deepEqual(manifest.operations.map(x=>x.type),["assert_source","assert_source","assert_governance_context","assert_governance_period"]);
  assert.match(manifest.manifest_sha256,/^sha256:[0-9a-f]{64}$/);
  assert.deepEqual(plan.operations,[]);
});
