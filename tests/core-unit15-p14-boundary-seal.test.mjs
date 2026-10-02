import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require=createRequire(import.meta.url);
const p14=require("../server/atlas-p14-territory-geometry-contract.js");

const POLITY="11111111-1111-4111-8111-111111111111";
const GEOMETRY="22222222-2222-4222-8222-222222222222";
const SOURCE="33333333-3333-4333-8333-333333333333";

const geometry={
  geometry_id:GEOMETRY,
  geometry_kind:"polygon",
  geometry_ref:"repo://geometry/g1",
  source_refs:[{source_id:SOURCE,locator:"plate 1"}]
};

const territory={
  polity_id:POLITY,
  geometry_id:GEOMETRY,
  control_type:"de_facto_control",
  boundary_certainty:"approximate",
  evidence_confidence:"probable",
  valid_start:1584,
  valid_start_month:null,
  valid_start_day:null,
  valid_start_granularity:"year",
  valid_start_certainty:"approximate",
  valid_start_calendar:"source_calendar",
  valid_end:1590,
  valid_end_month:null,
  valid_end_day:null,
  valid_end_granularity:"year",
  valid_end_certainty:"uncertain",
  valid_end_calendar:"source_calendar",
  chronology_status:"reviewed",
  source_refs:[{source_id:SOURCE,locator:"pp. 10-12"}]
};

test("P14 current contract preserves Person Activity Polity TerritoryRecord Geometry chain",()=>{
  assert.equal(p14.CONTRACT.schema,"atlas-p14-territory-geometry-contract/v2");
  assert.deepEqual(p14.CONTRACT.chain,["Person","Activity","Polity","TerritoryRecord","Geometry"]);
  assert.equal(p14.assertTerritoryGeometryLink(territory,geometry),true);
});

test("P14 TerritoryRecord uses canonical UUID provenance and Stage2 temporal vocabulary",()=>{
  const normalized=p14.normalizeTerritoryRecord(territory);
  assert.equal(normalized.polity_id,POLITY);
  assert.equal(normalized.geometry_id,GEOMETRY);
  assert.equal(normalized.source_refs[0].source_id,SOURCE);
  assert.equal(normalized.valid_start_granularity,"year");
  assert.equal(normalized.valid_end_certainty,"uncertain");
  assert.match(normalized.semantic_key,/atlas-territory-record\/v2/);
});

test("P14 unknown boundary is all-null and never fabricated",()=>{
  const unresolved={
    ...territory,
    valid_end:null,
    valid_end_month:null,
    valid_end_day:null,
    valid_end_granularity:null,
    valid_end_certainty:null,
    valid_end_calendar:null
  };
  const normalized=p14.normalizeTerritoryRecord(unresolved);
  assert.equal(normalized.valid_end,null);
  assert.match(normalized.semantic_key,/<UNKNOWN>/);
  assert.throws(()=>p14.normalizeTerritoryRecord({...unresolved,valid_end_month:4}),/UNRESOLVED_BOUNDARY_PARTIAL/);
  assert.throws(()=>p14.normalizeTerritoryRecord({...territory,valid_start:0}),/YEAR_INVALID/);
});

test("P14 ongoing boundary is distinct from unresolved closed history",()=>{
  const ongoing=p14.normalizeTerritoryRecord({
    ...territory,
    valid_end:null,
    valid_end_month:null,
    valid_end_day:null,
    valid_end_granularity:null,
    valid_end_certainty:null,
    valid_end_calendar:null,
    chronology_status:"ongoing",
    ongoing_as_of:"2026-10-02"
  });
  assert.equal(ongoing.valid_end,null);
  assert.equal(ongoing.ongoing_as_of,"2026-10-02");
  assert.match(ongoing.semantic_key,/<ONGOING>/);
  assert.throws(()=>p14.normalizeTerritoryRecord({
    ...territory,
    chronology_status:"ongoing",
    ongoing_as_of:"2026-10-02"
  }),/ONGOING_END_BOUNDARY_MUST_BE_UNRESOLVED/);
});

test("P14 forbids Person or Activity owned territory and display authority fabrication",()=>{
  assert.throws(()=>p14.normalizeTerritoryRecord({...territory,person_id:"person"}),/PERSON_ACTIVITY_OWNED/);
  assert.throws(()=>p14.normalizeTerritoryRecord({...territory,activity_id:"activity"}),/PERSON_ACTIVITY_OWNED/);
  assert.throws(()=>p14.normalizeTerritoryRecord({...territory,region_code:"east_asia"}),/DISPLAY_FIELD/);
});

test("P14 Geometry is reusable evidence-backed shape, not political authority",()=>{
  assert.equal(p14.normalizeGeometry(geometry).geometry_id,GEOMETRY);
  assert.throws(()=>p14.normalizeGeometry({...geometry,polity_id:POLITY}),/HISTORICAL_AUTHORITY/);
  assert.throws(()=>p14.normalizeGeometry({...geometry,control_type:"sovereign_control"}),/HISTORICAL_AUTHORITY/);
  assert.throws(()=>p14.normalizeGeometry({...geometry,provenance:{invented:true}}),/INVENTED_GEOMETRY/);
  assert.throws(()=>p14.normalizeGeometry({...geometry,source_refs:["source:locator"]}),/SOURCE_INVALID/);
});

test("P14 TerritoryRecord requires exact Geometry UUID link",()=>{
  assert.throws(
    ()=>p14.assertTerritoryGeometryLink({...territory,geometry_id:"44444444-4444-4444-8444-444444444444"},geometry),
    /LINK_MISMATCH/
  );
  assert.equal(p14.CONTRACT.publication.bulk_gis_content_is_noncore,true);
  assert.equal(p14.CONTRACT.publication.display_only_spatial_disposition_is_not_territorial_authority,true);
});
