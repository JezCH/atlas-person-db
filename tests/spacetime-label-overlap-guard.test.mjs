import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const guard = require("../atlas-person-spacetime-label-overlap-guard.js");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("browser CSS pixel geometry is parsed as numeric world-space presentation geometry", () => {
  assert.equal(guard.cssNumber("123.5px"), 123.5);
  assert.equal(guard.cssNumber(" 48px "), 48);
  assert.equal(guard.cssNumber("" , 7), 7);
});

test("live guard resolves a real box overlap by horizontal movement only", () => {
  const rows = [
    { id:"a", left:0, top:100, width:70, height:18, band_code:"band" },
    { id:"b", left:10, top:101, width:70, height:18, band_code:"band" }
  ];
  const result = guard.resolvePositions(rows, { band:{ left:0, width:240 } }, { gap:2, step:4, maxShift:160, canvasWidth:240 });
  assert.deepEqual(result.unresolved, []);
  assert.equal(result.positions.a.top, 100);
  assert.equal(result.positions.b.top, 101);
  assert.equal(result.positions.a.left, 0);
  assert.notEqual(result.positions.b.left, 10);
  const a = { ...rows[0], left:result.positions.a.left };
  const b = { ...rows[1], left:result.positions.b.left };
  assert.equal(guard.overlap(a, b, 2), false);
});

test("live guard may borrow the shared world overlay while keeping historical Y unchanged", () => {
  const rows = [
    { id:"a", left:40, top:50, width:70, height:18, band_code:"band" },
    { id:"b", left:44, top:51, width:70, height:18, band_code:"band" }
  ];
  const band = { left:40, width:90 };
  const result = guard.resolvePositions(rows, { band }, {
    gap:2,
    step:4,
    maxShift:260,
    canvasWidth:260,
    borrowWorld:true
  });
  assert.deepEqual(result.unresolved, []);
  assert.equal(result.positions.a.top, 50);
  assert.equal(result.positions.b.top, 51);
  for (const id of ["a", "b"]) {
    const left = result.positions[id].left;
    assert.ok(left >= -1e-6);
    assert.ok(left + 70 <= 260 + 1e-6);
  }
  assert.ok(
    result.positions.a.left < band.left - 1e-6
      || result.positions.a.left + 70 > band.left + band.width + 1e-6
      || result.positions.b.left < band.left - 1e-6
      || result.positions.b.left + 70 > band.left + band.width + 1e-6,
    "at least one conflicting label should borrow presentation space outside its preferred band"
  );
});

test("impossible capacity is reported instead of changing historical Y", () => {
  const rows = [
    { id:"a", left:0, top:10, width:70, height:18, band_code:"band" },
    { id:"b", left:0, top:11, width:70, height:18, band_code:"band" }
  ];
  const result = guard.resolvePositions(rows, { band:{ left:0, width:70 } }, { gap:2, step:4, maxShift:160, canvasWidth:70 });
  assert.deepEqual(result.unresolved, ["b"]);
  assert.equal(result.positions.a.top, 10);
  assert.equal(result.positions.b.top, 11);
});

test("browser integration never writes label top/Y geometry", () => {
  const source = fs.readFileSync(path.join(root, "atlas-person-spacetime-label-overlap-guard.js"), "utf8");
  assert.doesNotMatch(source, /style\.top\s*=/);
  assert.match(source, /element\.style\.left\s*=/);
  assert.match(source, /data-spacetime-band/);
  assert.match(source, /borrowWorld:true/);
});

test("surface owner loads the guard without modifying the core spacetime renderer", () => {
  const owner = fs.readFileSync(path.join(root, "atlas-domain-surface-owner.js"), "utf8");
  const view = fs.readFileSync(path.join(root, "atlas-person-spacetime-view.js"), "utf8");
  assert.match(owner, /atlas-person-spacetime-label-overlap-guard\.js\?v=20260920-world-name-overlay/);
  assert.match(view, /const CAMERA_MIN_ZOOM = 5;/);
  assert.match(view, /const CAMERA_MAX_ZOOM = 8;/);
  assert.match(view, /const GLOBAL_EXTENT_COMPRESSION = 0\.748;/);
  assert.doesNotMatch(view, /LABEL_OVERLAP_GUARD/);
});
