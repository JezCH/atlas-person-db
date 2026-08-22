import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const model = require("../atlas-person-spacetime-model.js");
const camera = require("../atlas-person-spacetime-camera-v2.js");
const time = require("../atlas-person-spacetime-time-scale-v2.js");
const density = require("../atlas-person-spacetime-density-v2.js");

const SCALE = time.createSemanticTimeScale(-3000, 2026);
const VIEWPORT = Object.freeze({ width: 600, height: 400 });

function stateAt(year, zoomTime = 16, zoomSpace = 8, centerSpace = 0.5) {
  return camera.createCamera(time.TIME_WORLD_BOUNDS, {
    centerTime: SCALE.baseForYear(year),
    centerSpace,
    zoomTime,
    zoomSpace
  });
}

function segment(id, startYear, endYear, x = 0.5) {
  return Object.freeze({
    stable_id: id,
    activity_id: id,
    start_year: startYear,
    end_year: endYear,
    start_ordinal: model.historicalYearToOrdinal(startYear),
    end_ordinal: model.historicalYearToOrdinal(endYear),
    x_anchor: x,
    x_min: x - 0.005,
    x_max: x + 0.005,
    relation_code: "active_in"
  });
}

function track(personId, segments) {
  return Object.freeze({ person_id: personId, track_id: personId, primary_segments: Object.freeze(segments) });
}

test("density cells count unique Persons rather than Activity or segment rows", () => {
  const source = {
    tracks: [
      track("p1", [segment("p1-a", 1900, 1910), segment("p1-b", 1900, 1910)]),
      track("p2", [segment("p2-a", 1900, 1910)])
    ]
  };
  const result = density.buildDensityField(source, SCALE, stateAt(1905), VIEWPORT, { cellWidth: 80, cellHeight: 80 });

  assert.equal(result.covered_person_count, 2);
  assert.ok(result.cells.length > 0);
  assert.equal(result.max_count, 2);
  assert.ok(result.cells.some((cell) => cell.count === 2));
  assert.ok(result.cells.every((cell) => cell.count <= 2));
});

test("a long-lived Person contributes to each crossed time cell but only once per cell", () => {
  const source = { tracks: [track("long", [segment("long-a", 1850, 1950), segment("long-b", 1880, 1920)])] };
  const result = density.buildDensityField(source, SCALE, stateAt(1900, 8, 8), VIEWPORT, { cellWidth: 100, cellHeight: 40 });

  assert.ok(result.cells.length > 1);
  assert.ok(result.cells.every((cell) => cell.count === 1));
  assert.ok(result.cells.every((cell) => cell.person_ids.length === 1 && cell.person_ids[0] === "long"));
});

test("raw counts remain explicit while visual intensity is log-normalized to the densest cell", () => {
  const source = {
    tracks: [
      track("a", [segment("a", 1900, 1901, 0.50)]),
      track("b", [segment("b", 1900, 1901, 0.50)]),
      track("c", [segment("c", 1910, 1911, 0.55)])
    ]
  };
  const result = density.buildDensityField(source, SCALE, stateAt(1905, 16, 8), VIEWPORT, { cellWidth: 40, cellHeight: 25 });
  assert.ok(result.max_count >= 1);
  assert.equal(Math.max(...result.cells.map((cell) => cell.intensity)), 1);
  assert.ok(result.cells.every((cell) => cell.intensity > 0 && cell.intensity <= 1));
  assert.ok(result.cells.every((cell) => Number.isInteger(cell.count)));
});

test("density metadata explicitly says this is ATLAS registered-person density, not population or importance", () => {
  const result = density.buildDensityField({ tracks: [] }, SCALE, camera.fitWorld(time.TIME_WORLD_BOUNDS), VIEWPORT);
  assert.equal(result.legend_label, "ATLAS 등록 인물 밀도");
  assert.equal(result.data_basis, "unique_registered_person_activity_density");
  assert.match(result.interpretation_note, /실제 역사 인구/);
  assert.match(result.interpretation_note, /중요도/);
});

test("offscreen historical segments create no density cells", () => {
  const source = { tracks: [track("ancient", [segment("ancient", -1000, -900, 0.5)])] };
  const result = density.buildDensityField(source, SCALE, stateAt(1900, 32, 16), VIEWPORT);
  assert.equal(result.cells.length, 0);
  assert.equal(result.covered_person_count, 0);
  assert.equal(result.max_count, 0);
});

test("cell ordering and membership are deterministic", () => {
  const source = {
    tracks: [
      track("z", [segment("z", 1900, 1920, 0.52)]),
      track("a", [segment("a", 1900, 1920, 0.52)])
    ]
  };
  const first = density.buildDensityField(source, SCALE, stateAt(1910), VIEWPORT, { cellWidth: 50, cellHeight: 30 });
  const second = density.buildDensityField(source, SCALE, stateAt(1910), VIEWPORT, { cellWidth: 50, cellHeight: 30 });
  assert.deepEqual(first.cells, second.cells);
  assert.ok(first.cells.every((cell) => {
    const sorted = cell.person_ids.slice().sort();
    return JSON.stringify(sorted) === JSON.stringify(cell.person_ids);
  }));
});

test("density field geometry stays inside the viewport including partial edge cells", () => {
  const source = { tracks: [track("p", [segment("p", 1900, 1910, 0.5)])] };
  const result = density.buildDensityField(source, SCALE, stateAt(1905), { width: 613, height: 407 }, { cellWidth: 64, cellHeight: 33 });
  for (const cell of result.cells) {
    assert.ok(cell.left >= 0 && cell.top >= 0);
    assert.ok(cell.right <= 613 && cell.bottom <= 407);
    assert.ok(cell.width > 0 && cell.height > 0);
  }
});