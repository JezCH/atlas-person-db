"use strict";

const {
  normalizeGeometry,
  normalizeTerritoryRecord
}=require("./atlas-p14-territory-geometry-contract.js");

async function requireReference(client,sql,params,code){
  const result=await client.query(sql,params);
  if(result.rowCount!==1) throw new Error(code);
  return result.rows[0];
}

async function verifySources(client,refs,code){
  for(const ref of refs){
    await requireReference(
      client,
      "select id::text from atlas_v2.sources where id=$1::uuid",
      [ref.source_id],
      code
    );
  }
}

async function appendGeometrySources(client,geometryId,refs){
  let added=0;
  for(const ref of refs){
    const result=await client.query(`
      insert into atlas_v2.geometry_sources(geometry_id,source_id,source_locator_key)
      values($1::uuid,$2::uuid,$3)
      on conflict do nothing
    `,[geometryId,ref.source_id,ref.locator]);
    added+=Number(result.rowCount||0);
  }
  return added;
}

async function loadGeometry(client,id){
  const row=await client.query(`
    select id::text,geometry_kind,geometry_ref
      from atlas_v2.geometries
     where id=$1::uuid
  `,[id]);
  if(row.rowCount!==1) return null;
  const refs=await client.query(`
    select source_id::text,source_locator_key
      from atlas_v2.geometry_sources
     where geometry_id=$1::uuid
     order by source_id::text,source_locator_key
  `,[id]);
  return Object.freeze({
    id:String(row.rows[0].id).toLowerCase(),
    geometry_kind:String(row.rows[0].geometry_kind),
    geometry_ref:String(row.rows[0].geometry_ref),
    source_refs:Object.freeze(refs.rows.map((item)=>Object.freeze({
      source_id:String(item.source_id).toLowerCase(),
      locator:String(item.source_locator_key)
    })))
  });
}

function requestedRefsPresent(actual,requested){
  const keys=new Set(actual.map((ref)=>`${ref.source_id}\u0000${ref.locator}`));
  return requested.every((ref)=>keys.has(`${ref.source_id}\u0000${ref.locator}`));
}

async function createGeometry(client,raw){
  if(!client||typeof client.query!=="function") throw new Error("PostgreSQL client is required");
  const geometry=normalizeGeometry(raw);
  if(geometry.geometry_id!=null) throw new Error("P14_GEOMETRY_ID_CALLER_FORBIDDEN");
  await verifySources(client,geometry.source_refs,"P14_GEOMETRY_SOURCE_UNRESOLVED");

  const inserted=await client.query(`
    insert into atlas_v2.geometries(id,geometry_kind,geometry_ref)
    values(gen_random_uuid(),$1,$2)
    on conflict(geometry_ref) do nothing
    returning id::text
  `,[geometry.geometry_kind,geometry.geometry_ref]);

  let id=inserted.rowCount===1?String(inserted.rows[0].id).toLowerCase():null;
  if(!id){
    const existing=await client.query(`
      select id::text,geometry_kind,geometry_ref
        from atlas_v2.geometries
       where geometry_ref=$1
    `,[geometry.geometry_ref]);
    if(existing.rowCount!==1) throw new Error("P14_GEOMETRY_READBACK_MISSING");
    if(String(existing.rows[0].geometry_kind)!==geometry.geometry_kind) throw new Error("P14_GEOMETRY_REF_CONFLICT");
    id=String(existing.rows[0].id).toLowerCase();
  }

  const addedSourceLinks=await appendGeometrySources(client,id,geometry.source_refs);
  const live=await loadGeometry(client,id);
  if(!live||live.geometry_kind!==geometry.geometry_kind||live.geometry_ref!==geometry.geometry_ref) {
    throw new Error("P14_GEOMETRY_READBACK_DRIFT");
  }
  if(!requestedRefsPresent(live.source_refs,geometry.source_refs)) throw new Error("P14_GEOMETRY_SOURCE_READBACK_DRIFT");

  return Object.freeze({
    entity:"geometry",
    id,
    geometry_kind:live.geometry_kind,
    geometry_ref:live.geometry_ref,
    source_refs:live.source_refs,
    replay:inserted.rowCount!==1 && addedSourceLinks===0,
    added_source_links:addedSourceLinks
  });
}

async function appendTerritorySources(client,territoryRecordId,refs){
  let added=0;
  for(const ref of refs){
    const result=await client.query(`
      insert into atlas_v2.territory_record_sources(territory_record_id,source_id,source_locator_key)
      values($1::uuid,$2::uuid,$3)
      on conflict do nothing
    `,[territoryRecordId,ref.source_id,ref.locator]);
    added+=Number(result.rowCount||0);
  }
  return added;
}

