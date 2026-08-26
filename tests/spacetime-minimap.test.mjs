import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const minimap = require("../atlas-person-spacetime-minimap.js");

test("minimap projects stable world coordinates without inventing new placement", () => {
  const world = { width: 1200, height: 2400 };
  const mini = { width: 240, height: 120 };
  const items = [
    { person_id: "a", x: 300, y: 600 },
    { person_id: "b", x: 900, y: 1800 }
  ];
  const projected = minimap.projectItems(items, world, mini);
  assert.deepEqual(projected.map((item) => [item.person_id, item.minimap_x, item.minimap_y]), [
    ["a", 60, 30],
    ["b", 180, 90]
  ]);
});

test("minimap viewport rectangle mirrors the map camera after sticky axis insets", () => {
  const rect = minimap.viewportRect(
    { left: 300, top: 700 },
    { width: 500, height: 600 },
    { width: 1000, height: 2000 },
    { width: 200, height: 100 },
    { left: 100, top: 50 }
  );
  assert.equal(rect.world_left, 300);
  assert.equal(rect.world_top, 700);
  assert.equal(rect.world_width, 400);
  assert.equal(rect.world_height, 550);
  assert.equal(rect.left, 60);
  assert.equal(rect.top, 35);
  assert.equal(rect.width, 80);
  assert.equal(rect.height, 27.500000000000004);
});

test("minimap click target centers the main camera and clamps to world edges", () => {
  const center = minimap.scrollTargetForMinimapPoint(
    { x: 100, y: 50 },
    { width: 500, height: 600 },
    { width: 1000, height: 2000 },
    { width: 200, height: 100 },
    { left: 100, top: 50 }
  );
  assert.deepEqual(center, { left: 300, top: 725 });

  const edge = minimap.scrollTargetForMinimapPoint(
    { x: 200, y: 100 },
    { width: 500, height: 600 },
    { width: 1000, height: 2000 },
    { width: 200, height: 100 },
    { left: 100, top: 50 }
  );
  assert.deepEqual(edge, { left: 600, top: 1450 });
});

test("minimap pointer conversion remains correct when CSS scales the surface", () => {
  const point = minimap.localPoint(
    { x: 160, y: 95 },
    { left: 10, top: 20, width: 300, height: 150 },
    { width: 200, height: 100 }
  );
  assert.deepEqual(point, { x: 100, y: 50 });
});

test("minimap line projection uses the same world geometry as Person points", () => {
  assert.equal(minimap.projectVerticalLine(450, { width: 900, height: 4200 }, { width: 180, height: 120 }), 90);
  assert.equal(minimap.projectHorizontalLine(2100, { width: 900, height: 4200 }, { width: 180, height: 120 }), 60);
});
