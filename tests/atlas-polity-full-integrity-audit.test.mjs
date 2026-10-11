import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const {TABLE_QUERIES,queryFullPolityIntegrity,summarizeFullPolityIntegrity}=require("../server/atlas-polity-full-integrity-audit.js");
const P="11111111-1111-4111-8111-111111111111";
const Q="22222222-2222-4222-8222-222222222222";
const A="33333333-3333-4333-8333-333333333333";
const S="44444444-4444-4444-8444-444444444444";
const T="55555555-5555-4555-8555-555555555555";
const BEFORE=[
 {polity_id:P,canonical_key:"dynasty-Song",polity_type:"historical_polity",names:[{locale:"ko",name:"송나라",is_preferred:true}],external_reference_total:1,owned_reference_total:2},
 {polity_id:Q,canonical_key:"Myanmar",polity_type:"historical_polity",names:[{locale:"ko",name:"미얀마",is_preferred:true}],external_reference_total:0,owned_reference_total:3}
];
function makeRaw(){
 const raw=Object.fromEntries(Object.keys(TABLE_QUERIES).map(k=>[k,[]]));
 raw.sources=[{id:S,source_key:"cambridge-source",source_type:"web_bibliographic_reference",canonical_url:"https://cambridge.example/study"}];
 raw.activities=[{activity:{id:A,person_id:T,polity_id:P,activity_start:960,activity_end:976,confidence:"reviewed"}}];
 raw.runtime_activities=[{activity:{id:A,person_id:T,polity_id:P,activity_start:960,activity_end:976,confidence:"reviewed"}}];
 raw.activity_sources=[{activity_id:A,source_id:S,source_locator_key:"page-12"}];
 raw.polity_sources=[{polity_id:Q,source_id:S}];
 raw.retirements=[{retirement:{retired_polity_id:P,canonical_key:"obsolete-example",survivor_polity_id:null,source_case_id:"japan-example"}}];
 return raw;
}
test("full protected-internal scope reports every table with no truncation, all source pairs, every retirement contradiction",()=>{
 const raw=makeRaw();
 const result=summarizeFullPolityIntegrity(raw,BEFORE);
 assert.equal(result.schema,"atlas-polity-internal-provenance-integrity/v1");
 assert.equal(result.counts.sources,1);
 assert.equal(result.counts.polity_sources,1);
 assert.equal(result.counts.activity_sources,1);
 assert.equal(result.counts.activities,1);
 assert.equal(result.counts.runtime_activities,1);
 assert.equal(result.counts.retirements,1);
 assert.equal(result.unresolved_foreign_key_refs.length,0);
 assert.equal(result.runtime_semantic_field_mismatches.length,0);
 assert.equal(result.external_orphan_count,1);
 assert.deepEqual(result.orphan_candidates[0].source_ids,[S]);
 assert.equal(result.orphan_candidates[0].safe_to_retire_automatically,false);
 assert.deepEqual(result.live_retired_polity_uuid_conflicts.map(x=>x.retired_polity_id),[P]);
 assert.equal(result.human_authoring_parity_proven,false);
});
test("cross-check missing activity Source, mismatched Runtime and unexpected missing link without writing",()=>{
 const raw=makeRaw();
 raw.activity_sources[0].source_id=T; // not normalized Source
 raw.runtime_activities[0].activity.activity_end=977;
 raw.polity_sources[0].polity_id=T; // not Polity
 const result=summarizeFullPolityIntegrity(raw,BEFORE);
 assert.equal(result.unresolved_foreign_key_refs.length,2);
 assert.deepEqual(result.runtime_semantic_field_mismatches[0].fields,["activity_end"]);
});
test("no duplicate canonical identity or arbitrary malformed census can pass",()=>{
 const raw=makeRaw();
 raw.sources.push({...raw.sources[0]});
 assert.throws(()=>summarizeFullPolityIntegrity(raw,BEFORE),/DUPLICATE_ID:sources/);
 const bad=makeRaw();
 bad.activity_sources=null;
 assert.throws(()=>summarizeFullPolityIntegrity(bad,BEFORE),/ROWS_INVALID:activity_sources/);
});
test("actual SQL analyzer reads every internal table inside parent's transaction, never writes, deletes or truncates", async()=>{
 const fixture=makeRaw();
 const statements=[];
 const client={ async query(sql) {
  statements.push(sql);
  const name=Object.keys(TABLE_QUERIES).find(k=>TABLE_QUERIES[k]===sql);
  assert.ok(name,"unexpected audit query");
  return {rows:fixture[name]};
 }};
 const audit=await queryFullPolityIntegrity(client,BEFORE);
 assert.equal(Object.keys(audit.raw).length,Object.keys(TABLE_QUERIES).length);
 assert.equal(audit.summary.no_truncation,true);
 assert.equal(statements.length,Object.keys(TABLE_QUERIES).length);
 for(const sql of statements){
  assert.match(sql,/^select /i);
  assert.doesNotMatch(sql,/\b(insert|update|delete|alter|drop|create|truncate|grant|revoke|limit)\b/i);
 }
});
test("the protected OIDC handler and already allowlisted Song workflow wire one opt-in complete census",()=>{
 const fs=require("node:fs");
 const h=fs.readFileSync(new URL("../server/atlas-polity-reference-audit-handler.js",import.meta.url),"utf8");
 const y=fs.readFileSync(new URL("../.github/workflows/atlas-polity-song-p2-08-audit.yml",import.meta.url),"utf8");
 assert.match(h,/include_full_integrity_details/);
 assert.match(h,/queryFullPolityIntegrity/);
 assert.match(y,/include_full_integrity_details:true/);
 assert.match(y,/polity-p2-10-internal-full-census.json/);
 assert.match(y,/GITHUB_SHA/);
 assert.match(y,/read_only==true/);
 assert.doesNotMatch(y,/skip.sha|ignore.sha|ignore_oidc/i);
});