async function loadTerritoryRecord(client,id){
  const row=await client.query(`
    select id::text,semantic_key,polity_id::text,geometry_id::text,control_type,
           boundary_certainty,evidence_confidence,
           valid_start,valid_start_month,valid_start_day,valid_start_granularity,valid_start_certainty,valid_start_calendar,
           valid_end,valid_end_month,valid_end_day,valid_end_granularity,valid_end_certainty,valid_end_calendar,
           chronology_status,ongoing_as_of::text
      from atlas_v2.territory_records
     where id=$1::uuid
  `,[id]);
  if(row.rowCount!==1) return null;
  const refs=await client.query(`
    select source_id::text,source_locator_key
      from atlas_v2.territory_record_sources
     where territory_record_id=$1::uuid
     order by source_id::text,source_locator_key
  `,[id]);
  const record=row.rows[0];
  return Object.freeze({
    ...record,
    id:String(record.id).toLowerCase(),
    polity_id:String(record.polity_id).toLowerCase(),
    geometry_id:String(record.geometry_id).toLowerCase(),
    ongoing_as_of:record.ongoing_as_of||null,
    source_refs:Object.freeze(refs.rows.map((item)=>Object.freeze({
      source_id:String(item.source_id).toLowerCase(),
      locator:String(item.source_locator_key)
    })))
  });
}

const TERRITORY_COMPARE_FIELDS=Object.freeze([
  "semantic_key","polity_id","geometry_id","control_type","boundary_certainty","evidence_confidence",
  "valid_start","valid_start_month","valid_start_day","valid_start_granularity","valid_start_certainty","valid_start_calendar",
  "valid_end","valid_end_month","valid_end_day","valid_end_granularity","valid_end_certainty","valid_end_calendar",
  "chronology_status","ongoing_as_of"
]);

function sameTerritory(live,expected){
  return TERRITORY_COMPARE_FIELDS.every((field)=>String(live?.[field]??"")===String(expected?.[field]??""));
}

async function createTerritoryRecord(client,raw){
  if(!client||typeof client.query!=="function") throw new Error("PostgreSQL client is required");
  const record=normalizeTerritoryRecord(raw);
  await requireReference(client,"select id::text from atlas_v2.polities where id=$1::uuid",[record.polity_id],"P14_TERRITORY_POLITY_UNRESOLVED");
  await requireReference(client,"select id::text from atlas_v2.geometries where id=$1::uuid",[record.geometry_id],"P14_TERRITORY_GEOMETRY_UNRESOLVED");
  await verifySources(client,record.source_refs,"P14_TERRITORY_SOURCE_UNRESOLVED");

  const values=[
    record.semantic_key,record.polity_id,record.geometry_id,record.control_type,
    record.boundary_certainty,record.evidence_confidence,
    record.valid_start,record.valid_start_month,record.valid_start_day,record.valid_start_granularity,record.valid_start_certainty,record.valid_start_calendar,
    record.valid_end,record.valid_end_month,record.valid_end_day,record.valid_end_granularity,record.valid_end_certainty,record.valid_end_calendar,
    record.chronology_status,record.ongoing_as_of
  ];
  const inserted=await client.query(`
    insert into atlas_v2.territory_records(
      id,semantic_key,polity_id,geometry_id,control_type,boundary_certainty,evidence_confidence,
      valid_start,valid_start_month,valid_start_day,valid_start_granularity,valid_start_certainty,valid_start_calendar,
      valid_end,valid_end_month,valid_end_day,valid_end_granularity,valid_end_certainty,valid_end_calendar,
      chronology_status,ongoing_as_of
    ) values(
      gen_random_uuid(),$1,$2::uuid,$3::uuid,$4,$5,$6,
      $7,$8,$9,$10,$11,$12,
      $13,$14,$15,$16,$17,$18,
      $19,$20::date
    )
    on conflict(semantic_key) do nothing
    returning id::text
  `,values);

  let id=inserted.rowCount===1?String(inserted.rows[0].id).toLowerCase():null;
  if(!id){
    const existing=await client.query("select id::text from atlas_v2.territory_records where semantic_key=$1",[record.semantic_key]);
    if(existing.rowCount!==1) throw new Error("P14_TERRITORY_READBACK_MISSING");
    id=String(existing.rows[0].id).toLowerCase();
  }

  const addedSourceLinks=await appendTerritorySources(client,id,record.source_refs);
  const live=await loadTerritoryRecord(client,id);
  if(!live||!sameTerritory(live,record)) throw new Error("P14_TERRITORY_SEMANTIC_CONFLICT");
  if(!requestedRefsPresent(live.source_refs,record.source_refs)) throw new Error("P14_TERRITORY_SOURCE_READBACK_DRIFT");

  return Object.freeze({
    entity:"territory_record",
    id,
    semantic_key:live.semantic_key,
    polity_id:live.polity_id,
    geometry_id:live.geometry_id,
    control_type:live.control_type,
    boundary_certainty:live.boundary_certainty,
    evidence_confidence:live.evidence_confidence,
    valid_start:live.valid_start,
    valid_start_month:live.valid_start_month,
    valid_start_day:live.valid_start_day,
    valid_start_granularity:live.valid_start_granularity,
    valid_start_certainty:live.valid_start_certainty,
    valid_start_calendar:live.valid_start_calendar,
    valid_end:live.valid_end,
    valid_end_month:live.valid_end_month,
    valid_end_day:live.valid_end_day,
    valid_end_granularity:live.valid_end_granularity,
    valid_end_certainty:live.valid_end_certainty,
    valid_end_calendar:live.valid_end_calendar,
    chronology_status:live.chronology_status,
    ongoing_as_of:live.ongoing_as_of,
    source_refs:live.source_refs,
    replay:inserted.rowCount!==1 && addedSourceLinks===0,
    added_source_links:addedSourceLinks
  });
}

module.exports=Object.freeze({
  createGeometry,
  createTerritoryRecord,
  loadGeometry,
  loadTerritoryRecord
});
