import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const guard = require("../atlas-person-spacetime-label-overlap-guard.js");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

test("live guard keeps every shifted label inside its declared spatial band", () => {
  const rows = [
    { id:"a", left:40, top:50, width:60, height:18, band_code:"band" },
    { id:"b", left:50, top:51, width:60, height:18, band_code:"band" }
  ];
  const band = { left:40, width:180 };
  const result = guard.resolvePositions(rows, { band }, { gap:2, step:4, maxShift:160, canvasWidth:260 });
  for (const id of ["a", "b"]) {
    const left = result.positions[id].left;
    assert.ok(left >= band.left - 1e-6);
    assert.ok(left + 60 <= band.left + band.width + 1e-6);
  }
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
});

test("surface owner loads the guard without modifying the core spacetime renderer", () => {
  const owner = fs.readFileSync(path.join(root, "atlas-domain-surface-owner.js"), "utf8");
  const view = fs.readFileSync(path.join(root, "atlas-person-spacetime-view.js"), "utf8");
  assert.match(owner, /atlas-person-spacetime-label-overlap-guard\.js/);
  assert.match(view, /const CAMERA_MIN_ZOOM = 5;/);
  assert.match(view, /const CAMERA_MAX_ZOOM = 8;/);
  assert.match(view, /const GLOBAL_EXTENT_COMPRESSION = 0\.748;/);
  assert.doesNotMatch(view, /LABEL_OVERLAP_GUARD/);
});
