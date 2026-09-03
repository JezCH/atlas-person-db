import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require=createRequire(import.meta.url);
const semantic=require("../atlas-person-spacetime-semantic-axis.js");
const spatialCompile=require("../atlas-person-spacetime-spatial-compile.js");
const spaceAxis=require("../atlas-person-spacetime-space-axis.js");
const view=readFileSync(new URL("../atlas-person-spacetime-view.js",import.meta.url),"utf8");
const css=readFileSync(new URL("../atlas-person-spacetime-view.css",import.meta.url),"utf8");

test("Production Place LOD consumes only the reviewed binding registry",()=>{
  const continuum=spaceAxis.createSpatialContinuum();
  const floor=semantic.buildSpaceHeaderPlan(continuum,3600,5,spatialCompile.REVIEWED_PLACE_BINDINGS);
  const detail=semantic.buildSpaceHeaderPlan(continuum,3600,8,spatialCompile.REVIEWED_PLACE_BINDINGS);

  assert.equal(floor.place_opacity,0);
  assert.equal(floor.stage,"subregion");
  assert.equal(detail.place_opacity,1);
  assert.equal(detail.stage,"place");
  assert.equal(detail.places.length,spatialCompile.REVIEWED_PLACE_BINDINGS.length);
  assert.deepEqual(new Set(detail.places.map(p=>p.place_id)),new Set(spatialCompile.REVIEWED_PLACE_BINDINGS.map(p=>p.place_id)));
  assert.ok(detail.places.every(p=>p.exact_geographic_coordinate_claimed===false));
});

test("Place LOD adds semantic markers without changing macroregion or subregion geometry",()=>{
  const continuum=spaceAxis.createSpatialContinuum();
  const floor=semantic.buildSpaceHeaderPlan(continuum,3600,5,spatialCompile.REVIEWED_PLACE_BINDINGS);
  const detail=semantic.buildSpaceHeaderPlan(continuum,3600,8,spatialCompile.REVIEWED_PLACE_BINDINGS);
  assert.deepEqual(detail.macroregions,floor.macroregions);
  assert.deepEqual(detail.subregions,floor.subregions);
});

test("renderer exposes reviewed Place labels and explicitly denies exact geographic coordinates",()=>{
  assert.match(view,/buildSpaceHeaderPlan\(compiled\.continuum, contentWidth, cameraZoom, spatialCompile\.REVIEWED_PLACE_BINDINGS\)/);
  assert.match(view,/spacetime-region-head-layer is-place/);
  assert.match(view,/spacetime-place-head-marker/);
  assert.match(view,/spacetime-place-guide/);
  assert.match(view,/정확한 지리 좌표 아님/);
  assert.match(css,/\.spacetime-place-head-marker/);
  assert.match(css,/\.spacetime-place-guide/);
});

test("Place semantic LOD never reads Person density",()=>{
  const source=require("node:fs").readFileSync(new URL("../atlas-person-spacetime-semantic-axis.js",import.meta.url),"utf8");
  assert.doesNotMatch(source,/density|visibleTracks|projectedTracks|personCount|trackCount/i);
});
