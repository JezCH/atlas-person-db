import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const EXPECTED_REF = "wfrbxltvpmlprgwfysxq";

export function targetAttestation(connection, env = {}) {
  if (env.VERCEL !== "1" || env.VERCEL_ENV !== "production")
    return { status: "UNPROVEN", reason: "NOT_PRODUCTION_RUNTIME" };
  let u;
  try { u = new URL(connection); } catch { return { status: "UNPROVEN", reason: "URL_UNPARSEABLE" }; }
  if (!["postgres:", "postgresql:"].includes(u.protocol))
    return { status: "UNPROVEN", reason: "NOT_POSTGRESQL" };
  const hostRef = /^db\.([a-z0-9]{20})\.supabase\.co$/.exec(u.hostname.toLowerCase())?.[1];
  const isSupabasePooler = /^(?:[a-z0-9-]+\.)?pooler\.supabase\.com$/.test(u.hostname.toLowerCase());
  const poolerRef = isSupabasePooler
    ? /^postgres\.([a-z0-9]{20})$/.exec(decodeURIComponent(u.username).toLowerCase())?.[1]
    : null;
  if (hostRef && poolerRef && hostRef!==poolerRef)
    return { status: "UNPROVEN", reason: "CONFLICTING_IDENTIFIERS" };
  const projectRef = hostRef || poolerRef;
  if (!projectRef) return { status: "UNPROVEN", reason: "TARGET_REF_NOT_IDENTIFIABLE" };
  return { status: projectRef===EXPECTED_REF ? "MATCH" : "DIFFERENT",
    basis: hostRef ? "supabase_dedicated_host" : "supabase_pooler_username" };
}

export function factKey(f) {
  return ["ppf",f.polity_id,f.function_type,f.place_id,
    f.start_year==null ? "?" : f.start_year,
    f.end_year==null ? "?" : f.end_year].join(":");
}

export function loadManifest() {
  const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)),
    "../data/core/polity-place-function-authority-backfill.v1.json");
  const m = JSON.parse(fs.readFileSync(file,"utf8"));
  if (m.backfill_id!=="core-reentry-08-place-authority-20261001"
    || m.expected_polity_ids?.length!==13 || m.places?.length!==20
    || m.sources?.length!==27 || m.facts?.length!==23)
    throw new Error("MANIFEST_CONTRACT_DRIFT");
  return m;
}

function compareEntities(expected, actual, key) {
  const byId = new Map(actual.map(row=>[String(row.id),row]));
  const missing=[],mismatched=[],collision=[];
  for(const x of expected){
    const row=byId.get(x.id);
    if(!row) missing.push(x.id);
    else if(key && String(row[key])!==String(x[key])) mismatched.push(x.id);
    if(key && actual.some(r=>String(r[key])===String(x[key]) && String(r.id)!==x.id))
      collision.push(x.id);
  }
  return { expected:expected.length,present:expected.length-missing.length,
    missing_ids:missing,key_mismatch_ids:mismatched,key_collision_ids:collision };
}

function compareEdges(expected,actual,columns) {
  const key=x=>columns.map(c=>String(x[c])).join("\u0000");
  const got=new Set(actual.map(key)),wanted=new Set(expected.map(key));
  return {expected:expected.length,present:expected.filter(x=>got.has(key(x))).length,
    missing:expected.filter(x=>!got.has(key(x))),
    extra:actual.filter(x=>!wanted.has(key(x)))};
}

