import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const model = require("../atlas-person-spacetime-model.js");
const timeProjection = require("../atlas-person-spacetime-time-projection.js");
const spaceAxis = require("../atlas-person-spacetime-space-axis.js");
const spatialCompile = require("../atlas-person-spacetime-spatial-compile.js");
const personTracks = require("../atlas-person-spacetime-person-tracks.js");
const politicalPlacement = require("../atlas-person-spacetime-political-placement.js");
const lod = require("../atlas-person-spacetime-lod.js");
const labelEngine = require("../atlas-person-spacetime-label-engine.js");
const view = readFileSync(new URL("../atlas-person-spacetime-view.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../atlas-person-spacetime-view.css", import.meta.url), "utf8");

function almostEqual(a,b,e=1e-8){ assert.ok(Math.abs(a-b)<=e, `${a} != ${b}`); }
function compiledPlacement(activityId, regionCode, continuum, relationCode, startYear, endYear) {
  const band=continuum.bandForCode(regionCode);
  return {activity_id:activityId,status:"placed",segments:[{activity_id:activityId,polity_id:`polity-${activityId}`,start_year:startYear,end_year:endYear,x_anchor:band.center_space,x_min:band.min_space,x_max:band.max_space,macroregion_code:regionCode,subregion_code:null,spatial_precision:"macroregion",display_anchor_basis:"canonical_macroregion",historical_placement_basis:"reviewed_region",historical_confidence:"reviewed",relation_code:relationCode}]};
}

test("500 percent uniform time projection is linear reversible and has no year zero", () => {
  const p=timeProjection.createUniformTimeProjection(-3000,2026,4200*5*0.82,5);
  let previous=-Infinity;
  for(const year of [-2000,-500,-1,1,500,1500,2026]){
    const ordinal=model.historicalYearToOrdinal(year);
    const y=p.worldToScreenY(ordinal);
    assert.ok(y>previous);
    almostEqual(p.screenToWorldOrdinal(y),ordinal);
    previous=y;
  }
  const y1800=p.yForYear(1800), y1900=p.yForYear(1900), y2000=p.yForYear(2000);
  almostEqual(y1900-y1800,y2000-y1900);
  assert.equal(model.historicalYearToOrdinal(0),null);
});

test("spatial continuum stays nine equal macroregion bands independent of data density", () => {
  const c=spaceAxis.createSpatialContinuum();
  assert.equal(c.macroregions.length,9);
  for(const band of c.macroregions) almostEqual(band.max_space-band.min_space,1/9,1e-12);
});

test("spatial compile never invents precision", () => {
  const c=spaceAxis.createSpatialContinuum(), europe=c.bandForCode("europe");
  const raw={status:"placed",activity_id:"a",polity_id:"p",segments:[{activity_id:"a",polity_id:"p",region_code:"europe",place_id:"place-paris",place_name:"Paris",place_function_type:"capital",start_year:1800,end_year:1810,placement_basis:"polity_place_function",confidence:"reviewed",source_refs:["s"]}]};
  const compiled=spatialCompile.compileActivityPlacement(raw,c);
  assert.equal(compiled.segments[0].spatial_precision,"macroregion");
  assert.equal(compiled.segments[0].x_anchor,europe.center_space);
});

test("opposes stays counterparty only", () => {
  const c=spaceAxis.createSpatialContinuum();
  const person={id:"person-1",display_name:"P",activity_summaries:[
    {id:"primary",start:{year:1800},end:{year:1810},relation:{code:"affiliated_with"},polity:{id:"p1"}},
    {id:"opposes",start:{year:1811},end:{year:1820},relation:{code:"opposes"},polity:{id:"p2"}}
  ]};
  const compiled=personTracks.compilePersonTracks([person],[
    compiledPlacement("primary","europe",c,"affiliated_with",1800,1810),
    compiledPlacement("opposes","east-asia",c,"opposes",1811,1820)
  ]);
  const track=politicalPlacement.partitionTracks(compiled).tracks[0];
  assert.equal(track.primary_segments.length,1);
  assert.equal(track.counterparty_segments.length,1);
  assert.equal(track.primary_segments[0].activity_id,"primary");
});

test("label engine moves only horizontally or defers", () => {
  const packed=labelEngine.packLabels([
    {person_id:"a",text:"Alpha",anchor_x:100,anchor_y:120,width:72},
    {person_id:"b",text:"Beta",anchor_x:104,anchor_y:120,width:72}
  ],{width:240,height:300});
  assert.equal(packed.placed.length,2);
  for(const label of packed.placed) assert.equal(label.label_y,label.anchor_y);
  assert.equal(labelEngine.rectanglesOverlap(packed.placed[0].rect,packed.placed[1].rect,labelEngine.DEFAULT_HORIZONTAL_GAP),false);
});

test("readable-floor LOD is rail+label and Activity appears only with more zoom", () => {
  const minimum=lod.lodWeights({zoom:5});
  const detail=lod.lodWeights({zoom:8});
  assert.equal(minimum.labels,1);
  assert.equal(minimum.rails,1);
  assert.equal(minimum.activities,0);
  assert.equal(lod.representationStage(minimum),"rail");
  assert.equal(lod.representationStage(detail),"activity");
  assert.equal(Object.hasOwn(minimum,"density"),false);
  assert.equal(Object.hasOwn(minimum,"points"),false);
});

test("single renderer has no low-scale density point lane or card path", () => {
  assert.doesNotThrow(()=>new Function(view));
  assert.match(view,/createUniformTimeProjection\(/);
  assert.match(view,/GLOBAL_EXTENT_COMPRESSION = 0\.82/);
  assert.match(view,/performance\.cullProjectedItems\(/);
  assert.match(view,/spacetime-track-label/);
  assert.match(view,/spacetime-track-rail/);
  for(const retired of [/densityField/,/spacetimeDensityCanvas/,/spacetime-person-point/,/horizontalViewMode/,/assignLanes/]) assert.doesNotMatch(view,retired);
  assert.doesNotMatch(css,/spacetime-density|spacetime-person-point|is-overview/);
  assert.equal(existsSync(new URL("../atlas-person-spacetime-density.js",import.meta.url)),false);
});
