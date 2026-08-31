import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const viewUrl = new URL("../atlas-person-spacetime-view.js", import.meta.url);
const cssUrl = new URL("../atlas-person-spacetime-view.css", import.meta.url);
const performanceUrl = new URL("../atlas-person-spacetime-performance.js", import.meta.url);

async function fixture(url) { return readFile(url, "utf8"); }

test("current spacetime surface keeps viewport virtualization runtime", async () => {
  const view = await fixture(viewUrl);
  const performance = await fixture(performanceUrl);
  assert.doesNotThrow(() => new Function(view));
  assert.ok(view.includes("ATLAS_PERSON_SPACETIME_PERFORMANCE"));
  assert.ok(performance.includes("DEFAULT_OVERSCAN"));
  assert.ok(performance.includes("viewportWorldRect"));
  assert.ok(performance.includes("cullProjectedItems"));
  assert.ok(performance.includes("cullTrackSegments"));
});

test("only rail label and Activity DOM layers remain", async () => {
  const view = await fixture(viewUrl);
  assert.ok(view.includes('id="spacetimeRailLayer"'));
  assert.ok(view.includes('id="spacetimeLabelLayer"'));
  assert.ok(view.includes('id="spacetimeActivityLayer"'));
  assert.doesNotMatch(view, /spacetimePointLayer/);
  assert.doesNotMatch(view, /spacetimeDensityCanvas/);
  assert.ok(view.includes("performance.viewportWorldRect("));
  assert.ok(view.includes("performance.cullProjectedItems(state.projectedTracks"));
  assert.ok(view.includes("performance.cullTrackSegments(state.visibleTracks"));
  assert.ok(view.includes('scroll.addEventListener("scroll", schedule'));
  assert.ok(view.includes("requestAnimationFrame(refresh)"));
});

test("retired density and point presentation has no owner", async () => {
  const view = await fixture(viewUrl);
  const css = await fixture(cssUrl);
  const performance = await fixture(performanceUrl);
  assert.doesNotMatch(view, /densityField|drawDensityCanvas|cullDensityCells|spacetime-person-point/);
  assert.doesNotMatch(css, /spacetime-density|spacetime-person-point/);
  assert.doesNotMatch(performance, /cullDensityCells/);
  assert.doesNotMatch(performance, /createElement\("style"\)/);
});

test("historical compile timeline and search text stay cached across camera rerenders", async () => {
  const view = await fixture(viewUrl);
  assert.ok(view.includes("let compiledAtlasCache = null"));
  assert.ok(view.includes("let timelineCache = null"));
  assert.ok(view.includes("let searchTextCache = new Map()"));
  assert.ok(view.includes("if (compiledAtlasCache) return compiledAtlasCache"));
  assert.ok(view.includes("if (timelineCache) return timelineCache"));
  assert.ok(view.includes("searchTextCache.has(key)"));
});

test("virtualized Person interactions use delegation", async () => {
  const view = await fixture(viewUrl);
  assert.ok(view.includes('canvas?.addEventListener("click"'));
  assert.ok(view.includes('event.target.closest?.("[data-spacetime-person]")'));
  assert.ok(view.includes("selectPerson(mount, target.dataset.spacetimePerson, { focus: false })"));
});
