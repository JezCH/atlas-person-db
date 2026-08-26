import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const read = (name) => readFileSync(join(root, name), "utf8");

const view = read("atlas-person-spacetime-view.js");
const css = read("atlas-person-spacetime-view.css");
const performance = read("atlas-person-spacetime-performance.js");
const owner = read("atlas-domain-surface-owner.js");

test("final spacetime surface has one in-place renderer and no retired v2 or packing path", () => {
  const rootFiles = readdirSync(root);
  const viewFiles = rootFiles.filter((name) => /^atlas-person-spacetime-view(?:\.|-)/.test(name));
  assert.deepEqual(viewFiles.sort(), ["atlas-person-spacetime-view.css", "atlas-person-spacetime-view.js"]);
  assert.equal((view.match(/window\.ATLAS_PERSON_SPACETIME_VIEW\s*=/g) || []).length, 1);
  assert.doesNotMatch(view, /spacetime-v2/i);
  assert.doesNotMatch(owner, /spacetime-v2/i);
  assert.equal(existsSync(join(root, "atlas-person-spacetime-label-packing.js")), false);
  assert.doesNotMatch(owner, /spacetime-label-packing/);
});

test("retired card lane and density DOM paths cannot return", () => {
  for (const source of [view, css]) {
    assert.doesNotMatch(source, /spacetime-person-card/);
    assert.doesNotMatch(source, /lane_offset/);
    assert.doesNotMatch(source, /OVERVIEW_CARD_HEIGHT/);
    assert.doesNotMatch(source, /OVERVIEW_MIN_REGION_WIDTH/);
  }
  assert.doesNotMatch(view, /class="spacetime-density-cell"/);
  assert.doesNotMatch(css, /\.spacetime-density-cell\{/);
  assert.match(view, /id="spacetimeDensityCanvas"/);
  assert.match(css, /\.spacetime-density-canvas\{/);
});

test("performance runtime owns calculations only while the view stylesheet owns presentation", () => {
  assert.doesNotMatch(performance, /createElement\("style"\)/);
  assert.doesNotMatch(performance, /atlasSpacetimePerformanceStyles/);
  assert.doesNotMatch(performance, /style\.textContent/);
  assert.doesNotMatch(performance, /estimateViewport/);
  assert.doesNotMatch(performance, /renderBudget/);
  assert.match(css, /\.spacetime-canvas\{[^}]*contain:layout paint style/);
  assert.match(css, /\.spacetime-runtime-layer\{/);
});

test("current P1-P13 runtime stack remains connected after legacy removal", () => {
  for (const asset of [
    "atlas-person-spacetime-time-projection.js",
    "atlas-person-spacetime-space-axis.js",
    "atlas-person-spacetime-semantic-axis.js",
    "atlas-person-spacetime-exploration.js",
    "atlas-person-spacetime-minimap.js",
    "atlas-person-spacetime-performance.js",
    "atlas-person-spacetime-spatial-compile.js",
    "atlas-person-spacetime-person-tracks.js",
    "atlas-person-spacetime-political-placement.js",
    "atlas-person-spacetime-lod.js",
    "atlas-person-spacetime-density.js",
    "atlas-person-spacetime-label-engine.js"
  ]) {
    assert.ok(view.includes(asset), `${asset} must remain on the single production renderer`);
  }
  assert.match(view, /opposes/);
  assert.match(view, /spacetimeDensityCanvas/);
  assert.match(view, /spacetimeMinimapCanvas/);
  assert.match(view, /bindVirtualizedLayers/);
});