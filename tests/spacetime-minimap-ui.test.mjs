import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const viewUrl = new URL("../atlas-person-spacetime-view.js", import.meta.url);
const cssUrl = new URL("../atlas-person-spacetime-view.css", import.meta.url);
const minimapUrl = new URL("../atlas-person-spacetime-minimap.js", import.meta.url);

async function fixture(url) {
  return readFile(url, "utf8");
}

test("current spacetime surface loads the P12 minimap in place", async () => {
  const view = await fixture(viewUrl);
  const css = await fixture(cssUrl);
  const minimap = await fixture(minimapUrl);

  assert.ok(view.includes("atlas-person-spacetime-minimap.js?v=20260826-p12"));
  assert.ok(view.includes("ATLAS_PERSON_SPACETIME_MINIMAP"));
  assert.ok(view.includes("minimap: window.ATLAS_PERSON_SPACETIME_MINIMAP"));
  assert.ok(view.includes("renderMinimap()"));
  assert.ok(view.includes('id="spacetimeMinimapSurface"'));
  assert.ok(view.includes('id="spacetimeMinimapCanvas"'));
  assert.ok(view.includes('id="spacetimeMinimapViewport"'));
  assert.ok(view.includes('id="spacetimeMinimapSelected"'));
  assert.ok(view.includes("bindMinimap(mount, scroll, projection"));
  assert.ok(css.includes(".spacetime-minimap{"));
  assert.ok(css.includes(".spacetime-minimap-viewport{"));
  assert.ok(minimap.includes("scrollTargetForMinimapPoint"));
});

test("minimap preserves whole-world context while search only highlights active Persons", async () => {
  const view = await fixture(viewUrl);
  assert.ok(view.includes("const allProjectedTracks = compiled.partitioned.tracks.map"));
  assert.ok(view.includes("const projectedTracks = needle ? allProjectedTracks.filter"));
  assert.ok(view.includes("const activePersonIds = new Set(projectedTracks.map"));
  assert.ok(view.includes("drawMinimap(mount, allProjectedTracks, activePersonIds"));
  assert.doesNotMatch(view, /const allProjectedTracks = visibleTracks/);
});

test("minimap viewport follows scroll and pointer navigation changes only camera scroll", async () => {
  const view = await fixture(viewUrl);
  assert.ok(view.includes("minimap.viewportRect("));
  assert.ok(view.includes('scroll.addEventListener("scroll", () => updateMinimapViewport'));
  assert.ok(view.includes('surface.addEventListener("pointerdown"'));
  assert.ok(view.includes('surface.addEventListener("pointermove"'));
  assert.ok(view.includes("minimap.scrollTargetForMinimapPoint("));
  assert.ok(view.includes("scroll.scrollLeft = target.left"));
  assert.ok(view.includes("scroll.scrollTop = target.top"));
  assert.ok(view.includes("updateCameraPosition(scroll, projection)"));
});

test("minimap mirrors macroregion and era geometry and marks the selected Person", async () => {
  const view = await fixture(viewUrl);
  assert.ok(view.includes("for (const region of regions.slice(1))"));
  assert.ok(view.includes("minimap.projectVerticalLine(region.left"));
  assert.ok(view.includes("for (const era of eras.slice(1))"));
  assert.ok(view.includes("minimap.projectHorizontalLine(era.top"));
  assert.ok(view.includes("points.find((point) => point.person_id === selectedPersonId)"));
  assert.ok(view.includes("selectedMarker.hidden = !selected"));
});
