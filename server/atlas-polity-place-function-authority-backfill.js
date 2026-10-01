"use strict";

const fs=require("node:fs");
const path=require("node:path");
const { insertExactSource }=require("./atlas-source-service.js");
const { insertExactPlace }=require("./atlas-authoring-object-service.js");
const { createPolityPlaceFunction }=require("./atlas-polity-place-function-service.js");

const MANIFEST_PATH=path.resolve(__dirname,"../data/core/polity-place-function-authority-backfill.v1.json");
const SCHEMA="atlas-polity-place-function-authority-backfill/v1";

function loadManifest({readFile=fs.readFileSync}={}){
  const value=JSON.parse(readFile(MANIFEST_PATH,"utf8"));
  if(value?.schema!==SCHEMA) throw new Error("POLITY_PLACE_AUTHORITY_BACKFILL_SCHEMA_INVALID");
  const counts=value.expected_counts||{};
  if(value.expected_polity_ids?.length!==Number(counts.polities)
    || value.places?.length!==Number(counts.places)
    || value.sources?.length!==Number(counts.sources)
    || value.facts?.length!==Number(counts.facts)) throw new Error("POLITY_PLACE_AUTHORITY_BACKFILL_COUNT_DRIFT");
  return Object.freeze(value);
}

async function verifyExactSource(client,source){
  const result=await client.query(`
    select id::text,source_key,source_type,title,citation_text
      from atlas_v2.sources
     where id=$1::uuid or source_key=$2 or title=$3
     order by id
     for update`,[source.id,source.source_key,source.title]);
  if(result.rows.length===0) return false;
  if(result.rows.length!==1) throw new Error(`POLITY_PLACE_AUTHORITY_SOURCE_AMBIGUOUS:${source.id}`);
  const row=result.rows[0];
  if(String(row.id).toLowerCase()!==source.id
    || String(row.source_key)!==source.source_key
    || String(row.source_type)!==source.source_type
    || String(row.title)!==source.title
    || String(row.citation_text)!==source.citation_text) {
    throw new Error(`POLITY_PLACE_AUTHORITY_SOURCE_CONFLICT:${source.id}`);
  }
  return true;
}

async function ensureExactSource(client,source){
  const exists=await verifyExactSource(client,source);
  if(!exists) await insertExactSource(client,source);
  if(!await verifyExactSource(client,source)) throw new Error(`POLITY_PLACE_AUTHORITY_SOURCE_READBACK_MISSING:${source.id}`);
  return exists ? "reused" : "created";
}

async function verifyBackfill(client,manifest){
  const polityIds=manifest.expected_polity_ids;
  const polityCount=Number((await client.query(
    `select count(*)::int as count from atlas_v2.polities where id=any($1::uuid[])`,
    [polityIds]
  )).rows[0]?.count||0);
  if(polityCount!==polityIds.length) throw new Error(`POLITY_PLACE_AUTHORITY_TARGET_POLITY_SET_DRIFT:${polityCount}/${polityIds.length}`);

  const placeIds=manifest.places.map((item)=>item.id);
  const sourceIds=manifest.sources.map((item)=>item.id);
  const placeCount=Number((await client.query(
    `select count(*)::int as count from atlas_v2.places where id=any($1::uuid[])`,
    [placeIds]
  )).rows[0]?.count||0);
  const sourceCount=Number((await client.query(
    `select count(*)::int as count from atlas_v2.sources where id=any($1::uuid[])`,
    [sourceIds]
  )).rows[0]?.count||0);
  const factCount=Number((await client.query(
    `select count(*)::int as count
       from atlas_v2.polity_place_functions
      where polity_id=any($1::uuid[])`,
    [polityIds]
  )).rows[0]?.count||0);
  const sourceLinkCount=Number((await client.query(
    `select count(*)::int as count
       from atlas_v2.polity_place_function_sources p
       join atlas_v2.polity_place_functions f on f.fact_key=p.fact_key
      where f.polity_id=any($1::uuid[])`,
    [polityIds]
  )).rows[0]?.count||0);
  const expectedSourceLinks=manifest.facts.reduce((sum,fact)=>sum+fact.source_refs.length,0);
  if(placeCount!==manifest.expected_counts.places
    || sourceCount!==manifest.expected_counts.sources
    || factCount!==manifest.expected_counts.facts
    || sourceLinkCount!==expectedSourceLinks) {
    throw new Error(`POLITY_PLACE_AUTHORITY_BACKFILL_READBACK_DRIFT:places=${placeCount},sources=${sourceCount},facts=${factCount},links=${sourceLinkCount}`);
  }
  return Object.freeze({polities:polityCount,places:placeCount,sources:sourceCount,facts:factCount,source_links:sourceLinkCount});
}

async function applyPolityPlaceFunctionAuthorityBackfill(client,{readFile}={}){
  if(!client||typeof client.query!=="function") throw new Error("PostgreSQL client is required");
  const manifest=loadManifest({...(readFile?{readFile}:{})});
  await client.query("begin isolation level serializable");
  try{
    await client.query("select pg_advisory_xact_lock(hashtext($1))",["atlas-core-reentry-08-place-authority-backfill"]);
    const target=await client.query(
      `select id::text from atlas_v2.polities where id=any($1::uuid[]) order by id::text for update`,
      [manifest.expected_polity_ids]
    );
    if(target.rowCount!==manifest.expected_polity_ids.length){
      throw new Error(`POLITY_PLACE_AUTHORITY_TARGET_POLITY_SET_DRIFT:${target.rowCount}/${manifest.expected_polity_ids.length}`);
    }

    let createdSources=0;
    for(const source of manifest.sources){
      if(await ensureExactSource(client,source)==="created") createdSources+=1;
    }

    let createdPlaces=0;
    for(const place of manifest.places){
      const outcome=await insertExactPlace(client,place);
      if(outcome.replay!==true) createdPlaces+=1;
    }

    for(const fact of manifest.facts) await createPolityPlaceFunction(client,fact);
    const readback=await verifyBackfill(client,manifest);
    await client.query("commit");
    return Object.freeze({
      marker:"ATLAS_POLITY_PLACE_FUNCTION_AUTHORITY_BACKFILL_V1",
      backfill_id:manifest.backfill_id,
      committed:true,
      replay:createdSources===0&&createdPlaces===0,
      created_sources:createdSources,
      created_places:createdPlaces,
      ...readback
    });
  }catch(error){
    try{await client.query("rollback");}catch{}
    throw error;
  }
}

module.exports=Object.freeze({MANIFEST_PATH,SCHEMA,loadManifest,verifyBackfill,applyPolityPlaceFunctionAuthorityBackfill});
