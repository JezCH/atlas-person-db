import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { targetAttestation, factKey, loadManifest, census, auditProduction }
  from "../scripts/audit-place-production-authority.mjs";

const REF="wfrbxltvpmlprgwfysxq";
const PRODUCTION={VERCEL:"1",VERCEL_ENV:"production",VERCEL_GIT_COMMIT_SHA:"a".repeat(40)};
const DIRECT="postgresql://postgres:dummy@db."+REF+".supabase.co/postgres";
const POOLER="postgresql://postgres."+REF+":dummy@aws-0-us-east-1.pooler.supabase.com:6543/postgres";

test("Production database attestation is exact, private and fail closed",()=>{
  assert.equal(targetAttestation(DIRECT,PRODUCTION).status,"MATCH");
  assert.equal(targetAttestation(POOLER,PRODUCTION).status,"MATCH");
  assert.equal(targetAttestation(DIRECT,{VERCEL:"1",VERCEL_ENV:"preview"}).status,"UNPROVEN");
  assert.equal(targetAttestation("postgresql://postgres:dummy@db.aaaaaaaaaaaaaaaaaaaa.supabase.co/postgres",PRODUCTION).status,"DIFFERENT");
  assert.equal(targetAttestation("postgresql://postgres:dummy@unknown.invalid/postgres",PRODUCTION).status,"UNPROVEN");
  assert.equal(targetAttestation(null,PRODUCTION).status,"UNPROVEN");
  const result=JSON.stringify(targetAttestation(POOLER,PRODUCTION));
  assert.equal(result.includes("dummy"),false);
  assert.equal(result.includes(REF),false);
});

test("manifest invariants and canonical fact key use the retained source only",()=>{
  const m=loadManifest();
  assert.equal(m.expected_polity_ids.length,13);
  assert.equal(m.places.length,20);
  assert.equal(m.sources.length,27);
  assert.equal(m.facts.length,23);
  assert.match(factKey(m.facts[0]),/^ppf:/);
});

test("unverified target never creates a client or reads any table",async()=>{
  let created=0;
  const result=await auditProduction({...PRODUCTION,SUPABASE_DB_URL:"postgresql://bad:bad@unknown.invalid/db"},async()=>{created++;});
  assert.equal(result.state,"AUTHORITY_UNPROVEN");
  assert.equal(result.queried,false);
  assert.equal(created,0);
  assert.equal(JSON.stringify(result).includes("unknown.invalid"),false);
});

function fakeClient({missingPlace=false,failQuery=false}={}){
  const m=loadManifest(), commands=[];
  const fs=m.facts.map(f=>({fact_key:factKey(f),...f}));
  const placeSourceRows=m.places.flatMap(p=>p.source_links.map(s=>({...s,place_id:p.id})));
  const factSourceRows=m.facts.flatMap(f=>f.source_refs.map(s=>({fact_key:factKey(f),source_id:s.source_id,source_locator_key:s.locator})));
  return {
    commands,
    async query(sql,params){
      commands.push({sql,params});
      if(failQuery && /atlas_v2\.places/.test(sql)) throw Object.assign(new Error("db unavailable"),{code:"DB_READ_FAILED"});
      if(sql.startsWith("BEGIN")||sql.startsWith("SET LOCAL")||sql==="ROLLBACK") return {rows:[]};
      if(sql.includes("information_schema.tables")) return {rows:["polities","places","sources","place_sources","polity_place_functions","polity_place_function_sources"].map(table_name=>({table_name}))};
      if(sql.includes("FROM atlas_v2.polities")) return {rows:m.expected_polity_ids.map(id=>({id}))};
      if(sql.includes("FROM atlas_v2.places")) return {rows:m.places.filter((p,i)=>!missingPlace||i!==0).map(p=>({id:p.id,canonical_key:p.canonical_key}))};
      if(sql.includes("FROM atlas_v2.sources")) return {rows:m.sources.map(s=>({id:s.id,source_key:s.source_key}))};
      if(sql.includes("FROM atlas_v2.polity_place_functions")) return {rows:fs};
      if(sql.includes("FROM atlas_v2.polity_place_function_sources")) return {rows:factSourceRows};
      if(sql.includes("FROM atlas_v2.place_sources")) return {rows:placeSourceRows};
      throw new Error("unexpected read");
    },
    async end(){this.closed=true;}
  };
}

test("one read-only repeatable-read transaction audits all 13/20/27/23 identities and links",async()=>{
  const client=fakeClient();
  const data=await census(client,loadManifest());
  assert.equal(data.complete,true);
  assert.equal(data.polities.present,13);
  assert.equal(data.places.present,20);
  assert.equal(data.sources.present,27);
  assert.equal(data.facts.present,23);
  assert.equal(data.place_source_links.present,28);
  assert.equal(data.fact_source_links.present,31);
  assert.match(client.commands[0].sql,/READ ONLY/);
  assert.equal(client.commands.at(-1).sql,"ROLLBACK");
  for(const item of client.commands){
    assert.doesNotMatch(item.sql,/\bINSERT\b|\bDELETE\b|\bUPDATE\b|\bCREATE\b|\bDROP\b/i);
  }
});

test("missing UUID is distinguished from complete census; the transaction still rolls back",async()=>{
  const client=fakeClient({missingPlace:true});
  const result=await census(client,loadManifest());
  assert.equal(result.complete,false);
  assert.equal(result.places.present,19);
  assert.equal(result.places.missing_ids.length,1);
  assert.equal(client.commands.at(-1).sql,"ROLLBACK");
});

test("read failures roll back and never become false zero-row claims",async()=>{
  const client=fakeClient({failQuery:true});
  await assert.rejects(()=>census(client,loadManifest()),/db unavailable/);
  assert.equal(client.commands.at(-1).sql,"ROLLBACK");
});

test("validated production connection is closed after scoped reads",async()=>{
  const client=fakeClient();
  const data=await auditProduction({...PRODUCTION,SUPABASE_DB_URL:DIRECT},async()=>client);
  assert.equal(data.queried,true);
  assert.equal(data.state,"TARGET_CONFIRMED_COMPLETE");
  assert.equal(client.closed,true);
});

test("script source must not contain explicit write statements or raw credential output",()=>{
  const src=fs.readFileSync(new URL("../scripts/audit-place-production-authority.mjs",import.meta.url),"utf8");
  assert.doesNotMatch(src,/\b(?:insert into|delete from|update atlas_v2|truncate|alter table)\b/i);
  assert.doesNotMatch(src,/JSON\.stringify\(process\.env\)/);
});
