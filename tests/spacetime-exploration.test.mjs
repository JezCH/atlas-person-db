import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const exploration = require("../atlas-person-spacetime-exploration.js");

const projection = Object.freeze({ yForOrdinal: (ordinal) => Number(ordinal) * 2 });

function segment(id, start, end, x, region = "europe") {
  return Object.freeze({ stable_id: id, activity_id: id, start_ordinal: start, end_ordinal: end, x_anchor: x, macroregion_code: region });
}

function track(id, name, segments) {
  return Object.freeze({ person_id: id, track_id: id, display_name: name, primary_segments: Object.freeze(segments) });
}

test("representative Person navigation anchor is deterministic and uses the longest primary segment", () => {
  const value = track("p1", "Alpha", [segment("short", 20, 30, 0.2), segment("long", 40, 90, 0.7)]);
  const projected = exploration.projectTrack(value, projection, 1000);

  assert.equal(projected.person_id, "p1");
  assert.equal(projected.representative.stable_id, "long");
  assert.equal(projected.x, 700);
  assert.equal(projected.y, 130);
  assert.equal(projected.macroregion_code, "europe");
});

test("navigation ordering follows stable projected time then space and wraps previous/next", () => {
  const items = [
    exploration.projectTrack(track("c", "Charlie", [segment("c", 80, 90, 0.2)]), projection, 1000),
    exploration.projectTrack(track("a", "Alpha", [segment("a", 10, 20, 0.8)]), projection, 1000),
    exploration.projectTrack(track("b", "Beta", [segment("b", 10, 20, 0.2)]), projection, 1000)
  ];
  const ordered = exploration.orderItems(items);
  assert.deepEqual(ordered.map((item) => item.person_id), ["b", "a", "c"]);
  assert.equal(exploration.adjacentPersonId(ordered, "a", 1), "c");
  assert.equal(exploration.adjacentPersonId(ordered, "a", -1), "b");
  assert.equal(exploration.adjacentPersonId(ordered, "c", 1), "b");
  assert.equal(exploration.adjacentPersonId(ordered, null, 1), "b");
});

test("search ranking prefers exact and prefix Person names without changing projected coordinates", () => {
  const items = [
    { person_id: "1", display_name: "Alexander Hamilton", x: 10, y: 30 },
    { person_id: "2", display_name: "Alexander", x: 20, y: 20 },
    { person_id: "3", display_name: "The Alexander Chronicle", x: 30, y: 10 }
  ];
  const ranked = exploration.rankSearchItems(items, "Alexander");
  assert.deepEqual(ranked.map((item) => item.person_id), ["2", "1", "3"]);
  assert.equal(ranked[0].x, 20);
  assert.equal(ranked[0].y, 20);
});

test("focus centers a Person inside the usable map viewport and clamps at world edges", () => {
  const center = exploration.focusScrollTarget(
    { x: 1200, y: 1800 },
    { width: 1000, height: 700 },
    { scrollWidth: 3168, scrollHeight: 4244 },
    { leftInset: 168, topInset: 44 }
  );
  assert.equal(center.left, 784);
  assert.equal(center.top, 1472);

  const edge = exploration.focusScrollTarget(
    { x: 3000, y: 4200 },
    { width: 1000, height: 700 },
    { scrollWidth: 3168, scrollHeight: 4244 },
    { leftInset: 168, topInset: 44 }
  );
  assert.equal(edge.left, 2168);
  assert.equal(edge.top, 3544);
});

test("keyboard pan remains bounded and keyboard commands distinguish pan from Person navigation", () => {
  const right = exploration.panTarget(
    { left: 1900, top: 100 },
    { width: 1000, height: 600 },
    { scrollWidth: 2200, scrollHeight: 2000 },
    "right",
    0.22
  );
  assert.equal(right.left, 1200);
  assert.equal(right.top, 100);

  assert.equal(exploration.keyboardCommand({ key: "ArrowLeft" }), "pan-left");
  assert.equal(exploration.keyboardCommand({ key: "ArrowDown", shiftKey: true }), "next-person");
  assert.equal(exploration.keyboardCommand({ key: "ArrowUp", shiftKey: true }), "previous-person");
  assert.equal(exploration.keyboardCommand({ key: "f" }), "focus-selected");
  assert.equal(exploration.keyboardCommand({ key: "+" }), "zoom-in");
  assert.equal(exploration.keyboardCommand({ key: "Escape" }), "clear-selection");
  assert.equal(exploration.keyboardCommand({ key: "ArrowLeft", ctrlKey: true }), null);
});
