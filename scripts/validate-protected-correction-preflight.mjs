import fs from "node:fs";
import { pathToFileURL } from "node:url";

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const digest=/^sha256:[0-9a-f]{64}$/;
const keys=["activities","activity_sources","chronology_claims","relationship_descriptions","polity_relations","polity_relation_sources","sources","polity_sources","governance_contexts","governance_context_names","governance_periods","governance_sources","designations","designation_names","designation_sources","identity_relations","identity_relation_sources"];
const allowed=new Set(["rewrite_activity","split_activity","assert_source","assert_polity_designation"]);
const ensure=(ok,code)=>{if(!ok)throw Error("PREFLIGHT_V2_"+code);};
const obj=x=>x!==null&&typeof x==="object"&&!Array.isArray(x);
const arr=x=>Array.isArray(x)?x:[];
const same=(a,b)=>JSON.stringify([...a].sort())===JSON.stringify([...b].sort());
const unique=a=>new Set(a).size===a.length;
const signature=o=>o.type+":"+(o.activity_id??o.decision_id);
const zero=()=>Object.fromEntries(keys.map(k=>[k,0]));
const links=b=>arr(b?.normalized_source_links);
const linkKey=l=>JSON.stringify([l.source_id,l.source_locator_key]);
function preserve(before,after){
  const a=links(after).map(linkKey);
  ensure(unique(a)&&links(before).every(l=>a.includes(linkKey(l))),"SOURCE_LOSS");
}
function exactKeys(a,b){return obj(a)&&same(Object.keys(a),b);}
export function validateRequest(r){
  ensure(obj(r)&&r.schema==="atlas-protected-correction-preflight/v2"&&r.mode==="dry_run","REQUEST");
  ensure(Number.isSafeInteger(r.pr_number)&&r.pr_number>0&&/^[0-9a-f]{40}$/.test(r.head_sha)&&/^corrections\/plans\/[A-Za-z0-9._-]+\.json$/.test(r.plan_path)&&typeof r.batch_id==="string"&&r.batch_id.length>0,"IDENTITY");
  ensure(Array.isArray(r.activity_ids)&&r.activity_ids.length<=10&&unique(r.activity_ids)&&r.activity_ids.every(id=>typeof id==="string"&&uuid.test(id)),"TARGETS");
  if(r.activity_ids.length===0){
    ensure(Array.isArray(r.polity_ids)&&r.polity_ids.length>=1&&r.polity_ids.length<=10&&unique(r.polity_ids)&&r.polity_ids.every(id=>typeof id==="string"&&uuid.test(id)),"DESIGNATION_TARGETS");
  }else ensure(!Object.hasOwn(r,"polity_ids"),"MIXED_TARGET_PROFILE");
  ensure(exactKeys(r.expected_count_delta,keys)&&keys.every(k=>Number.isSafeInteger(r.expected_count_delta[k])&&r.expected_count_delta[k]>=0&&r.expected_count_delta[k]<=100),"COUNT_CONTRACT");
  return r;
}
export function validateCandidate(r,p){
  validateRequest(r);
  ensure(obj(p)&&p.schema==="atlas-stage2-correction-v2-execution-plan/v1"&&p.batch_id===r.batch_id&&p.execution_rules?.production_executable===false&&p.execution_rules?.production_mutation_authorized===false,"PLAN");
  ensure(Array.isArray(p.operations)&&p.operations.length===r.activity_ids.length&&same(p.operations.map(o=>o.activity_id),r.activity_ids),"PLAN_TARGETS");
  ensure(Array.isArray(p.stage2_assertions)&&p.stage2_assertions.length<=10&&arr(p.polity_relation_assertions).length===0&&arr(p.companion_assertions).length===0,"ASSERTION_SCOPE");
  const ops=[...p.operations,...p.stage2_assertions];
  if(r.activity_ids.length===0){
    const designations=p.stage2_assertions.filter(o=>o.type==="assert_polity_designation");
    ensure(designations.length>0&&same([...new Set(designations.map(o=>o.exact_after?.designation?.polity_id))],r.polity_ids),"PLAN_DESIGNATION_TARGETS");
    const ids=designations.map(o=>o.exact_after?.designation?.id);
    ensure(unique(ids),"DESIGNATION_DUPLICATE");
    const referenced=new Set(designations.flatMap(o=>arr(o.exact_after?.source_links).map(l=>l.source_id)));
    ensure(p.stage2_assertions.filter(o=>o.type==="assert_source").every(o=>referenced.has(o.exact_after?.source?.id)),"UNRELATED_SOURCE");
  }
  ensure(ops.every(o=>allowed.has(o.type))&&p.operations.every(o=>["rewrite_activity","split_activity"].includes(o.type))&&p.stage2_assertions.every(o=>["assert_source","assert_polity_designation"].includes(o.type))&&unique(ops.map(signature)),"OPERATION_SCOPE");
  const delta=zero(), newIds=[];
  const add=t=>{ensure(!arr(t?.replace_source_links).length,"SOURCE_REPLACEMENT");const a=arr(t?.add_source_links);ensure(a.every(l=>uuid.test(l.source_id)&&typeof l.source_locator_key==="string"&&l.source_locator_key.length>0)&&unique(a.map(l=>l.source_id)),"ADDITIONS");return a.length;};
  for(const o of p.operations){
    ensure(Number.isSafeInteger(o.baseline_before?.source_count)&&o.baseline_before.source_count>=0,"BASELINE");
    if(o.type==="rewrite_activity"){
      ensure(o.after?.activity_id===o.activity_id,"SURVIVOR");
      delta.activity_sources+=add(o.after);
    }else{
      ensure(Array.isArray(o.fragments)&&o.fragments.length>=2&&o.fragments.length<=10,"FRAGMENTS");
      const s=o.fragments.filter(f=>f.survivor===true);
      ensure(s.length===1&&s[0].activity_id===o.activity_id,"SURVIVOR");
      delta.activity_sources+=add(s[0]);
      for(const f of o.fragments.filter(f=>f!==s[0])){
        ensure(f.survivor===false&&uuid.test(f.activity_id)&&!r.activity_ids.includes(f.activity_id)&&(!f.source_copy_policy||f.source_copy_policy==="COPY_EXISTING"),"FRAGMENT_ID_OR_COPY");
        newIds.push(f.activity_id);delta.activities++;delta.activity_sources+=o.baseline_before.source_count+add(f);
      }
    }
  }
  ensure(unique(newIds),"FRAGMENT_DUPLICATE");
  for(const a of p.stage2_assertions){
    ensure(typeof a.decision_id==="string"&&a.decision_id.length>0,"DECISION");
    if(a.type==="assert_source"){ensure(uuid.test(a.exact_after?.source?.id)&&a.exact_before?.source_absent_id===a.exact_after.source.id,"SOURCE_ID");delta.sources++;}
    else{const d=a.exact_after;ensure(uuid.test(d?.designation?.id)&&a.exact_before?.designation_absent_id===d.designation.id&&Array.isArray(d.names)&&d.names.length>0&&Array.isArray(d.source_links)&&d.source_links.length>0,"DESIGNATION");delta.designations++;delta.designation_names+=d.names.length;delta.designation_sources+=d.source_links.length;}
  }
  ensure(keys.every(k=>delta[k]===r.expected_count_delta[k]),"PLAN_DELTA");
  return ops;
}
export function validateResponse(r,p,x){
  const planOps=validateCandidate(r,p);
  ensure(x?.ok===true&&x.marker==="ATLAS_CORRECTION_MANIFEST_V2"&&x.schema==="atlas-correction-manifest/v2"&&x.dry_run===true&&x.committed===false&&x.replay===false&&digest.test(x.exact_live_snapshot_digest)&&digest.test(x.manifest_sha256),"RESPONSE");
  const result=x.result;
  ensure(obj(result)&&Array.isArray(result.operations)&&same(result.operations.map(signature),planOps.map(signature)),"RESPONSE_OPERATIONS");
  ensure(exactKeys(result.before_counts,keys)&&exactKeys(result.after_counts,keys)&&exactKeys(result.expected_count_delta,keys),"RESPONSE_COUNT_KEYS");
  for(const k of keys){const b=result.before_counts[k],a=result.after_counts[k];ensure(Number.isSafeInteger(b)&&b>=0&&Number.isSafeInteger(a)&&a>=0&&a-b===r.expected_count_delta[k]&&result.expected_count_delta[k]===r.expected_count_delta[k],"RESPONSE_DELTA_"+k);}
  for(const o of result.operations){
    const candidate=planOps.find(t=>signature(t)===signature(o));
    if(o.type==="rewrite_activity"){ensure(o.exact_before?.activity?.id===o.activity_id&&o.exact_after?.activity?.id===o.activity_id,"RESPONSE_SURVIVOR");preserve(o.exact_before,o.exact_after);}
    else if(o.type==="split_activity"){
      ensure(o.exact_before?.activity?.id===o.activity_id&&o.survivor_fragment?.activity?.id===o.activity_id&&same(arr(o.new_fragments).map(f=>f.activity?.id),candidate.fragments.filter(f=>!f.survivor).map(f=>f.activity_id)),"RESPONSE_FRAGMENTS");
      preserve(o.exact_before,o.survivor_fragment);for(const f of o.new_fragments)preserve(o.exact_before,f);
    }else{const field=o.type==="assert_source"?"source":"designation";ensure(o.exact_after?.[field]?.id===candidate.exact_after[field].id,"RESPONSE_ASSERTION_ID");if(r.activity_ids.length===0&&field==="designation"){ensure(o.exact_after.designation.polity_id===candidate.exact_after.designation.polity_id,"RESPONSE_DESIGNATION_TARGET");}}
  }
  return {marker:x.marker,dry_run:true,committed:false,replay:false,deployment_sha:x.deployment_sha,exact_live_snapshot_digest:x.exact_live_snapshot_digest,manifest_sha256:x.manifest_sha256,candidate_head:r.head_sha,candidate_path:r.plan_path,before_counts:result.before_counts,after_counts:result.after_counts,expected_count_delta:r.expected_count_delta,targets:result.operations};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const [mode,request,candidate,response]=process.argv.slice(2);
  const read=f=>JSON.parse(fs.readFileSync(f,"utf8"));
  const r=read(request);
  if(mode==="request")validateRequest(r);
  else if(mode==="candidate")validateCandidate(r,read(candidate));
  else if(mode==="response")console.log(JSON.stringify(validateResponse(r,read(candidate),read(response)),null,2));
  else throw Error("PREFLIGHT_V2_INVALID_MODE");
}
