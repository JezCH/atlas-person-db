import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const packing = require("../atlas-person-spacetime-label-packing.js");

function assertNoRectangleOverlap(placements, gap = 0) {
  for (let left = 0; left < placements.length; left += 1) {
    for (let right = left + 1; right < placements.length; right += 1) {
      assert.equal(
        packing.rectangleOverlaps(placements[left], placements[right], gap),
        false,
        `${placements[left].id} overlaps ${placements[right].id}`
      );
    }
  }
}

test("overview packing separates labels that share the same historical Y position", () => {
  const items = Array.from({ length: 8 }, (_, index) => ({
    id: `person-${index}`,
    anchorX: 112,
    anchorY: 200
  }));
  const placements = packing.packRegionLabels(items, {
    regionLeft: 80,
    regionWidth: 156,
    canvasHeight: 600
  });

  assert.equal(placements.length, items.length);
  assertNoRectangleOverlap(placements, 2);
  for (const placement of placements) {
    assert.ok(placement.left >= 84);
    assert.ok(placement.left + placement.width <= 232.01);
    assert.ok(placement.top >= 0);
    assert.ok(placement.top + placement.height <= 600);
  }
});

test("narrow regions stay readable without crossing their region boundary", () => {
  const items = Array.from({ length: 6 }, (_, index) => ({
    id: `narrow-${index}`,
    anchorX: 12,
    anchorY: 100
  }));
  const placements = packing.packRegionLabels(items, {
    regionLeft: 0,
    regionWidth: 72,
    canvasHeight: 420
  });

  assert.equal(packing.chooseColumnCount(72), 1);
  assertNoRectangleOverlap(placements, 2);
  for (const placement of placements) {
    assert.ok(placement.left >= 4);
    assert.ok(placement.left + placement.width <= 68.01);
  }
});

test("packing is deterministic and keeps sparse labels on their original Y when possible", () => {
  const items = [
    { id: "a", anchorX: 20, anchorY: 40 },
    { id: "b", anchorX: 20, anchorY: 140 },
    { id: "c", anchorX: 20, anchorY: 240 }
  ];
  const first = packing.packRegionLabels(items, {
    regionLeft: 0,
    regionWidth: 110,
    canvasHeight: 400
  });
  const second = packing.packRegionLabels(items, {
    regionLeft: 0,
    regionWidth: 110,
    canvasHeight: 400
  });

  assert.deepEqual(first, second);
  assert.deepEqual(first.map((item) => item.top), [40, 140, 240]);
});
