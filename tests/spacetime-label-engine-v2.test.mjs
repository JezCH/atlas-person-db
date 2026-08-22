import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const labels = require("../atlas-person-spacetime-label-engine-v2.js");

const VIEWPORT = Object.freeze({ width: 900, height: 500 });

function candidate(id, x, y, width = 90, forced = false) {
  return Object.freeze({
    person_id: id,
    track_id: id,
    text: id,
    anchor_x: x,
    anchor_y: y,
    width,
    height: 22,
    opacity: 1,
    forced
  });
}

function assertNoOverlap(items, gap = 6) {
  for (let left = 0; left < items.length; left += 1) {
    for (let right = left + 1; right < items.length; right += 1) {
      assert.equal(labels.rectanglesOverlap(items[left].rect, items[right].rect, gap), false, `${items[left].person_id} overlaps ${items[right].person_id}`);
    }
  }
}

test("dense same-time labels move only horizontally and remain collision-free", () => {
  const source = Array.from({ length: 6 }, (_, index) => candidate(`p${index}`, 450, 250));
  const result = labels.packLabels(source, VIEWPORT, { maxHorizontalShift: 430, searchStep: 3, gap: 6 });

  assert.equal(result.placed.length, 6);
  assert.equal(result.deferred.length, 0);
  assertNoOverlap(result.placed, 6);
  for (const item of result.placed) {
    assert.equal(item.label_y, 250);
    assert.equal(item.anchor_y, 250);
    assert.equal(item.rect.top, 239);
    assert.equal(item.rect.bottom, 261);
  }
});

test("labels at non-overlapping historical Y positions may reuse horizontal space", () => {
  const result = labels.packLabels([
    candidate("a", 400, 100),
    candidate("b", 400, 180)
  ], VIEWPORT);

  assert.equal(result.placed.length, 2);
  assert.equal(result.placed[0].label_x, result.placed[1].label_x);
  assert.equal(result.placed[0].label_y, 100);
  assert.equal(result.placed[1].label_y, 180);
});

test("insufficient horizontal capacity defers labels instead of overlapping or changing time", () => {
  const narrow = { width: 240, height: 300 };
  const source = Array.from({ length: 6 }, (_, index) => candidate(`p${index}`, 120, 150, 100));
  const result = labels.packLabels(source, narrow, { maxHorizontalShift: 240, searchStep: 2, gap: 8 });

  assert.ok(result.placed.length < source.length);
  assert.ok(result.deferred.length > 0);
  assertNoOverlap(result.placed, 8);
  assert.ok(result.placed.every((item) => item.label_y === 150));
  assert.ok(result.deferred.every((item) => item.anchor_y === 150));
});

test("forced user-intent label is packed before ordinary labels without any notability score", () => {
  const narrow = { width: 210, height: 300 };
  const result = labels.packLabels([
    candidate("ordinary-a", 105, 150, 100, false),
    candidate("ordinary-b", 105, 150, 100, false),
    candidate("searched", 105, 150, 100, true)
  ], narrow, { maxHorizontalShift: 210, searchStep: 2, gap: 8 });

  assert.ok(result.placed.some((item) => item.person_id === "searched"));
  const searched = result.placed.find((item) => item.person_id === "searched");
  assert.equal(searched.forced, true);
  assertNoOverlap(result.placed, 8);
  assert.ok(result.deferred.every((item) => !Object.prototype.hasOwnProperty.call(item, "importance")));
});

test("packing is deterministic for identical input", () => {
  const source = [
    candidate("c", 440, 250),
    candidate("a", 440, 250),
    candidate("b", 440, 250),
    candidate("d", 440, 250)
  ];
  const first = labels.packLabels(source, VIEWPORT, { searchStep: 3, gap: 6, maxHorizontalShift: 400 });
  const second = labels.packLabels(source, VIEWPORT, { searchStep: 3, gap: 6, maxHorizontalShift: 400 });

  assert.deepEqual(
    first.placed.map((item) => [item.person_id, item.label_x, item.label_y]),
    second.placed.map((item) => [item.person_id, item.label_x, item.label_y])
  );
  assert.deepEqual(first.deferred.map((item) => item.person_id), second.deferred.map((item) => item.person_id));
});

test("shifted labels receive horizontal connectors while near-anchor labels do not", () => {
  const result = labels.packLabels([
    candidate("first", 400, 200, 100),
    candidate("second", 400, 200, 100)
  ], VIEWPORT, { searchStep: 2, maxHorizontalShift: 400, connectorThreshold: 10 });

  assert.equal(result.placed.length, 2);
  assert.ok(result.placed.some((item) => item.connector));
  for (const item of result.placed.filter((entry) => entry.connector)) {
    assert.equal(item.connector.y1, item.anchor_y);
    assert.equal(item.connector.y2, item.anchor_y);
    assert.ok(item.connector.length > 10);
  }
});

test("every placed label remains fully inside the viewport", () => {
  const source = [
    candidate("left", 2, 100, 120),
    candidate("right", 898, 160, 120),
    candidate("middle", 450, 220, 120)
  ];
  const result = labels.packLabels(source, VIEWPORT, { maxHorizontalShift: 900, searchStep: 3 });
  assert.equal(result.placed.length, 3);
  for (const item of result.placed) {
    assert.ok(item.rect.left >= 0);
    assert.ok(item.rect.right <= VIEWPORT.width);
    assert.ok(item.rect.top >= 0);
    assert.ok(item.rect.bottom <= VIEWPORT.height);
  }
});

test("label whose historical anchor is too close to a vertical edge is deferred rather than shifted in Y", () => {
  const result = labels.packLabels([candidate("edge", 450, 5, 90)], VIEWPORT);
  assert.equal(result.placed.length, 0);
  assert.equal(result.deferred.length, 1);
  assert.equal(result.deferred[0].reason, "viewport_capacity");
  assert.equal(result.deferred[0].anchor_y, 5);
});

test("estimated width is bounded and deterministic when renderer measurement is not supplied", () => {
  const short = labels.estimateWidth({ text: "A" });
  const long = labels.estimateWidth({ text: "A very very very very very long historical person name" });
  assert.equal(short, labels.DEFAULT_MIN_LABEL_WIDTH);
  assert.equal(long, labels.DEFAULT_MAX_LABEL_WIDTH);
});