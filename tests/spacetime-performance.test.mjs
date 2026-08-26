import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const perf = require("../atlas-person-spacetime-performance.js");

const projection = Object.freeze({
  yForOrdinal(value) {
    return Number(value);
  }
});

test("viewport culling expands the visible map area with bounded overscan", () => {
  const rect = perf.viewportWorldRect(
    { left: 400, top: 1200 },
    { width: 1000, height: 700 },
    { width: 3000, height: 5000 },
    { left: 168, top: 44 },
    { x: 0.5, y: 1 }
  );

  assert.equal(rect.visible_left, 400);
  assert.equal(rect.visible_top, 1200);
  assert.equal(rect.visible_width, 832);
  assert.equal(rect.visible_height, 656);
  assert.equal(rect.left, 0);
  assert.equal(rect.top, 544);
  assert.equal(rect.right, 1648);
  assert.equal(rect.bottom, 2512);
});

test("viewport culling clips overscan at world edges", () => {
  const rect = perf.viewportWorldRect(
    { left: 9999, top: 9999 },
    { width: 900, height: 600 },
    { width: 1200, height: 1600 },
    { left: 168, top: 44 }
  );

  assert.equal(rect.right, 1200);
  assert.equal(rect.bottom, 1600);
  assert.ok(rect.left >= 0);
  assert.ok(rect.top >= 0);
  assert.ok(rect.visible_left <= 1200 - rect.visible_width);
  assert.ok(rect.visible_top <= 1600 - rect.visible_height);
});

test("projected Person candidates are culled by viewport while selected Person can be forced", () => {
  const items = [
    { person_id: "inside", x: 120, y: 160 },
    { person_id: "near", x: 324, y: 160 },
    { person_id: "outside", x: 900, y: 900 }
  ];
  const rect = { left: 100, top: 100, width: 200, height: 200 };
  const normal = perf.cullProjectedItems(items, rect);
  assert.deepEqual(normal.map((item) => item.person_id), ["inside", "near"]);

  const forced = perf.cullProjectedItems(items, rect, new Set(["outside"]));
  assert.deepEqual(forced.map((item) => item.person_id), ["inside", "near", "outside"]);
});

test("long Person rails remain renderable when their duration intersects the viewport", () => {
  const tracks = [
    {
      person_id: "long",
      primary_segments: [
        { stable_id: "long:1", x_anchor: 0.5, start_ordinal: 100, end_ordinal: 900 }
      ]
    },
    {
      person_id: "offscreen",
      primary_segments: [
        { stable_id: "off:1", x_anchor: 0.95, start_ordinal: 1400, end_ordinal: 1500 }
      ]
    }
  ];

  const culled = perf.cullTrackSegments(
    tracks,
    projection,
    1000,
    { left: 300, top: 400, width: 500, height: 200 }
  );

  assert.equal(culled.length, 1);
  assert.equal(culled[0].person_id, "long");
  assert.equal(culled[0].primary_segments[0].stable_id, "long:1");
});

test("forced Person keeps its segments even when outside the overscan rectangle", () => {
  const tracks = [
    {
      person_id: "selected",
      primary_segments: [
        { stable_id: "selected:1", x_anchor: 0.95, start_ordinal: 1400, end_ordinal: 1500 }
      ]
    }
  ];
  const culled = perf.cullTrackSegments(
    tracks,
    projection,
    1000,
    { left: 0, top: 0, width: 200, height: 200 },
    new Set(["selected"])
  );
  assert.equal(culled.length, 1);
  assert.equal(culled[0].primary_segments.length, 1);
});

test("density cells are reduced to cells intersecting the current overscan canvas", () => {
  const cells = [
    { left: 0, top: 0, width: 100, height: 100, count: 1 },
    { left: 100, top: 0, width: 100, height: 100, count: 2 },
    { left: 400, top: 400, width: 100, height: 100, count: 3 }
  ];
  const visible = perf.cullDensityCells(cells, { left: 80, top: 10, width: 180, height: 150 });
  assert.deepEqual(visible.map((cell) => cell.count), [1, 2]);
});

test("render budget reports only virtualized DOM layers", () => {
  assert.deepEqual(perf.renderBudget(15, 8, 12), {
    person_dom: 15,
    segment_dom: 8,
    label_dom: 12,
    total_dom: 35
  });
});
