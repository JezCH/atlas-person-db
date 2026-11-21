import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DENSE_WINDOWS, interpolateYearTickY, centeredWorldScrollTarget } from "../scripts/spacetime-dense-viewport-plan.mjs";

const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("dense acceptance samples Europe 1800–1950 and East Asia 500–1900 on real historical region axes",()=>{
  assert.deepEqual([...new Set(DENSE_WINDOWS.map(x=>x.area))],["europe-1800-1950","east-asia-500-1900"]);
  assert.deepEqual(DENSE_WINDOWS.filter(x=>x.area==="europe-1800-1950").map(x=>x.subregion),["western-europe","central-europe"]);
  assert.deepEqual(DENSE_WINDOWS.filter(x=>x.area==="east-asia-500-1900").map(x=>x.subregion),["china","korean-peninsula"]);
  assert.ok(DENSE_WINDOWS.flatMap(x=>x.years).some(y=>y===1800));
  assert.ok(DENSE_WINDOWS.flatMap(x=>x.years).some(y=>y===1950));
  assert.ok(DENSE_WINDOWS.flatMap(x=>x.years).some(y=>y<1000));
  assert.ok(DENSE_WINDOWS.flatMap(x=>x.years).some(y=>y>=1700));
});

test("historical axis ticks interpolate the world-space Y without arbitrary time compression",()=>{
  const ticks=[{year:500,y:1000},{year:1000,y:2000},{year:1500,y:3000},{year:2000,y:4000}];
  assert.equal(interpolateYearTickY(ticks,500),1000);
  assert.equal(interpolateYearTickY(ticks,1800),3600);
  assert.equal(interpolateYearTickY(ticks,1950),3900);
  assert.throws(()=>interpolateYearTickY(ticks,0),/non-zero/);
  assert.throws(()=>interpolateYearTickY(ticks,2100),/outside/);
  assert.throws(()=>interpolateYearTickY([{year:500,y:1000},{year:600,y:980}],550),/increase strictly/);
});

test("real-world centered scroll keeps fixed 140px/36px axes without moving any historical coordinate",()=>{
  assert.deepEqual(centeredWorldScrollTarget({worldX:1200,worldY:3000,canvasLeft:140,canvasTop:36,clientWidth:900,clientHeight:600,scrollWidth:6000,scrollHeight:12000}),{left:890,top:2736});
  assert.deepEqual(centeredWorldScrollTarget({worldX:0,worldY:0,canvasLeft:140,canvasTop:36,clientWidth:900,clientHeight:600,scrollWidth:6000,scrollHeight:12000}),{left:0,top:0});
  assert.throws(()=>centeredWorldScrollTarget({worldX:0,worldY:0,canvasLeft:140,canvasTop:36,clientWidth:0,clientHeight:600,scrollWidth:6000,scrollHeight:12000}),/invalid/);
});

test("Production Chrome probes are executable at both default and maximum zoom, not paper acceptance",()=>{
  const script=read("scripts/verify-spacetime-production-visual.mjs");
  const view=read("atlas-person-spacetime-view.js");
  assert.match(script,/import \{ DENSE_WINDOWS, interpolateYearTickY, centeredWorldScrollTarget \}/);
  assert.match(view,/data-spacetime-year="\$\{tick\.year\}"/);
  assert.match(script,/captureDenseWindows\(client, "500"\)/);
  assert.match(script,/captureDenseWindows\(client, "1500"\)/);
  assert.match(script,/dense_window_acceptance/);
  assert.match(script,/labelAssociation\.violation_count/);
  assert.match(script,/missingVisibleLabelPersonIds/);
  assert.match(script,/dense-windows\.json/);
});
