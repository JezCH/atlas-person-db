import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const viewUrl = new URL("../atlas-person-spacetime-view.js", import.meta.url);
const cssUrl = new URL("../atlas-person-spacetime-view.css", import.meta.url);
const performanceUrl = new URL("../atlas-person-spacetime-performance.js", import.meta.url);

async function fixture(url) {
  return readFile(url, "utf8");
}

test("current spacetime surface loads P13 performance runtime in place", async () => {
  const view = await fixture(viewUrl);
  const performance = await fixture(performanceUrl);

  assert.doesNotThrow(() => new Function(view));
  assert.ok(view.includes("atlas-person-spacetime-performance.js?v=20260826-p13"));
  assert.ok(view.includes("ATLAS_PERSON_SPACETIME_PERFORMANCE"));
  assert.ok(view.includes("performance: window.ATLAS_PERSON_SPACETIME_PERFORMANCE"));
  assert.ok(performance.includes("DEFAULT_OVERSCAN"));
  assert.ok(performance.includes("viewportWorldRect"));
  assert.ok(performance.includes("cullProjectedItems"));
  assert.ok(performance.includes("cullTrackSegments"));
});

test("Person and Activity DOM are virtualized into viewport runtime layers", async () => {
  const view = await fixture(viewUrl);

  assert.ok(view.includes('id="spacetimeRailLayer"'));
  assert.ok(view.includes('id="spacetimePointLayer"'));
  assert.ok(view.includes('id="spacetimeLabelLayer"'));
  assert.ok(view.includes('id="spacetimeActivityLayer"'));
  assert.ok(view.includes("performance.viewportWorldRect("));
  assert.ok(view.includes("performance.cullProjectedItems(state.projectedTracks"));
  assert.ok(view.includes("performance.cullTrackSegments(state.visibleTracks"));
  assert.ok(view.includes('scroll.addEventListener("scroll", schedule'));
  assert.ok(view.includes("requestAnimationFrame(refresh)"));
  assert.ok(view.includes("if (signature !== lastSignature)"));
  assert.doesNotMatch(view, /const pointsHtml = lodWeights\.points/);
});

test("density is rendered on one culled canvas with static CSS ownership", async () => {
  const view = await fixture(viewUrl);
  const css = await fixture(cssUrl);
  const performance = await fixture(performanceUrl);

  assert.ok(view.includes('id="spacetimeDensityCanvas"'));
  assert.ok(view.includes("drawDensityCanvas(mount, state.densityField"));
  assert.ok(view.includes("performance.cullDensityCells(densityField.cells"));
  assert.ok(view.includes("context.fillRect(cell.left - cullRect.left"));
  assert.doesNotMatch(view, /class="spacetime-density-cell"/);
  assert.ok(css.includes(".spacetime-density-canvas{"));
  assert.ok(css.includes(".spacetime-runtime-layer{"));
  assert.doesNotMatch(css, /\.spacetime-density-cell\{/);
  assert.doesNotMatch(performance, /createElement\("style"\)/);
  assert.doesNotMatch(performance, /atlasSpacetimePerformanceStyles/);
});

test("historical compile, timeline and search text are cached across camera-only rerenders", async () => {
  const view = await fixture(viewUrl);

  assert.ok(view.includes("let compiledAtlasCache = null"));
  assert.ok(view.includes("let timelineCache = null"));
  assert.ok(view.includes("let searchTextCache = new Map()"));
  assert.ok(view.includes("if (compiledAtlasCache) return compiledAtlasCache"));
  assert.ok(view.includes("if (timelineCache) return timelineCache"));
  assert.ok(view.includes("searchTextCache.has(key)"));
});

test("virtualized Person interactions use event delegation so scroll-created nodes remain clickable", async () => {
  const view = await fixture(viewUrl);

  assert.ok(view.includes('canvas?.addEventListener("click"'));
  assert.ok(view.includes('event.target.closest?.("[data-spacetime-person]")'));
  assert.ok(view.includes("selectPerson(mount, target.dataset.spacetimePerson, { focus: true })"));
  assert.doesNotMatch(view, /querySelectorAll\("\[data-spacetime-person\]"\)/);
});