import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {validateCandidate,validateResponse} from "../scripts/validate-protected-correction-preflight.mjs";
const n="e65edaa4-645a-479f-be81-6414ff2f71ba",s="e100c855-4559-5431-8c72-61909a8da746",f="088575ca-351b-5d7e-a448-c13ce722b71f",src="65637ed7-437f-52d5-904e-3c385f9dfb0f",des="c0333dfb-0a60-5277-8bfc-3d7652c936e0",old="ada1dd54-29eb-4d43-ac83-5c6fbc665b13";
const delta={activities:1,activity_sources:5,chronology_claims:0,relationship_descriptions:0,polity_relations:0,polity_relation_sources:0,sources:1,polity_sources:0,governance_contexts:0,governance_context_names:0,governance_periods:0,governance_sources:0,designations:1,designation_names:2,designation_sources:2,identity_relations:0,identity_relation_sources:0};
const link=id=>({source_id:id,source_locator_key:"https://example.org/"+id});
function fixture(){
 const r={schema:"atlas-protected-correction-preflight/v2",mode:"dry_run",pr_number:2889,head_sha:"a".repeat(40),plan_path:"corrections/plans/test.json",batch_id:"test",activity_ids:[n,s],expected_count_delta:{...delta}};
 const p={schema:"atlas-stage2-correction-v2-execution-plan/v1",batch_id:r.batch_id,execution_rules:{production_executable:false,production_mutation_authorized:false},operations:[{type:"split_activity",activity_id:n,baseline_before:{source_count:2},fragments:[{survivor:true,activity_id:n,add_source_links:[link(src)]},{survivor:false,activity_id:f,add_source_links:[link(src)],source_copy_policy:"COPY_EXISTING"}]},{type:"rewrite_activity",activity_id:s,baseline_before:{source_count:2},after:{activity_id:s,add_source_links:[link(src)]}}],stage2_assertions:[{type:"assert_source",decision_id:"src",exact_before:{source_absent_id:src},exact_after:{source:{id:src}}},{type:"assert_polity_designation",decision_id:"des",exact_before:{designation_absent_id:des},exact_after:{designation:{id:des},names:[{},{}],source_links:[link(src),link(old)]}}],polity_relation_assertions:[]};
 const bundle=(id,add=false)=>({activity:{id},normalized_source_links:[link(old),link("5f87d882-42d0-4f1a-ba63-267796d3da56"),...(add?[link(src)]:[])]});
 const x={ok:true,marker:"ATLAS_CORRECTION_MANIFEST_V2",schema:"atlas-correction-manifest/v2",dry_run:true,committed:false,replay:false,exact_live_snapshot_digest:"sha256:"+"b".repeat(64),manifest_sha256:"sha256:"+"c".repeat(64),result:{operations:[{...p.stage2_assertions[0]},{type:"split_activity",activity_id:n,exact_before:bundle(n),survivor_fragment:bundle(n,true),new_fragments:[bundle(f,true)]},{type:"rewrite_activity",activity_id:s,exact_before:bundle(s),exact_after:bundle(s,true)},{...p.stage2_assertions[1]}],before_counts:Object.fromEntries(Object.keys(delta).map(k=>[k,100])),after_counts:Object.fromEntries(Object.keys(delta).map(k=>[k,100+delta[k]])),expected_count_delta:{...delta}}};
 return {r,p,x};
}
test("non-destructive split, rewrite and designation dry-run contract",()=>{const {r,p,x}=fixture();assert.equal(validateCandidate(r,p).length,4);assert.equal(validateResponse(r,p,x).committed,false);});
test("reject apply, replay, destructive operation, source loss and drift",()=>{
 for(const change of [a=>a.r.mode="apply",a=>a.p.operations[0].type="retire_activity",a=>a.p.execution_rules.production_mutation_authorized=true,a=>a.p.operations[0].fragments[1].source_copy_policy="DO_NOT_COPY_EXISTING",a=>a.x.committed=true,a=>a.x.replay=true,a=>a.x.result.operations[1].new_fragments[0].normalized_source_links.shift(),a=>a.x.result.after_counts.activities++,a=>a.x.result.operations.pop(),a=>a.r.expected_count_delta.sources=0]){
  const a=fixture();change(a);assert.throws(()=>validateResponse(a.r,a.p,a.x),/PREFLIGHT_V2_/);
 }
});
test("workflow retains v1 exact guards, immutable head, mixed-input rejection and literal rollback-only mode",()=>{
 const w=fs.readFileSync(new URL("../.github/workflows/atlas-correction-apply.yml",import.meta.url),"utf8");
 assert.match(w,/length==4 and \(unique\|length\)==4/);
 assert.match(w,/PREFLIGHT_CANDIDATE_HEAD_MOVED/);
 assert.match(w,/PREFLIGHT_MIXED_WITH_MUTATION_FORBIDDEN/);
 assert.match(w,/mode:"dry_run",plan:\$plan\[0\]/);
 assert.match(w,/validate-protected-correction-preflight\.mjs response/);
});

function designationOnly(){
 const {r,p,x}=fixture();
 const polity="1a97dec2-dc1c-4e44-8546-e19bc6117ad5";
 r.activity_ids=[];r.polity_ids=[polity];r.expected_count_delta.activities=0;r.expected_count_delta.activity_sources=0;
 p.operations=[];
 p.stage2_assertions[1].exact_after.designation.polity_id=polity;
 x.result.operations=structuredClone(p.stage2_assertions);
 x.result.expected_count_delta={...r.expected_count_delta};
 x.result.after_counts=Object.fromEntries(Object.keys(delta).map(k=>[k,100+r.expected_count_delta[k]]));
 return {r,p,x};
}
test("assertion-only protected preflight requires explicit polity scope and zero Activity changes",()=>{
 const {r,p,x}=designationOnly();
 assert.equal(validateCandidate(r,p).length,2);
 assert.equal(validateResponse(r,p,x).committed,false);
 for(const change of [
   a=>delete a.r.polity_ids,
   a=>a.r.polity_ids=[],
   a=>a.r.polity_ids=[n],
   a=>a.r.polity_ids.push(s),
   a=>a.p.stage2_assertions[1].exact_after.designation.polity_id=s,
   a=>a.p.stage2_assertions.pop(),
   a=>a.p.stage2_assertions[1].exact_after.source_links=[link(old)],
   a=>a.x.result.operations[1].exact_after.designation.polity_id=s,
   a=>a.x.result.after_counts.activities++,
   a=>a.r.activity_ids=[n],
   a=>a.p.operations.push(fixture().p.operations[0])
 ]){
  const a=designationOnly();change(a);assert.throws(()=>validateResponse(a.r,a.p,a.x),/PREFLIGHT_V2_/);
 }
});
