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

test("outer chrome compaction preserves the prior text content budget", () => {
  assert.equal(labels.DEFAULT_LABEL_CHROME_WIDTH, 4);
  assert.equal(labels.DEFAULT_MIN_LABEL_WIDTH, 30);
  assert.equal(labels.DEFAULT_MAX_LABEL_WIDTH, 148);
  assert.equal(labels.DEFAULT_MIN_LABEL_WIDTH - labels.DEFAULT_LABEL_CHROME_WIDTH, 26);
  assert.equal(labels.DEFAULT_MAX_LABEL_WIDTH - labels.DEFAULT_LABEL_CHROME_WIDTH, 144);
  assert.equal(labels.estimateWidth({ text: "12345678901234567890" }), 140);
});


test("CJK names use wide glyph metrics instead of the Latin-width floor", () => {
  assert.equal(labels.DEFAULT_CJK_CHAR_WIDTH, 10);
  assert.ok(labels.estimateWidth({ text:"서하 경종" }) > 44);
  assert.ok(labels.estimateWidth({ text:"미나모토노 요시츠네" }) > labels.estimateWidth({ text:"Minamoto" }));
});

test("per-label horizontal zones prevent packing into otherwise unused forbidden space", () => {
  const input = [
    { person_id:"a", text:"서하 경종", anchor_x:12, anchor_y:80, min_left:24, max_right:100 },
    { person_id:"b", text:"금 태조", anchor_x:12, anchor_y:120, min_left:24, max_right:100 }
  ];
  const result = labels.packLabels(input, { width:120, height:200 });
  assert.equal(result.deferred.length, 0);
  for (const placement of result.placed) {
    assert.ok(placement.rect.left >= 24 - 1e-9);
    assert.ok(placement.rect.right <= 100 + 1e-9);
  }
});

test("a label wider than its own allowed zone defers instead of spilling across a region boundary", () => {
  const result = labels.packLabels([
    { person_id:"a", text:"긴 이름", anchor_x:20, anchor_y:60, width:70, min_left:30, max_right:80 }
  ], { width:140, height:120 });
  assert.equal(result.placed.length, 0);
  assert.equal(result.deferred.length, 1);
  assert.equal(result.deferred[0].reason, "viewport_capacity");
});
