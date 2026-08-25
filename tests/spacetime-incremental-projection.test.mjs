import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const model = require("../atlas-person-spacetime-model.js");

function legacyY(startYear, endYear, height, softeningYears, year) {
  const startOrdinal = model.historicalYearToOrdinal(startYear);
  const endOrdinal = model.historicalYearToOrdinal(endYear);
  const ordinal = model.historicalYearToOrdinal(year);
  const span = endOrdinal - startOrdinal;
  const denominator = Math.log1p(span / softeningYears);
  const clamped = Math.min(endOrdinal, Math.max(startOrdinal, ordinal));
  const age = endOrdinal - clamped;
  return height * (1 - Math.log1p(age / softeningYears) / denominator);
}

test("current timeline rendering is routed through the reversible spacetime projection boundary", () => {
  const projection = model.createSpacetimeTimeProjection(-3000, 2026, 4200, 420);
  const legacyScale = model.createLogTimelineScale(-3000, 2026, 4200, 420);

  assert.equal(projection.projection_version, "spacetime-time-projection/v1");
  assert.equal(legacyScale.projection_version, "spacetime-time-projection/v1");
  assert.equal(legacyScale.mode, "log_age");
  assert.equal(legacyScale.height, 4200);
});

test("projection preserves the exact pre-camera screen Y mapping", () => {
  const projection = model.createSpacetimeTimeProjection(-3000, 2026, 4200, 420);
  for (const year of [-3000, -2000, -500, 1, 500, 1500, 1800, 1900, 2000, 2026]) {
    const expected = legacyY(-3000, 2026, 4200, 420, year);
    assert.ok(Math.abs(projection.yForYear(year) - expected) < 1e-9, `${year} changed screen Y`);
  }
});

test("world time and screen Y round-trip without inventing year zero", () => {
  const projection = model.createSpacetimeTimeProjection(-3000, 2026, 4200, 420);
  for (const year of [-3000, -753, -1, 1, 476, 1453, 1919, 2026]) {
    const ordinal = model.historicalYearToOrdinal(year);
    const screenY = projection.worldToScreenY(ordinal);
    const roundTripOrdinal = projection.screenToWorldOrdinal(screenY);
    assert.ok(Math.abs(roundTripOrdinal - ordinal) < 1e-8, `${year} failed ordinal round-trip`);
    assert.equal(projection.historicalYearForScreenY(screenY), year);
  }

  assert.equal(model.historicalYearToOrdinal(0), null);
});

test("projection clamps screen coordinates at the historical world bounds", () => {
  const projection = model.createSpacetimeTimeProjection(-3000, 2026, 4200, 420);
  assert.ok(Math.abs(projection.screenToWorldOrdinal(-100) - projection.start_ordinal) < 1e-8);
  assert.ok(Math.abs(projection.screenToWorldOrdinal(99999) - projection.end_ordinal) < 1e-8);
});