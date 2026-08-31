import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root=join(dirname(fileURLToPath(import.meta.url)),"..");
const read=(name)=>readFileSync(join(root,name),"utf8");
const view=read("atlas-person-spacetime-view.js");
const css=read("atlas-person-spacetime-view.css");
const model=read("atlas-person-spacetime-model.js");
const performance=read("atlas-person-spacetime-performance.js");

test("one in-place renderer remains",()=>{
  const viewFiles=readdirSync(root).filter((name)=>/^atlas-person-spacetime-view(?:\.|-)/.test(name));
  assert.deepEqual(viewFiles.sort(),["atlas-person-spacetime-view.css","atlas-person-spacetime-view.js"]);
  assert.equal((view.match(/window\.ATLAS_PERSON_SPACETIME_VIEW\s*=/g)||[]).length,1);
  assert.doesNotMatch(view,/spacetime-v2/i);
  assert.equal(existsSync(join(root,"atlas-person-spacetime-label-packing.js")),false);
});

test("all below-500 overview artifacts are physically absent",()=>{
  assert.equal(existsSync(join(root,"atlas-person-spacetime-density.js")),false);
  for(const source of [view,css,model,performance]){
    assert.doesNotMatch(source,/spacetime-person-card|lane_offset|OVERVIEW_CARD_HEIGHT|OVERVIEW_MIN_REGION_WIDTH/);
    assert.doesNotMatch(source,/spacetimeDensityCanvas|spacetime-person-point|is-overview/);
  }
  assert.doesNotMatch(model,/createLogTimelineScale|buildAdaptiveTimeTicks|assignLanes|createSpacetimeTimeProjection/);
  assert.doesNotMatch(performance,/cullDensityCells/);
});

test("current runtime stack excludes density and retains required readable-scale modules",()=>{
  for(const asset of [
    "atlas-person-spacetime-time-projection.js","atlas-person-spacetime-space-axis.js",
    "atlas-person-spacetime-semantic-axis.js","atlas-person-spacetime-exploration.js",
    "atlas-person-spacetime-minimap.js","atlas-person-spacetime-performance.js",
    "atlas-person-spacetime-spatial-compile.js","atlas-person-spacetime-person-tracks.js",
    "atlas-person-spacetime-political-placement.js","atlas-person-spacetime-lod.js",
    "atlas-person-spacetime-label-engine.js"
  ]) assert.ok(view.includes(asset),`${asset} must remain connected`);
  assert.doesNotMatch(view,/atlas-person-spacetime-density\.js/);
  assert.match(view,/spacetimeMinimapCanvas/);
  assert.match(view,/bindVirtualizedLayers/);
  assert.match(view,/opposes/);
});