export async function census(client,m) {
  await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  try {
    await client.query("SET LOCAL statement_timeout='12000ms'");
    const names=["polities","places","sources","place_sources","polity_place_functions","polity_place_function_sources"];
    const found=(await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='atlas_v2' AND table_name=ANY($1::text[])",
      [names])).rows.map(r=>r.table_name);
    const absent=names.filter(n=>!found.includes(n));
    if(absent.length) return {complete:false,missing_tables:absent};
    const ids=m.expected_polity_ids, p=m.places, s=m.sources;
    const po=(await client.query(
      "SELECT id::text AS id FROM atlas_v2.polities WHERE id=ANY($1::uuid[])",[ids])).rows;
    const pl=(await client.query(
      "SELECT id::text AS id,canonical_key FROM atlas_v2.places WHERE id=ANY($1::uuid[]) OR canonical_key=ANY($2::text[])",
      [p.map(x=>x.id),p.map(x=>x.canonical_key)])).rows;
    const sr=(await client.query(
      "SELECT id::text AS id,source_key FROM atlas_v2.sources WHERE id=ANY($1::uuid[]) OR source_key=ANY($2::text[])",
      [s.map(x=>x.id),s.map(x=>x.source_key)])).rows;
    const fs=(await client.query(
      "SELECT fact_key,polity_id::text AS polity_id,place_id::text AS place_id,function_type,start_year,end_year,confidence FROM atlas_v2.polity_place_functions WHERE polity_id=ANY($1::uuid[])",
      [ids])).rows;
    const actualFacts=new Map(fs.map(f=>[f.fact_key,f]));
    const missing_fact_keys=[],drifted_fact_keys=[];
    for(const f of m.facts){
      const key=factKey(f),got=actualFacts.get(key);
      if(!got) missing_fact_keys.push(key);
      else if(got.polity_id!==f.polity_id||got.place_id!==f.place_id||got.function_type!==f.function_type
        ||got.start_year!==f.start_year||got.end_year!==f.end_year||got.confidence!==f.confidence)
        drifted_fact_keys.push(key);
    }
    const fk=m.facts.map(factKey);
    const fsr=(await client.query(
      "SELECT fact_key,source_id::text AS source_id,source_locator_key FROM atlas_v2.polity_place_function_sources WHERE fact_key=ANY($1::text[])",[fk])).rows;
    const psr=(await client.query(
      "SELECT place_id::text AS place_id,source_id::text AS source_id,source_locator_key FROM atlas_v2.place_sources WHERE place_id=ANY($1::uuid[])",[p.map(x=>x.id)])).rows;
    const expFs=m.facts.flatMap(f=>f.source_refs.map(r=>({fact_key:factKey(f),source_id:r.source_id,source_locator_key:r.locator})));
    const expPs=p.flatMap(place=>place.source_links.map(r=>({place_id:place.id,source_id:r.source_id,source_locator_key:r.source_locator_key})));
    const report={
      polities:compareEntities(ids.map(id=>({id})),po),
      places:compareEntities(p,pl,"canonical_key"),
      sources:compareEntities(s,sr,"source_key"),
      facts:{expected:fk.length,present:fk.length-missing_fact_keys.length,missing_fact_keys,drifted_fact_keys,
        other_facts_for_13_polities:fs.filter(f=>!fk.includes(f.fact_key)).length},
      place_source_links:compareEdges(expPs,psr,["place_id","source_id","source_locator_key"]),
      fact_source_links:compareEdges(expFs,fsr,["fact_key","source_id","source_locator_key"])
    };
    report.complete=Object.entries(report).filter(([k])=>k!=="complete").every(([name,r])=>{
      if(name==="facts") return r.missing_fact_keys.length===0 && r.drifted_fact_keys.length===0;
      if(name.endsWith("_links")) return r.missing.length===0 && r.extra.length===0;
      return r.missing_ids.length===0 && r.key_mismatch_ids.length===0 && r.key_collision_ids.length===0;
    });
    return report;
  } finally {await client.query("ROLLBACK");}
}

export async function auditProduction(env=process.env,clientFactory) {
  const attestation=targetAttestation(env.SUPABASE_DB_URL,env);
  const identity={status:attestation.status,basis:attestation.basis||null,reason:attestation.reason||null,
    deployment_sha:/^[0-9a-f]{40}$/i.test(String(env.VERCEL_GIT_COMMIT_SHA||""))?env.VERCEL_GIT_COMMIT_SHA:null};
  if(attestation.status!=="MATCH")
    return {schema:"atlas-place-production-census/v1",state:"AUTHORITY_UNPROVEN",identity,queried:false};
  if(typeof clientFactory!=="function") throw new Error("CLIENT_FACTORY_REQUIRED");
  const client=await clientFactory(env.SUPABASE_DB_URL,{env});
  try{
    const report=await census(client,loadManifest());
    return {schema:"atlas-place-production-census/v1",
      state:report.complete?"TARGET_CONFIRMED_COMPLETE":"TARGET_CONFIRMED_GAP",
      identity,queried:true,report};
  }finally{await client.end();}
}

if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const {createPostgresClient}=require("../server/atlas-postgres-client.js");
  auditProduction(process.env,createPostgresClient).then(result=>{
    process.stdout.write(JSON.stringify(result,null,2)+"\n");
    process.exitCode=result.state==="TARGET_CONFIRMED_COMPLETE"?0:result.state==="AUTHORITY_UNPROVEN"?2:3;
  }).catch(error=>{
    process.stderr.write(JSON.stringify({state:"AUDIT_FAILED",code:String(error.code||"AUDIT_EXECUTION_FAILED")})+"\n");
    process.exitCode=4;
  });
}
