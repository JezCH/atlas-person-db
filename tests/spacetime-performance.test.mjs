import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const perf = require("../atlas-person-spacetime-performance.js");

const projection = Object.freeze({ yForOrdinal(value) { return Number(value); } });

test("viewport culling expands the visible map area with bounded overscan", () => {
  const rect = perf.viewportWorldRect(
    { left: 400, top: 1200 },
    { width: 1000, height: 700 },
    { width: 3000, height: 5000 },
    { left: 152, top: 40 },
    { x: 0.5, y: 1 }
  );
  assert.equal(rect.visible_left, 400);
  assert.equal(rect.visible_top, 1200);
  assert.equal(rect.visible_width, 848);
  assert.equal(rect.visible_height, 660);
  assert.equal(rect.left, 0);
  assert.equal(rect.top, 540);
  assert.equal(rect.right, 1672);
  assert.equal(rect.bottom, 2520);
});

test("viewport culling clips overscan at world edges", () => {
  const rect = perf.viewportWorldRect(
    { left: 9999, top: 9999 },
    { width: 900, height: 600 },
    { width: 1200, height: 1600 },
    { left: 152, top: 40 }
  );
  assert.equal(rect.right, 1200);
  assert.equal(rect.bottom, 1600);
  assert.ok(rect.left >= 0);
  assert.ok(rect.top >= 0);
});

test("projected Person candidates are culled while selected Person can be forced", () => {
  const items = [
    { person_id: "inside", x: 120, y: 160 },
    { person_id: "near", x: 324, y: 160 },
    { person_id: "outside", x: 900, y: 900 }
  ];
  const rect = { left: 100, top: 100, width: 200, height: 200 };
  assert.deepEqual(perf.cullProjectedItems(items, rect).map((item) => item.person_id), ["inside", "near"]);
  assert.deepEqual(perf.cullProjectedItems(items, rect, new Set(["outside"])).map((item) => item.person_id), ["inside", "near", "outside"]);
});

test("long Person rails remain renderable when their duration intersects the viewport", () => {
  const tracks = [
    { person_id: "long", primary_segments: [{ stable_id: "long:1", x_anchor: 0.5, start_ordinal: 100, end_ordinal: 900 }] },
    { person_id: "offscreen", primary_segments: [{ stable_id: "off:1", x_anchor: 0.95, start_ordinal: 1400, end_ordinal: 1500 }] }
  ];
  const culled = perf.cullTrackSegments(tracks, projection, 1000, { left: 300, top: 400, width: 500, height: 200 });
  assert.equal(culled.length, 1);
  assert.equal(culled[0].person_id, "long");
});

test("forced Person keeps its segments outside overscan", () => {
  const tracks = [{ person_id: "selected", primary_segments: [{ stable_id: "selected:1", x_anchor: 0.95, start_ordinal: 1400, end_ordinal: 1500 }] }];
  const culled = perf.cullTrackSegments(tracks, projection, 1000, { left: 0, top: 0, width: 200, height: 200 }, new Set(["selected"]));
  assert.equal(culled.length, 1);
  assert.equal(culled[0].primary_segments.length, 1);
});

test("retired density culling API cannot return", () => {
  assert.equal(Object.hasOwn(perf, "cullDensityCells"), false);
});

test("coarse placement remains renderable when its uncertainty range intersects the viewport", () => {
  const tracks = [{
    person_id: "coarse",
    primary_segments: [{
      stable_id: "coarse:1",
      x_anchor: 0.5,
      x_min: 0.1,
      x_max: 0.9,
      start_ordinal: 100,
      end_ordinal: 200
    }]
  }];
  const culled = perf.cullTrackSegments(tracks, projection, 1000, { left: 50, top: 120, width: 120, height: 40 });
  assert.equal(culled.length, 1);
  assert.equal(culled[0].person_id, "coarse");
});
