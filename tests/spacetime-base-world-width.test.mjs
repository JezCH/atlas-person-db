import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const spaceAxis = require("../atlas-person-spacetime-space-axis.js");

test("base world width is bounded globally rather than growing with a wide viewport", () => {
  assert.equal(spaceAxis.DEFAULT_MIN_BASE_WORLD_WIDTH, 900);
  assert.equal(spaceAxis.DEFAULT_MAX_BASE_WORLD_WIDTH, 1275);
  assert.equal(spaceAxis.baseWorldWidthForViewport(1024, 152), 900);
  assert.equal(spaceAxis.baseWorldWidthForViewport(1280, 152), 1126);
  assert.equal(spaceAxis.baseWorldWidthForViewport(1440, 152), 1275);
  assert.equal(spaceAxis.baseWorldWidthForViewport(1920, 152), 1275);
  assert.equal(spaceAxis.baseWorldWidthForViewport(3840, 152), 1275);
});

test("base width cap preserves nine equal macroregion bands", () => {
  const continuum = spaceAxis.createSpatialContinuum();
  const base = spaceAxis.baseWorldWidthForViewport(3840, 152);
  const contentWidth = base * 5 * 0.78;
  const regions = spaceAxis.stableRegionLayout(continuum, contentWidth);
  assert.equal(regions.length, 9);
  const expected = contentWidth / 9;
  for (const region of regions) assert.ok(Math.abs(region.width - expected) < 1e-9);
});

test("base width policy rejects invalid bounds instead of silently warping geometry", () => {
  assert.throws(() => spaceAxis.baseWorldWidthForViewport(0, 152), /viewportWidth must be > 0/);
  assert.throws(() => spaceAxis.baseWorldWidthForViewport(1280, -1), /axisWidth must be >= 0/);
  assert.throws(() => spaceAxis.baseWorldWidthForViewport(1280, 152, { minWidth: 1300, maxWidth: 1200 }), /maxWidth must be >= minWidth/);
});
