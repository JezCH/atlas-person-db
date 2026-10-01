"use strict";

const { CONTRACT } = require("./atlas-spatial-fact-contract.js");
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TYPES=new Set(CONTRACT.historical_fact.function_types);
const CONFIDENCE=new Set(["well_established","likely","speculative","disputed","unknown"]);

function text(v){return v==null?"":String(v).trim();}
function uuid(v,code){const x=text(v).toLowerCase();if(!UUID_RE.test(x))throw new Error(code);return x;}
function year(v,code){if(v==null||v==="")return null;const n=Number(v);if(!Number.isInteger(n)||n===0)throw new Error(code);return n;}
function normalizeSourceRefs(raw){
  if(!Array.isArray(raw)||raw.length===0)throw new Error("POLITY_PLACE_FUNCTION_SOURCE_REQUIRED");
  const seen=new Set();
  return Object.freeze(raw.map((item,index)=>{
    if(!item||typeof item!=="object"||Array.isArray(item))throw new Error(`POLITY_PLACE_FUNCTION_SOURCE_INVALID:${index+1}`);
    const source_id=uuid(item.source_id,`POLITY_PLACE_FUNCTION_SOURCE_ID_INVALID:${index+1}`);
    const locator=text(item.locator??item.source_locator_key);
    if(!locator)throw new Error(`POLITY_PLACE_FUNCTION_SOURCE_LOCATOR_REQUIRED:${index+1}`);
    const key=`${source_id}\0${locator}`;if(seen.has(key))throw new Error("POLITY_PLACE_FUNCTION_SOURCE_DUPLICATE");seen.add(key);
    return Object.freeze({source_id,locator});
  }));
}
function normalizePolityPlaceFunction(raw){
  if(!raw||typeof raw!=="object"||Array.isArray(raw))throw new Error("POLITY_PLACE_FUNCTION_INVALID");
  if(raw.region_code!=null||raw.subregion_code!=null||raw.place_name!=null||raw.location_label!=null)throw new Error("POLITY_PLACE_FUNCTION_DISPLAY_FIELD_FORBIDDEN");
  const polity_id=uuid(raw.polity_id,"POLITY_PLACE_FUNCTION_POLITY_ID_INVALID");
  const place_id=uuid(raw.place_id,"POLITY_PLACE_FUNCTION_PLACE_ID_INVALID");
  const function_type=text(raw.function_type);if(!TYPES.has(function_type))throw new Error("POLITY_PLACE_FUNCTION_TYPE_INVALID");
  const confidence=text(raw.confidence);if(!CONFIDENCE.has(confidence))throw new Error("POLITY_PLACE_FUNCTION_CONFIDENCE_INVALID");
  const start_year=year(raw.start_year,"POLITY_PLACE_FUNCTION_START_YEAR_INVALID");
  const end_year=year(raw.end_year,"POLITY_PLACE_FUNCTION_END_YEAR_INVALID");
  if(start_year!=null&&end_year!=null&&start_year>end_year)throw new Error("POLITY_PLACE_FUNCTION_INTERVAL_INVALID");
  const source_refs=normalizeSourceRefs(raw.source_refs);
  const fact_key=`ppf:${polity_id}:${function_type}:${place_id}:${start_year==null?"?":start_year}:${end_year==null?"?":end_year}`;
  return Object.freeze({fact_key,polity_id,function_type,place_id,start_year,end_year,confidence,source_refs});
}
async function createPolityPlaceFunction(client,raw){
  const fact=normalizePolityPlaceFunction(raw);
  await client.query("select pg_advisory_xact_lock(hashtext($1))",[`atlas-polity-place-function:${fact.fact_key}`]);
  for(const [table,id,code] of [["polities",fact.polity_id,"POLITY_PLACE_FUNCTION_POLITY_UNRESOLVED"],["places",fact.place_id,"POLITY_PLACE_FUNCTION_PLACE_UNRESOLVED"]]){
    const q=await client.query(`select id::text from atlas_v2.${table} where id=$1::uuid`,[id]);if(q.rowCount!==1)throw new Error(code);
  }
  for(const ref of fact.source_refs){const q=await client.query("select id::text from atlas_v2.sources where id=$1::uuid",[ref.source_id]);if(q.rowCount!==1)throw new Error("POLITY_PLACE_FUNCTION_SOURCE_UNRESOLVED");}
  await client.query(`insert into atlas_v2.polity_place_functions(fact_key,polity_id,function_type,place_id,start_year,end_year,confidence)
    values($1,$2::uuid,$3,$4::uuid,$5,$6,$7) on conflict(fact_key) do nothing`,
    [fact.fact_key,fact.polity_id,fact.function_type,fact.place_id,fact.start_year,fact.end_year,fact.confidence]);
  const live=await client.query(`select fact_key,polity_id::text,function_type,place_id::text,start_year,end_year,confidence
    from atlas_v2.polity_place_functions where fact_key=$1 for update`,[fact.fact_key]);
  if(live.rowCount!==1)throw new Error("POLITY_PLACE_FUNCTION_READBACK_MISSING");
  const row=live.rows[0];
  for(const key of ["polity_id","function_type","place_id","confidence"])if(String(row[key])!==String(fact[key]))throw new Error("POLITY_PLACE_FUNCTION_READBACK_DRIFT");
  if(row.start_year!==fact.start_year||row.end_year!==fact.end_year)throw new Error("POLITY_PLACE_FUNCTION_READBACK_DRIFT");
  for(const ref of fact.source_refs)await client.query(`insert into atlas_v2.polity_place_function_sources(fact_key,source_id,source_locator_key)
    values($1,$2::uuid,$3) on conflict do nothing`,[fact.fact_key,ref.source_id,ref.locator]);
  const refs=await client.query(`select source_id::text,source_locator_key from atlas_v2.polity_place_function_sources
    where fact_key=$1 order by source_id::text,source_locator_key`,[fact.fact_key]);
  const expected=[...fact.source_refs].sort((a,b)=>a.source_id.localeCompare(b.source_id)||a.locator.localeCompare(b.locator));
  const actual=(refs.rows||[]).map(r=>({source_id:String(r.source_id),locator:String(r.source_locator_key)}));
  if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error("POLITY_PLACE_FUNCTION_SOURCE_READBACK_DRIFT");
  return Object.freeze({entity:"polity_place_function",fact_key:fact.fact_key,polity_id:fact.polity_id,place_id:fact.place_id,function_type:fact.function_type,start_year:fact.start_year,end_year:fact.end_year,confidence:fact.confidence,source_refs:expected});
}
module.exports=Object.freeze({normalizePolityPlaceFunction,createPolityPlaceFunction});
