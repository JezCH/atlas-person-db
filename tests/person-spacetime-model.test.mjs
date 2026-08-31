import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require=createRequire(import.meta.url);
const model=require("../atlas-person-spacetime-model.js");

function geographyIndex(region="east-asia"){return {schema:model.SPATIAL_INDEX_SCHEMA,polity_geography:{"polity-a":region},place_function_records:[],review_queue:[]};}
function placeFunctionIndex(){return {schema:model.SPATIAL_INDEX_SCHEMA,polity_geography:{},place_function_records:[{polity_id:"polity-a",functions:[
  {start_year:100,end_year:109,function_type:"capital",place_name:"Old Capital",region_code:"west-asia",confidence:"well_established",source_refs:["source:old"]},
  {start_year:110,end_year:130,function_type:"capital",place_name:"New Capital",region_code:"east-asia",confidence:"well_established",source_refs:["source:new"]}
]}],review_queue:[]};}

test("historical timeline has no year zero",()=>{
  assert.equal(model.historicalYearToOrdinal(-1),-1); assert.equal(model.historicalYearToOrdinal(1),0); assert.equal(model.historicalYearToOrdinal(0),null);
  assert.equal(model.ordinalToHistoricalYear(-1),-1); assert.equal(model.ordinalToHistoricalYear(0),1);
});

test("century ticks cross BCE and CE without year zero",()=>{
  const ticks=model.buildCenturyTicks(-250,250);
  assert.deepEqual(ticks.filter(t=>!t.terminal).map(t=>t.year),[-200,-100,1,100,200]);
  assert.equal(ticks.some(t=>t.year===0),false);
});

test("reviewed polity geography places an activity without invented precision",()=>{
  const placement=model.resolveActivityPlacement({id:"a",polity:{id:"polity-a"},start:{year:100},end:{year:120}},model.createSpatialLookup(geographyIndex()));
  assert.equal(placement.status,"placed"); assert.equal(placement.segments[0].region_code,"east-asia"); assert.equal(placement.segments[0].placement_basis,"polity_geography");
});

test("missing reviewed spatial record stays unresolved",()=>{
  const lookup=model.createSpatialLookup({schema:model.SPATIAL_INDEX_SCHEMA,polity_geography:{},place_function_records:[],review_queue:[]});
  assert.equal(model.resolveActivityPlacement({id:"a",polity:{id:"polity-a"},start:{year:100},end:{year:120}},lookup).status,"spatial_unresolved");
});

test("partial and reversed chronology remain review-required",()=>{
  const lookup=model.createSpatialLookup(geographyIndex());
  assert.equal(model.resolveActivityPlacement({id:"p",polity:{id:"polity-a"},start:{year:110},end:{year:null}},lookup).chronology_reason,"incomplete_boundary");
  assert.equal(model.resolveActivityPlacement({id:"r",polity:{id:"polity-a"},start:{year:130},end:{year:110}},lookup).chronology_reason,"reversed_boundaries");
});

test("reviewed capital move splits only visual placement segments",()=>{
  const activity={id:"a",polity:{id:"polity-a"},start:{year:105},end:{year:115}};
  const placement=model.resolveActivityPlacement(activity,model.createSpatialLookup(placeFunctionIndex()));
  assert.deepEqual(placement.segments.map(s=>[s.place_name,s.start_year,s.end_year,s.region_code]),[
    ["Old Capital",105,109,"west-asia"],["New Capital",110,115,"east-asia"]
  ]);
  assert.equal(activity.start.year,105); assert.equal(activity.end.year,115);
});

test("spatial evidence validation remains strict",()=>{
  const invalid=placeFunctionIndex(); invalid.place_function_records[0].functions[0].source_refs=[];
  assert.ok(model.validateSpatialIndex(invalid).errors.some(m=>m.includes("source_refs")));
  assert.ok(model.validateSpatialIndex(geographyIndex("middle-earth")).errors.some(m=>m.includes("invalid region_code")));
});

test("committed spatial index satisfies reviewed placement contract",()=>{
  const index=JSON.parse(readFileSync(new URL("../atlas-polity-spatial-index.json",import.meta.url),"utf8"));
  const result=model.validateSpatialIndex(index);
  assert.equal(result.valid,true,result.errors.join(" | "));
  assert.ok(Object.keys(index.polity_geography).length>0);
  assert.ok(index.place_function_records.length>0);
});

test("legacy low-scale projection lane and adaptive tick APIs are not exported",()=>{
  for(const name of ["createSpacetimeTimeProjection","createLogTimelineScale","buildAdaptiveTimeTicks","assignLanes"]) assert.equal(Object.hasOwn(model,name),false);
});
