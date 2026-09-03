import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const model = require("../atlas-person-spacetime-model.js");
const index = JSON.parse(readFileSync(new URL("../atlas-polity-spatial-index.json", import.meta.url), "utf8"));

const IDS = Object.freeze({
  byzantine: "074510f4-f2e7-5795-8cfb-2a4206fa7254",
  ottoman: "6d1520e2-0aff-5063-b2b7-95eb86daf372",
  kushan: "7ccd9ba0-28fb-55d7-8ae8-60de77c38603",
  hun: "9354d5c8-9a01-5021-af36-053adc967dba",
  daxi: "c40d4e85-38a3-59ab-b3f4-a618ffbde2e5",
  macedonian: "2f6e890f-1704-5c76-aa94-f18d7f905e06",
  omani: "68c83ef6-0023-5af9-a6e8-26ccf5b8e116",
  seleucid: "a1c6b0b4-ca71-420d-8d9f-502dc7914dd7",
  mongol: "d54c540c-f3fb-5d05-9dc0-26af4ee9815a",
  roman: "5d9a6186-bbe6-5d1a-ba93-02190ae4c417"
});

function activity(polityId, startYear, endYear, id = "activity-test") { return { id, polity: { id: polityId }, start: { year: startYear }, end: { year: endYear } }; }
function contiguous(segments, startYear, endYear) {
  assert.ok(segments.length > 0);
  assert.equal(segments[0].start_year, startYear);
  assert.equal(segments.at(-1).end_year, endYear);
  for (let i = 1; i < segments.length; i += 1) assert.equal(model.historicalYearToOrdinal(segments[i].start_year), model.historicalYearToOrdinal(segments[i - 1].end_year) + 1);
}

test("spatial index v2 uses one canonical temporal polity-place-function family", () => {
  const validation = model.validateSpatialIndex(index);
  assert.equal(validation.valid, true, validation.errors.join(" | "));
  assert.equal(index.schema, "atlas-polity-spatial-index/v2");
  assert.equal(Object.keys(index.polity_geography).length, 485);
  assert.equal(Object.keys(index.polity_subregions).length, 459);
  assert.equal(index.place_function_records.length, 11);
  assert.equal(index.review_queue.length, 2);
  assert.equal(Object.hasOwn(index, "capital_records"), false);
  assert.equal(Object.hasOwn(index, "authority_center_records"), false);
});

test("all canonical place functions retain reviewed source evidence", () => {
  const functions = index.place_function_records.flatMap((record) => record.functions);
  assert.ok(functions.length > 0);
  assert.equal(functions.every((fn) => Array.isArray(fn.source_refs) && fn.source_refs.length > 0), true);
  assert.equal(functions.some((fn) => fn.source_refs.some((ref) => String(ref).startsWith("ATLAS reviewed"))), false);
});

test("reviewed polity geography now retains stable subregion precision", () => {
  const lookup = model.createSpatialLookup(index);
  for (const [polityId, region, subregion] of [
    [IDS.kushan, "south-asia", "northwest-south-asia"],
    [IDS.hun, "europe", "central-europe"],
    [IDS.daxi, "east-asia", "china"]
  ]) {
    const placement = model.resolveActivityPlacement(activity(polityId, 100, 101, polityId), lookup);
    assert.equal(placement.status, "placed");
    assert.equal(placement.segments[0].placement_basis, "polity_geography");
    assert.equal(placement.segments[0].region_code, region);
    assert.equal(placement.segments[0].subregion_code, subregion);
  }
});

test("Roman imperial Rome placement remains Europe", () => {
  const placement = model.resolveActivityPlacement(activity(IDS.roman, -27, 100, "roman"), model.createSpatialLookup(index));
  assert.equal(placement.status, "placed");
  assert.equal(placement.segments[0].place_name, "Rome");
  assert.equal(placement.segments[0].region_code, "europe");
});

test("Ottoman temporal place functions remain contiguous across regional capital change", () => {
  const lookup = model.createSpatialLookup(index);
  const placement = model.resolveActivityPlacement(activity(IDS.ottoman, 1451, 1481, "mehmed"), lookup);
  assert.equal(placement.status, "placed");
  assert.deepEqual(placement.segments.map((s) => [s.place_function_type,s.place_name,s.region_code,s.start_year,s.end_year]), [["capital","Edirne","europe",1451,1452],["capital","Constantinople","europe",1453,1481]]);
  contiguous(placement.segments, 1451, 1481);
});

