import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const density = require("../atlas-person-spacetime-density.js");

const PROJECTION = Object.freeze({ yForOrdinal: (ordinal) => Number(ordinal) });
const CANVAS = Object.freeze({ width: 360, height: 280 });

function segment(id, startOrdinal, endOrdinal, xMin = 0.2, xMax = 0.4) {
  return Object.freeze({
    stable_id: id,
    activity_id: id,
    start_ordinal: startOrdinal,
    end_ordinal: endOrdinal,
    x_anchor: (xMin + xMax) / 2,
    x_min: xMin,
    x_max: xMax,
    spatial_precision: "macroregion"
  });
}

function track(personId, segments, counterparties = []) {
  return Object.freeze({
    person_id: personId,
    track_id: personId,
    primary_segments: Object.freeze(segments),
    counterparty_segments: Object.freeze(counterparties)
  });
}

test("density cells count unique Persons rather than overlapping Activity segments", () => {
  const source = {
    tracks: [
      track("p1", [segment("p1-a", 40, 90), segment("p1-b", 40, 90)]),
      track("p2", [segment("p2-a", 40, 90)])
    ]
  };
  const result = density.buildDensityField(source, PROJECTION, CANVAS, { cellWidth: 40, cellHeight: 25 });

  assert.equal(result.covered_person_count, 2);
  assert.equal(result.max_count, 2);
  assert.ok(result.cells.some((cell) => cell.count === 2));
  assert.ok(result.cells.every((cell) => cell.count <= 2));
});

test("a long-lived Person contributes to each crossed time cell only once per cell", () => {
  const source = { tracks: [track("long", [segment("long-a", 20, 180), segment("long-b", 70, 130)])] };
  const result = density.buildDensityField(source, PROJECTION, CANVAS, { cellWidth: 60, cellHeight: 30 });

  assert.ok(new Set(result.cells.map((cell) => cell.row)).size > 1);
  assert.ok(result.cells.every((cell) => cell.count === 1));
  assert.ok(result.cells.every((cell) => cell.person_ids.length === 1 && cell.person_ids[0] === "long"));
});

test("reviewed spatial extent is rasterized without inventing a precise center-only location", () => {
  const source = { tracks: [track("broad", [segment("broad", 50, 80, 0, 1 / 3)])] };
  const result = density.buildDensityField(source, PROJECTION, CANVAS, { cellWidth: 30, cellHeight: 30 });
  const occupiedColumns = new Set(result.cells.map((cell) => cell.column));

  assert.ok(occupiedColumns.size >= 4);
  assert.ok(Math.min(...occupiedColumns) === 0);
  assert.ok(Math.max(...occupiedColumns) < CANVAS.width / 30);
});

test("counterparty-only relations never contribute to self-location density", () => {
  const source = {
    tracks: [track("person", [segment("primary", 30, 60, 0.1, 0.2)], [segment("opposes", 30, 60, 0.8, 0.9)])]
  };
  const result = density.buildDensityField(source, PROJECTION, CANVAS, { cellWidth: 36, cellHeight: 28 });
  const occupiedColumns = new Set(result.cells.map((cell) => cell.column));

  assert.ok([...occupiedColumns].every((column) => column < 3));
  assert.equal(result.covered_person_count, 1);
});

test("visibleRect excludes offscreen segments and keeps cells inside the canvas", () => {
  const source = { tracks: [track("ancient", [segment("ancient", 10, 50, 0.2, 0.4)])] };
  const result = density.buildDensityField(source, PROJECTION, CANVAS, {
    cellWidth: 64,
    cellHeight: 33,
    visibleRect: { left: 0, top: 120, right: 360, bottom: 280 }
  });

  assert.equal(result.cells.length, 0);
  assert.equal(result.covered_person_count, 0);
  assert.equal(result.max_count, 0);
});

test("raw counts remain explicit while visual intensity is log-normalized", () => {
  const source = {
    tracks: [
      track("a", [segment("a", 40, 70, 0.2, 0.3)]),
      track("b", [segment("b", 40, 70, 0.2, 0.3)]),
      track("c", [segment("c", 120, 150, 0.6, 0.7)])
    ]
  };
  const result = density.buildDensityField(source, PROJECTION, CANVAS, { cellWidth: 36, cellHeight: 28 });

  assert.equal(Math.max(...result.cells.map((cell) => cell.intensity)), 1);
  assert.ok(result.cells.every((cell) => Number.isInteger(cell.count) && cell.count > 0));
  assert.ok(result.cells.every((cell) => cell.intensity > 0 && cell.intensity <= 1));
  assert.equal(result.legend_label, "ATLAS 등록 인물 밀도");
  assert.equal(result.data_basis, "unique_registered_person_activity_density");
  assert.equal(result.spatial_basis, "reviewed_activity_spatial_extent");
  assert.match(result.interpretation_note, /실제 역사 인구/);
  assert.match(result.interpretation_note, /지정학적 권력/);
  assert.match(result.interpretation_note, /중요도/);
});

test("density output is deterministic and edge-cell geometry remains bounded", () => {
  const source = {
    tracks: [
      track("z", [segment("z", 200, 279, 0.91, 1)]),
      track("a", [segment("a", 200, 279, 0.91, 1)])
    ]
  };
  const options = { cellWidth: 64, cellHeight: 33 };
  const first = density.buildDensityField(source, PROJECTION, CANVAS, options);
  const second = density.buildDensityField(source, PROJECTION, CANVAS, options);

  assert.deepEqual(first.cells, second.cells);
  for (const cell of first.cells) {
    assert.ok(cell.left >= 0 && cell.top >= 0);
    assert.ok(cell.right <= CANVAS.width && cell.bottom <= CANVAS.height);
    assert.ok(cell.width > 0 && cell.height > 0);
    assert.deepEqual(cell.person_ids, cell.person_ids.slice().sort());
  }
});
