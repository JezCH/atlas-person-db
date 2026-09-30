"use strict";

const { UUID_RE } = require("./atlas-authoring-object-service.js");

const PERSON_PLACE_RELATIONS = new Set(["birth_place","death_place"]);

function text(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/g, " ");
}

function requiredUuid(value, code) {
  const id=text(value).toLowerCase();
  if(!UUID_RE.test(id)) throw new Error(code);
  return id;
}

function normalizePersonPlaceFacts(raw) {
  if (raw == null) return Object.freeze([]);
  if (!Array.isArray(raw)) throw new Error("HUMAN_AUTHORING_PERSON_PLACE_FACTS_INVALID");
  const seen=new Set();
  return Object.freeze(raw.map((item,index)=>{
    if(!item || typeof item!=="object" || Array.isArray(item)) throw new Error(`HUMAN_AUTHORING_PERSON_PLACE_FACT_INVALID:${index+1}`);
    const relation_type=text(item.relation_type);
    if(!PERSON_PLACE_RELATIONS.has(relation_type)) throw new Error(`HUMAN_AUTHORING_PERSON_PLACE_RELATION_UNSUPPORTED:${index+1}`);
    if(seen.has(relation_type)) throw new Error(`HUMAN_AUTHORING_PERSON_PLACE_RELATION_DUPLICATE:${relation_type}`);
    seen.add(relation_type);
    const place_id=requiredUuid(item.place_id,`HUMAN_AUTHORING_PERSON_PLACE_ID_INVALID:${index+1}`);
    const source_id=requiredUuid(item.source_id,`HUMAN_AUTHORING_PERSON_PLACE_SOURCE_ID_INVALID:${index+1}`);
    const source_locator_key=text(item.source_locator_key ?? item.locator);
    if(!source_locator_key) throw new Error(`HUMAN_AUTHORING_PERSON_PLACE_SOURCE_LOCATOR_REQUIRED:${index+1}`);
    return Object.freeze({ relation_type,place_id,source_id,source_locator_key });
  }));
}

async function resolvePersonPlaceFacts(client,{personId,facts}) {
  const normalized=normalizePersonPlaceFacts(facts);
  const results=[];
  for(const fact of normalized){
    const place=await client.query(`select id::text from atlas_v2.places where id=$1::uuid`,[fact.place_id]);
    if(place.rows.length!==1) throw new Error(`HUMAN_AUTHORING_PERSON_PLACE_ID_UNRESOLVED:${fact.relation_type}`);
    const source=await client.query(`select id::text from atlas_v2.sources where id=$1::uuid`,[fact.source_id]);
    if(source.rows.length!==1) throw new Error(`HUMAN_AUTHORING_PERSON_PLACE_SOURCE_ID_UNRESOLVED:${fact.relation_type}`);

    const existing=await client.query(`
      select place_id::text,source_id::text,source_locator_key
        from atlas_v2.person_place_facts
       where person_id=$1::uuid and relation_type=$2
       for update`,[personId,fact.relation_type]);
    if(existing.rows.length===1){
      const row=existing.rows[0];
      const exact=String(row.place_id).toLowerCase()===fact.place_id
        && String(row.source_id).toLowerCase()===fact.source_id
        && String(row.source_locator_key)===fact.source_locator_key;
      if(!exact) throw new Error(`HUMAN_AUTHORING_PERSON_PLACE_RELATION_CONFLICT:${fact.relation_type}`);
      results.push(Object.freeze({...fact,disposition:"reused"}));
      continue;
    }
    await client.query(`
      insert into atlas_v2.person_place_facts(person_id,relation_type,place_id,source_id,source_locator_key)
      values($1::uuid,$2,$3::uuid,$4::uuid,$5)`,
      [personId,fact.relation_type,fact.place_id,fact.source_id,fact.source_locator_key]);
    results.push(Object.freeze({...fact,disposition:"created"}));
  }
  return Object.freeze(results);
}

module.exports=Object.freeze({PERSON_PLACE_RELATIONS,normalizePersonPlaceFacts,resolvePersonPlaceFacts});