test("Byzantine place-function transitions retain full Activity coverage", () => {
  const placement = model.resolveActivityPlacement(activity(IDS.byzantine, 1203, 1262, "byzantine"), model.createSpatialLookup(index));
  assert.equal(placement.status, "placed"); contiguous(placement.segments, 1203, 1262);
});

test("Mongol court centers use the same polity-place-function contract as capitals", () => {
  const placement = model.resolveActivityPlacement(activity(IDS.mongol, 1260, 1271, "kublai"), model.createSpatialLookup(index));
  assert.equal(placement.status, "placed");
  assert.equal(placement.segments.length, 1);
  assert.equal(placement.segments[0].placement_basis, "polity_place_function");
  assert.equal(placement.segments[0].place_function_type, "imperial_court_core");
  assert.equal(placement.segments[0].region_code, "east-asia");
});

test("same-region simultaneous place functions compile; conflicting regions do not", () => {
  const base = { schema:index.schema, regions:index.regions, polity_geography:{}, review_queue:[] };
  const same = { ...base, place_function_records:[{ polity_id:"p", functions:[
    { start_year:100,end_year:110,function_type:"capital",place_name:"A",region_code:"west-asia",confidence:"well_established",source_refs:["s"] },
    { start_year:100,end_year:110,function_type:"royal_court",place_name:"B",region_code:"west-asia",confidence:"well_established",source_refs:["s"] }
  ]}]};
  const placed = model.resolveActivityPlacement(activity("p",100,110), model.createSpatialLookup(same));
  assert.equal(placed.status,"placed"); assert.equal(placed.segments[0].region_code,"west-asia"); assert.equal(placed.segments[0].active_place_functions.length,2);
  const conflict = structuredClone(same); conflict.place_function_records[0].functions[1].region_code="central-asia";
  const unresolved = model.resolveActivityPlacement(activity("p",100,110), model.createSpatialLookup(conflict));
  assert.equal(unresolved.status,"place_function_region_conflict"); assert.equal(unresolved.segments.length,0);
});

test("a place-function gap prevents silent partial placement", () => {
  const synthetic = { schema:index.schema, regions:index.regions, polity_geography:{}, review_queue:[], place_function_records:[{ polity_id:"p", functions:[
    { start_year:100,end_year:104,function_type:"capital",place_name:"A",region_code:"west-asia",confidence:"well_established",source_refs:["s"] },
    { start_year:106,end_year:110,function_type:"capital",place_name:"B",region_code:"west-asia",confidence:"well_established",source_refs:["s"] }
  ]}]};
  const result = model.resolveActivityPlacement(activity("p",100,110), model.createSpatialLookup(synthetic));
  assert.equal(result.status,"place_function_period_gap"); assert.equal(result.segments.length,0);
});

test("Seleucid Activity stays unresolved for representation, not because the model assumes one fixed capital", () => {
  const review = index.review_queue.find((row) => row.polity_id === IDS.seleucid);
  assert.equal(review?.reason, "multiple_reviewed_royal_centers_require_activity_specific_spatial_representation");
  const result = model.resolveActivityPlacement(activity(IDS.seleucid,-305,-281,"seleucus"), model.createSpatialLookup(index));
  assert.equal(result.status,"spatial_unresolved");
});


test("polity subregion mappings must be children of their reviewed macroregions", () => {
  const invalid = structuredClone(index);
  invalid.polity_subregions[IDS.kushan] = "japan";
  const validation = model.validateSpatialIndex(invalid);
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join("\n"), /is not a child of macroregion south-asia/);
});

test("broad or transregional reviewed polities may intentionally remain macroregion-only", () => {
  const india = "00ec4b0c-6002-5791-825c-43465632102d";
  assert.equal(index.polity_geography[india], "south-asia");
  assert.equal(index.polity_subregions[india], undefined);
  const placement = model.resolveActivityPlacement(activity(india, 1947, 1948, "india"), model.createSpatialLookup(index));
  assert.equal(placement.status, "placed");
  assert.equal(placement.segments[0].region_code, "south-asia");
  assert.equal(placement.segments[0].subregion_code, null);
});
