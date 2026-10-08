import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const require=createRequire(import.meta.url);
const plan=JSON.parse(fs.readFileSync(path.join(root,"corrections/plans/polity-france-vichy-de-facto-governing-regime-20261009.v1.json"),"utf8"));
const {requireExecutionPlan}=require("../server/atlas-correction-apply-handler.js");
const {synthesizeUnifiedCorrectionV2Manifest}=require("../server/atlas-correction-v2-unified-plan-synthesizer.js");

test("P2-01F Vichy may be represented ONLY as bounded, historically sourced de facto governing_regime on France umbrella",()=>{
  assert.doesNotThrow(()=>requireExecutionPlan(plan));
  assert.deepEqual(plan.operations,[]);
  assert.deepEqual(plan.polity_relation_assertions,[]);
  assert.equal(plan.execution_rules.production_executable,false);
  assert.equal(plan.execution_rules.production_mutation_authorized,false);
  assert.equal(plan.stage2_assertions.length,5);
  assert.deepEqual(plan.stage2_assertions.map(x=>x.type),["assert_source","assert_source","assert_source","assert_governance_context","assert_governance_period"]);
  const [a,b,c,ctx,per]=plan.stage2_assertions;
  for(const x of [a,b,c])assert.equal(x.exact_before.source_absent_id,x.exact_after.source.id);
  assert.equal(ctx.exact_after.context.governance_type,"governing_regime");
  assert.equal(ctx.exact_after.context.historicity,"historical");
  assert.match(ctx.exact_after.context.canonical_key,/vichy.*de-facto/);
  assert.deepEqual(ctx.exact_after.names.map(x=>x.locale),["en","fr","ko"]);
  assert.match(ctx.exact_after.names[2].name,/사실상/);
  const x=per.exact_after.period;
  assert.equal(x.polity_id,"1eaa48b6-dc60-49d6-91c4-49db556f4ddf");
  assert.notEqual(x.polity_id,plan.evidence.republic_legal_authority_uuid);
  assert.equal(x.governance_context_id,ctx.exact_after.context.id);
  assert.deepEqual([x.valid_from_year,x.valid_from_month,x.valid_from_day],[1940,7,10]);
  assert.deepEqual([x.valid_to_year,x.valid_to_month,x.valid_to_day],[1944,8,20]);
  assert.equal(per.exact_after.source_links.length,3);
  assert.deepEqual(per.exact_after.source_links.map(s=>s.source_id),[a,b,c].map(s=>s.exact_after.source.id));
  for(const exp of ["autorité de fait","Art.1","Art.7","Sigmaringen","NOT on the legally continuous","exclusive","No Pétain/Laval"]) assert.ok(x.notes.includes(exp),exp);
  assert.match(plan.evidence.currently_no_politically_valid_relation_type_for_country_umbrella_identity,/[Dd][Oo] NOT create/);
  assert.equal(plan.result.changed_person_activities,0);
  assert.equal(plan.result.france_family_authoring_expected,65);
});

test("P2-01F correction transport preserves all validated exact-before metadata",()=>{
  const snap={schema:"atlas-correction-v2-target-snapshot/v1",activity_ids:[],activities:[],normalized_activity_source_links:[],chronology_claims:[],relationship_descriptions:[],snapshot_digest:"sha256:"+"a".repeat(64)};
  const manifest=synthesizeUnifiedCorrectionV2Manifest(plan,snap);
  assert.equal(manifest.production_executable,true);
  assert.deepEqual(manifest.operations.map(x=>x.type),["assert_source","assert_source","assert_source","assert_governance_context","assert_governance_period"]);
  assert.match(manifest.manifest_sha256,/^sha256:[0-9a-f]{64}$/);
  assert.equal(plan.evidence.republic_person_activities,16);
  assert.equal(plan.evidence.country_umbrella_activities,37);
  assert.deepEqual(plan.operations,[]);
});
