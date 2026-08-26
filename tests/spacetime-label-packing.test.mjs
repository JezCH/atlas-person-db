import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const labels = require("../atlas-person-spacetime-label-engine.js");

function assertNoRectangleOverlap(placements, gap = 0) {
  for (let left = 0; left < placements.length; left += 1) {
    for (let right = left + 1; right < placements.length; right += 1) {
      assert.equal(
        labels.rectanglesOverlap(placements[left].rect, placements[right].rect, gap),
        false,
        `${placements[left].person_id} overlaps ${placements[right].person_id}`
      );
    }
  }
}

test("colliding labels keep their historical Y and resolve only through horizontal placement", () => {
  const input = [
    { person_id: "person-a", text: "Alpha", anchor_x: 110, anchor_y: 200, width: 74 },
    { person_id: "person-b", text: "Beta", anchor_x: 114, anchor_y: 200, width: 74 }
  ];
  const result = labels.packLabels(input, { width: 260, height: 600 });

  assert.equal(result.placed.length, input.length);
  assertNoRectangleOverlap(result.placed, labels.DEFAULT_HORIZONTAL_GAP);
  for (const placement of result.placed) {
    assert.equal(placement.label_y, 200);
    assert.equal(placement.anchor_y, 200);
    assert.ok(placement.rect.left >= 0);
    assert.ok(placement.rect.right <= 260);
  }
});

test("capacity overflow defers labels instead of inventing a different Y position", () => {
  const input = [
    { person_id: "person-a", text: "Alpha", anchor_x: 35, anchor_y: 100, width: 60 },
    { person_id: "person-b", text: "Beta", anchor_x: 35, anchor_y: 100, width: 60 }
  ];
  const result = labels.packLabels(input, { width: 70, height: 220 });

  assert.equal(result.placed.length, 1);
  assert.equal(result.deferred.length, 1);
  assert.equal(result.placed[0].label_y, 100);
  assert.equal(result.deferred[0].anchor_y, 100);
  assert.equal(result.deferred[0].reason, "collision_capacity");
});

test("label placement is deterministic and sparse labels remain exactly on their anchors", () => {
  const input = [
    { person_id: "a", text: "A", anchor_x: 20, anchor_y: 40 },
    { person_id: "b", text: "B", anchor_x: 20, anchor_y: 140 },
    { person_id: "c", text: "C", anchor_x: 20, anchor_y: 240 }
  ];
  const first = labels.packLabels(input, { width: 180, height: 400 });
  const second = labels.packLabels(input, { width: 180, height: 400 });

  assert.deepEqual(first, second);
  assert.deepEqual(first.placed.map((item) => item.label_y), [40, 140, 240]);
  assert.deepEqual(first.placed.map((item) => item.anchor_y), [40, 140, 240]);
});
