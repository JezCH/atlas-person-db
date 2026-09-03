import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require=createRequire(import.meta.url);
const uncertainty=require("../atlas-person-spacetime-uncertainty.js");

test("Place precision remains a point, not an uncertainty range",()=>{
  const g=uncertainty.geometry({spatial_precision:"place",x_min:.4,x_anchor:.4,x_max:.4},1000);
  assert.equal(g.kind,"point");
  assert.equal(g.anchor_x,400);
  assert.equal(g.width,0);
});

test("subregion and macroregion compile ranges become horizontal uncertainty geometry",()=>{
  const sub=uncertainty.geometry({spatial_precision:"subregion",x_min:.2,x_anchor:.25,x_max:.3},1000);
  const macro=uncertainty.geometry({spatial_precision:"macroregion",x_min:.1,x_anchor:.25,x_max:.4},1000);
  assert.equal(sub.kind,"range");
  assert.equal(macro.kind,"range");
  assert.equal(sub.left,200);
  assert.equal(sub.right,300);
  assert.ok(macro.width>sub.width);
});

test("multi-place evidence preserves distinct reviewed anchors without implying a route",()=>{
  const g=uncertainty.geometry({
    spatial_precision:"place",x_anchor:.2,x_min:.2,x_max:.2,
    display_place_points:[
      {place_id:"a",place_name:"A",x_anchor:.2},
      {place_id:"b",place_name:"B",x_anchor:.7},
      {place_id:"a",place_name:"A",x_anchor:.2}
    ]
  },1000);
  assert.equal(g.kind,"multi-place");
  assert.deepEqual(g.place_anchors.map(p=>p.x),[200,700]);
  assert.equal(g.left,200);
  assert.equal(g.right,700);
});

test("coarse uncertainty is always visible for selection and otherwise only at detail LOD",()=>{
  const segment={spatial_precision:"macroregion",x_min:.1,x_anchor:.2,x_max:.3};
  assert.equal(uncertainty.visible(segment,0,false),false);
  assert.equal(uncertainty.visible(segment,0,true),true);
  assert.equal(uncertainty.visible(segment,.2,false),true);
});

const view=readFileSync(new URL("../atlas-person-spacetime-view.js",import.meta.url),"utf8");
const css=readFileSync(new URL("../atlas-person-spacetime-view.css",import.meta.url),"utf8");
test("Production renderer exposes uncertainty whiskers as placement precision, not territory",()=>{
  assert.match(view,/atlas-person-spacetime-uncertainty\.js\?v=20260903-c6/);
  assert.match(view,/function renderSpatialUncertainty\(/);
  assert.match(view,/spacetimeUncertaintyLayer/);
  assert.match(view,/ATLAS 시공간 배치 정밀도 범위/);
  assert.match(view,/활동 영역이나 실제 이동 경로가 아닙니다/);
  assert.match(css,/\.spacetime-spatial-uncertainty/);
  assert.match(css,/border-top:1px dashed/);
});
