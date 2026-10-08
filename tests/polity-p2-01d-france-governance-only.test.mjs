import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";

const require=createRequire(import.meta.url);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");
const plan=JSON.parse(read("corrections/plans/polity-france-gprf-fourth-governance-only-20261008.v1.json"));
const {requireExecutionPlan}=require("../server/atlas-correction-apply-handler.js");
const {normalizeV2SnapshotActivityIds,createCorrectionV2TargetSnapshot}=require("../server/atlas-correction-v2-snapshot-service.js");
const {synthesizeUnifiedCorrectionV2Manifest}=require("../server/atlas-correction-v2-unified-plan-synthesizer.js");

test("P2-01D authorizes assertions-only ONLY for scoped typed Governance Context/period plans",()=>{
  assert.doesNotThrow(()=>requireExecutionPlan(plan));
  assert.deepEqual(plan.operations,[]);
  assert.equal(plan.execution_rules.production_executable,false);
  assert.equal(plan.execution_rules.production_mutation_authorized,false);
  assert.equal(plan.execution_rules.assertion_only_scope,true);
  for(const bad of [
    {...plan,stage2_assertions:[]},
    {...plan,stage2_assertions:[plan.stage2_assertions[0]]},
    {...plan,stage2_assertions:[{type:"retire_activity"}]},
    {...plan,stage2_assertions:[...plan.stage2_assertions,{type:"assert_polity_identity_relation"}]}
  ])assert.throws(()=>requireExecutionPlan(bad),/ASSERTION_ONLY_SCOPE_INVALID/);
  assert.throws(()=>requireExecutionPlan({...plan,operations:null}),/OPERATIONS_REQUIRED/);
  assert.throws(()=>requireExecutionPlan({...plan,execution_rules:{production_executable:true,production_mutation_authorized:true}}),/PREMATURE_PRODUCTION_AUTHORIZATION/);
});

test("P2-01D zero-Activity snapshot is explicitly gated, read-only, and rehashes six normalized Stage2 assertions",async()=>{
  assert.throws(()=>normalizeV2SnapshotActivityIds([]),/ACTIVITY_IDS_REQUIRED/);
  assert.deepEqual(normalizeV2SnapshotActivityIds([],{allowEmpty:true}),[]);
  const calls=[];
  const client={
    async query(sql,args=[]){
      calls.push({sql:String(sql),args});
      if(/^begin isolation level repeatable read read only$/i.test(sql)||/^commit$/i.test(sql))return {rows:[]};
      if(/current_setting\('transaction_read_only'\)/.test(sql))return {rows:[{read_only:"on"}]};
      if(/from atlas_v2\./.test(sql)){assert.deepEqual(args,[[]]);return {rows:[]};}
      throw new Error("Unexpected query: "+sql);
    }
  };
  const snapshot=await createCorrectionV2TargetSnapshot(client,[],{allowEmpty:true});
  assert.equal(snapshot.read_only,true);
  assert.equal(snapshot.committed,false);
  assert.deepEqual(snapshot.activity_ids,[]);
  assert.match(snapshot.snapshot_digest,/^sha256:[0-9a-f]{64}$/);
  assert.equal(calls.filter(x=>x.sql==="commit").length,1);
  const manifest=synthesizeUnifiedCorrectionV2Manifest(plan,snapshot);
  assert.deepEqual(manifest.operations.map(x=>x.type),["assert_source","assert_source","assert_governance_context","assert_governance_context","assert_governance_period","assert_governance_period"]);
  assert.equal(manifest.production_executable,true);
  assert.equal(manifest.exact_live_snapshot_digest,snapshot.snapshot_digest);
  assert.ok(manifest.manifest_sha256.startsWith("sha256:"));
});

test("P2-01D exact France GPRF/Fourth constitutional facts and unrelated Person preservation",()=>{
  const a=plan.stage2_assertions;
  const republic="b138f5e4-ff83-40f6-bdb1-83b08c0256cb";
  assert.equal(a.length,6);
  const [srcG,src4,ctxG,ctx4,periodG,period4]=a;
  for(const x of [srcG,src4])assert.equal(x.type,"assert_source");
  for(const x of [ctxG,ctx4])assert.equal(x.type,"assert_governance_context");
  for(const x of [periodG,period4])assert.equal(x.type,"assert_governance_period");
  assert.equal(ctxG.exact_after.context.governance_type,"government");
  assert.equal(ctx4.exact_after.context.governance_type,"constitutional_regime");
  assert.deepEqual(ctxG.exact_after.names.map(x=>x.locale),["en","fr","ko"]);
  assert.deepEqual(ctx4.exact_after.names.map(x=>x.locale),["en","fr","ko"]);
  const g=periodG.exact_after.period,f=period4.exact_after.period;
  assert.equal(g.polity_id,republic);assert.equal(f.polity_id,republic);
  assert.equal(g.governance_context_id,ctxG.exact_after.context.id);
  assert.equal(f.governance_context_id,ctx4.exact_after.context.id);
  assert.deepEqual([g.valid_from_year,g.valid_from_month,g.valid_from_day],[1944,6,3]);
  assert.deepEqual([g.valid_to_year,g.valid_to_month,g.valid_to_day],[1946,12,24]);
  assert.deepEqual([f.valid_from_year,f.valid_from_month,f.valid_from_day],[1946,12,24]);
  assert.deepEqual([f.valid_to_year,f.valid_to_month,f.valid_to_day],[1958,10,3]);
  assert.match(f.notes,/27 October 1946/);
  assert.match(f.notes,/4 October 1958/);
  assert.match(g.notes,/De Gaulle/);
  assert.deepEqual(periodG.exact_after.source_links.map(x=>x.source_id),[srcG.exact_after.source.id,src4.exact_after.source.id]);
  assert.equal(period4.exact_after.source_links[0].source_id,src4.exact_after.source.id);
  assert.equal(plan.result.mutated_person_activities,0);
  assert.equal(plan.result.france_family_authoring_expected,65);
  assert.equal(plan.result.france_family_runtime_expected,65);
  assert.match(plan.evidence.retirement_policy,/No Polity\/Person\/Activity deletions/);
  const workflow=read(".github/workflows/atlas-correction-apply.yml");
  assert.match(workflow,/assert_governance_context/);
  assert.match(workflow,/assert_governance_period/);
});
