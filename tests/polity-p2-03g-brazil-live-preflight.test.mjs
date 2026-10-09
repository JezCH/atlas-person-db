import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const {
  queryBrazilPreflight,summarizeBrazilPreflightRows,
  BRAZIL_P2_03E_POLITY_IDS,BRAZIL_P2_03G_EXPECTED_ACTIVITIES,
  BRAZIL_P2_03G_SOURCE_URLS
}=require("../server/atlas-polity-reference-audit-handler.js");

const ids=Object.keys(BRAZIL_P2_03G_EXPECTED_ACTIVITIES);
const historical=ids.map(id=>({
  activity_id:id, polity_id:BRAZIL_P2_03G_EXPECTED_ACTIVITIES[id].polity_id,
  activity:{activity_start:BRAZIL_P2_03G_EXPECTED_ACTIVITIES[id].activity_start,
    activity_end:BRAZIL_P2_03G_EXPECTED_ACTIVITIES[id].activity_end}
}));
const runtime=historical.map(a=>({polity_id:a.polity_id,runtime_activity:{id:a.activity_id}}));

test("exact ten historical UUIDs include Afonso Pena and both Pedro rulers",()=>{
  assert.equal(ids.length,10);
  assert.equal(new Set(ids).size,10);
  assert.ok(ids.includes("7a021719-8a81-4367-9fd1-64e75f996563"));
  assert.equal(historical.filter(a=>a.polity_id===BRAZIL_P2_03E_POLITY_IDS[0]).length,2);
  assert.equal(historical.filter(a=>a.polity_id===BRAZIL_P2_03E_POLITY_IDS[1]).length,1);
  assert.equal(historical.filter(a=>a.polity_id===BRAZIL_P2_03E_POLITY_IDS[2]).length,7);
});

test("exact-before match and Runtime FK counts do NOT assert content-parity",()=>{
  const result=summarizeBrazilPreflightRows(historical,runtime);
  assert.equal(result.authoring_exact_before_match,true);
  assert.equal(result.matched,10);
  assert.equal(result.runtime_count_parity,true);
  assert.deepEqual(result.missing,[]);
  assert.deepEqual(result.drift,[]);
  assert.deepEqual(result.extra,[]);
});

test("moved, missing, new, or year-drifted Activities all block before-state success",()=>{
  const moved=historical.map(a=>({...a,activity:{...a.activity}}));
  moved[2].polity_id=BRAZIL_P2_03E_POLITY_IDS[2];
  const r=summarizeBrazilPreflightRows(moved,runtime);
  assert.equal(r.authoring_exact_before_match,false);
  assert.equal(r.drift.length,1);
  const missing=summarizeBrazilPreflightRows(historical.slice(1),runtime);
  assert.equal(missing.authoring_exact_before_match,false);
  assert.equal(missing.missing.length,1);
  const added=summarizeBrazilPreflightRows([...historical,{activity_id:"11111111-1111-4111-8111-111111111111",polity_id:BRAZIL_P2_03E_POLITY_IDS[2],activity:{activity_start:2020,activity_end:2021}}],runtime);
  assert.equal(added.authoring_exact_before_match,false);
  assert.equal(added.extra.length,1);
  const changed=historical.map(a=>({...a,activity:{...a.activity}}));
  changed[3].activity.activity_end=9999;
  assert.equal(summarizeBrazilPreflightRows(changed,runtime).drift.length,1);
});

test("Runtime cardinality mismatch fails closed without inventing row equivalence",()=>{
  const check=summarizeBrazilPreflightRows(historical,runtime.slice(0,9));
  assert.equal(check.runtime_count_parity,false);
  assert.equal(check.authoring_exact_before_match,true);
});

test("exact primary-source URL array comes from official domains only",()=>{
  assert.equal(BRAZIL_P2_03G_SOURCE_URLS.length,7);
  for(const item of BRAZIL_P2_03G_SOURCE_URLS){
    const u=new URL(item);
    assert.equal(u.protocol,"https:");
    assert.match(u.hostname,/camara|presidencia|planalto|senado/);
  }
});

test("live query contracts are parameter-bound and are SELECT only",async()=>{
  const statements=[];
  const fake={async query(sql,params=[]){
    statements.push({sql,params});
    if(sql.includes("from atlas_v2.person_politics_v2 a") && sql.includes("as activity")) return {rows:historical};
    if(sql.includes("from atlas_v2.person_politics_sources pps")) return {rows:[]};
    if(sql.includes("from atlas_v2.runtime_person_politics_v1 r")) return {rows:runtime};
    if(sql.includes("from atlas_v2.sources s") && sql.includes("s.canonical_url=any")) return {rows:[]};
    if(sql.includes("from atlas_v2.polity_identity_retirements r")) return {rows:[]};
    if(sql.includes("from information_schema.columns c")) return {rows:[]};
    throw new Error("Unexpected SQL");
  }};
  const x=await queryBrazilPreflight(fake);
  assert.equal(x.summary.matched,10);
  assert.equal(x.summary.runtime_row_content_parity_checked,false);
  assert.equal(x.source_matches.length,0);
  assert.deepEqual(x.source_candidate_urls,BRAZIL_P2_03G_SOURCE_URLS);
  assert.equal(statements.length,6);
  for(const {sql,params} of statements){
    assert.match(sql.trim(),/^select /i);
    assert.doesNotMatch(sql,/\b(insert|update|delete|alter|drop|create|truncate)\b/i);
    assert.ok(params.length>0);
  }
  assert.deepEqual(statements[0].params[0],[...BRAZIL_P2_03E_POLITY_IDS]);
  assert.deepEqual(statements[0].params[1],ids);
  assert.deepEqual(statements[3].params,[...BRAZIL_P2_03G_SOURCE_URLS]);
});
