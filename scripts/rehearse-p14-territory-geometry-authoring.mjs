import assert from "node:assert/strict";
import { createRequire } from "node:module";
import pg from "pg";

const require=createRequire(import.meta.url);
const { reconstructCurrentSchema }=require("../server/atlas-current-schema-reconstruction.js");
const { createSource }=require("../server/atlas-source-service.js");
const { createPolity }=require("../server/atlas-identity-service.js");
const {
  createGeometry,
  createTerritoryRecord,
  loadGeometry,
  loadTerritoryRecord
}=require("../server/atlas-p14-territory-geometry-service.js");
const {
  normalizeTerritoryRecord,
  normalizeGeometry
}=require("../server/atlas-p14-territory-geometry-contract.js");

const { Client }=pg;
const databaseUrl=String(process.env.DATABASE_URL||"").trim();
if(!/^postgres(?:ql)?:\/\//.test(databaseUrl)) throw new Error("DATABASE_URL is required");

const client=new Client({connectionString:databaseUrl});
await client.connect();

try{
  await client.query("drop schema if exists atlas_v2 cascade");
  const reconstruction=await reconstructCurrentSchema(client);
  assert.deepEqual(reconstruction.phases,["baseline","correction","stage2","p9","authoring"]);

  await client.query("begin");

  const source=await createSource(client,{
    source_key:"fixture:p14-territory-geometry-source",
    source_type:"academic_reference",
    title:"P14 Territory Geometry fixture source",
    citation_text:"Reviewed fixture evidence for P14 canonical authoring."
  });

  const polity=await createPolity(client,{
    canonical_key:"p14-territory-fixture-polity",
    canonical_name_en:"P14 Territory Fixture Polity",
    display_name_ko:"P14 영토 픽스처 정치체",
    polity_type:"historical_polity",
    historicity:"historical"
  });

  const geometryRaw={
    geometry_kind:"polygon",
    geometry_ref:"repo://p14/fixtures/reviewed-territory-shape-1",
    source_refs:[{source_id:source.id,locator:"map plate 1"}]
  };
  const geometry=await createGeometry(client,geometryRaw);
  assert.equal(geometry.replay,false);
  assert.ok(geometry.id);
  assert.equal(geometry.geometry_kind,"polygon");
  assert.equal(geometry.source_refs[0].source_id,source.id);

  const geometryReplay=await createGeometry(client,geometryRaw);
  assert.equal(geometryReplay.replay,true);
  assert.equal(geometryReplay.id,geometry.id);

  const territoryRaw={
    polity_id:polity.id,
    geometry_id:geometry.id,
    control_type:"de_facto_control",
    boundary_certainty:"approximate",
    evidence_confidence:"probable",

    valid_start:1584,
    valid_start_month:null,
    valid_start_day:null,
    valid_start_granularity:"year",
    valid_start_certainty:"approximate",
    valid_start_calendar:"source_calendar",

    valid_end:null,
    valid_end_month:null,
    valid_end_day:null,
    valid_end_granularity:null,
    valid_end_certainty:null,
    valid_end_calendar:null,

    chronology_status:"reviewed",
    source_refs:[{source_id:source.id,locator:"territorial statement pp. 10-12"}]
  };

  const normalized=normalizeTerritoryRecord(territoryRaw);
  assert.equal(normalized.valid_end,null);
  assert.match(normalized.semantic_key,/<UNKNOWN>/);

  const territory=await createTerritoryRecord(client,territoryRaw);
  assert.equal(territory.replay,false);
  assert.equal(territory.polity_id,String(polity.id).toLowerCase());
  assert.equal(territory.geometry_id,geometry.id);
  assert.equal(territory.valid_end,null);
  assert.equal(territory.valid_end_granularity,null);
  assert.equal(territory.source_refs[0].source_id,source.id);

  const territoryReplay=await createTerritoryRecord(client,territoryRaw);
  assert.equal(territoryReplay.replay,true);
  assert.equal(territoryReplay.id,territory.id);

  const ongoingRaw={
    ...territoryRaw,
    control_type:"administrative_control",
    valid_start:2020,
    valid_start_certainty:"exact",
    valid_start_calendar:"gregorian",
    chronology_status:"ongoing",
    ongoing_as_of:"2026-10-02",
    source_refs:[{source_id:source.id,locator:"ongoing control review 2026-10-02"}]
  };
  const ongoing=await createTerritoryRecord(client,ongoingRaw);
  assert.equal(ongoing.chronology_status,"ongoing");
  assert.equal(ongoing.valid_end,null);
  assert.equal(ongoing.ongoing_as_of,"2026-10-02");

  await assert.rejects(
    ()=>createTerritoryRecord(client,{...territoryRaw,valid_start:0}),
    /P14_TERRITORY_YEAR_INVALID/
  );
  assert.throws(
    ()=>normalizeTerritoryRecord({...territoryRaw,valid_end:null,valid_end_month:4}),
    /UNRESOLVED_BOUNDARY_PARTIAL/
  );
  assert.throws(
    ()=>normalizeGeometry({...geometryRaw,polity_id:polity.id}),
    /HISTORICAL_AUTHORITY_FORBIDDEN/
  );
  await assert.rejects(
    ()=>createTerritoryRecord(client,{...territoryRaw,source_refs:[{source_id:"11111111-1111-4111-8111-111111111111",locator:"missing"}]}),
    /P14_TERRITORY_SOURCE_UNRESOLVED/
  );

  const geometryReadback=await loadGeometry(client,geometry.id);
  const territoryReadback=await loadTerritoryRecord(client,territory.id);
  assert.equal(geometryReadback.id,geometry.id);
  assert.equal(territoryReadback.id,territory.id);
  assert.equal(territoryReadback.valid_end,null);
  assert.equal(territoryReadback.source_refs[0].locator,"territorial statement pp. 10-12");

  const counts=(await client.query(`
    select
      (select count(*)::int from atlas_v2.geometries) as geometries,
      (select count(*)::int from atlas_v2.geometry_sources) as geometry_sources,
      (select count(*)::int from atlas_v2.territory_records) as territory_records,
      (select count(*)::int from atlas_v2.territory_record_sources) as territory_record_sources
  `)).rows[0];
  assert.deepEqual(counts,{
    geometries:1,
    geometry_sources:1,
    territory_records:2,
    territory_record_sources:2
  });

  await client.query("commit");

  console.log(JSON.stringify({
    marker:"ATLAS_P14_TERRITORY_GEOMETRY_AUTHORING_OK",
    current_schema_reconstructed:true,
    canonical_geometry_uuid:true,
    canonical_territory_record_uuid:true,
    polity_only_territorial_authority:true,
    source_uuid_locator_provenance:true,
    unknown_temporal_boundary_preserved:true,
    ongoing_temporal_boundary_preserved:true,
    year_zero_rejected:true,
    partial_unknown_boundary_rejected:true,
    geometry_historical_authority_rejected:true,
    unresolved_source_rejected:true,
    geometry_replay_safe:true,
    territory_replay_safe:true,
    exact_readback:true,
    bulk_gis_content_authored:false
  },null,2));
}catch(error){
  try{await client.query("rollback");}catch{}
  throw error;
}finally{
  try{await client.query("drop schema if exists atlas_v2 cascade");}catch{}
  await client.end();
}
