import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=(p)=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const css=read("atlas-person-monumental-register.css");
const mobile=read("atlas-ui-mobile-v8.css");
const html=read("index.html");
const verifier=read("scripts/verify-ui-v10-production-visual.mjs");

function cssFont(selector) {
  const i=css.indexOf(selector+" {");
  assert.ok(i>=0,"Missing register CSS selector: "+selector);
  const block=css.slice(css.indexOf("{",i)+1,css.indexOf("}",i));
  const font=block.match(/font-size:\s*([0-9.]+)px/);
  assert.ok(font,"Missing font-size: "+selector);
  return Number(font[1]);
}

test("VIS-01 protects shipped desktop Person factual hierarchy without another CSS override",()=>{
  assert.ok(cssFont(".person-monumental-register .person-table-identity > strong")>=17);
  assert.ok(cssFont(".person-monumental-register .person-table-activities .person-card-activity-head b")>=12.5);
  assert.ok(cssFont(".person-monumental-register .person-table-activities .person-card-activity-role")>=12);
  assert.ok(cssFont(".person-monumental-register .person-table-activities .person-card-activity-period")>=12);
  assert.ok(cssFont(".person-monumental-register .person-relation-badge")>=11);
  assert.ok(cssFont(".person-monumental-register > .person-table-head .person-table-head-cell")>=11);
  assert.match(css,/\.person-monumental-register \.person-table-range,\s*\.person-monumental-register \.person-register-range \{[\s\S]*?font-size: 12\.5px/);
  assert.match(css,/\.person-monumental-register \.person-register-entry:not\(\.has-multiple-activities\) \{\s*padding-block: 2px/);
});

test("VIS-01 remains factual two-line on mobile and retains enlarged controls",()=>{
  assert.match(css,/\/\* UI-01 P0 — factual two-line mobile register/);
  assert.match(css,/grid-template-areas:\s*"identity range"\s*"activities activities"/);
  assert.match(mobile,/\.person-domain-filter \{\s*min-height: 44px/);
  assert.match(mobile,/\.person-era-nav-step \{\s*width: 44px;\s*height: 44px/);
  assert.match(html,/atlas-person-monumental-register\.css\?v=[^"]+&vis01=desktop-historical-legibility-v1/);
  assert.match(html,/atlas-ui-mobile-v8\.css\?v=[^"]+&vis01=mobile-nav-readable-v1/);
});

test("VIS-01 demands real Production Chrome computed typography, not just static CSS tests",()=>{
  assert.match(verifier,/desktopTypographySamples:mobileTypographySamples/);
  assert.match(verifier,/desktopMain\.desktopTypographySamples\?\.length>=5/);
  assert.match(verifier,/item\.namePx>=17/);
  assert.match(verifier,/item\.polityPx>=12\.5/);
  assert.match(verifier,/item\.rolePx>=12/);
  assert.match(verifier,/item\.rangePx>=12/);
  assert.match(verifier,/item\.periodPx>=12/);
  assert.match(verifier,/desktopMain\.ordinaryMedianHeight<=56/);
  assert.match(verifier,/desktopNameContrast>=4\.5/);
  assert.match(verifier,/mobileMain\.mobileTypographySamples/);
  assert.match(verifier,/ATLAS_UI_V10_PRODUCTION_VISUAL_ACCEPTANCE_PASS/);
});
