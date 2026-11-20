import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=(p)=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const css=read("atlas-person-monumental-register.css");
const script=read("scripts/verify-ui-v10-production-visual.mjs");
const html=read("index.html");
const start=css.indexOf("/* UI-01 P0 — factual two-line mobile register");
assert.ok(start>css.indexOf("@media (max-width: 340px)"),"latest P0 contract overrides the earlier compressed presentation");
const latest=css.slice(start);

test("UI-01 P0 preserves a flat register with stable first-line name/date and full-width factual Activity",()=>{
  assert.match(latest,/grid-template-columns: minmax\(0, 1fr\) minmax\(0, 34%\)/);
  assert.match(latest,/grid-template-areas:\s*"identity range"\s*"activities activities"/);
  assert.match(latest,/\.person-register-activities,\s*\.person-monumental-register \.person-register-entry\.has-multiple-activities \.person-register-activities/);
  assert.match(latest,/grid-column: 1 \/ -1;\s*grid-row: 2;/);
  assert.match(latest,/has-multiple-activities \{\s*grid-template-areas:\s*"identity identity"\s*"activities activities"/);
  assert.match(latest,/\.person-register-range \{[\s\S]*?white-space: normal;[\s\S]*?overflow-wrap: anywhere;/);
  assert.doesNotMatch(latest,/\.person-card-activity:nth-child|text-overflow:\s*ellipsis|overflow-x:\s*hidden/);
});

test("UI-01 P0 makes Person identity and registered polity/role/chronology readable on 390px",()=>{
  assert.match(latest,/\.person-table-identity > strong \{\s*font-size: 16\.5px;/);
  assert.match(latest,/\.person-register-range \{[\s\S]*?font-size: 12px/);
  assert.match(latest,/\.person-card-activity-head b \{\s*font-size: 12\.5px/);
  assert.match(latest,/\.person-card-activity-role \{[\s\S]*?font-size: 12px/);
  assert.match(latest,/\.person-card-activity-period \{[\s\S]*?font-size: 12px/);
  assert.match(latest,/\.person-relation-badge \{[\s\S]*?font-size: 11px/);
  assert.match(latest,/min-height: 44px/);
  assert.match(latest,/overflow-wrap: anywhere/);
});

test("UI-01 P0 Production browser verifier measures actual font sizes, alignment and content not just a stylesheet",()=>{
  assert.match(script,/mobileTypographySamples=ordinaryRows\.slice\(0,15\)/);
  assert.match(script,/item\.namePx>=16/);
  assert.match(script,/item\.polityPx>=12/);
  assert.match(script,/item\.rolePx>=11\.5/);
  assert.match(script,/item\.rangePx>=11\.5/);
  assert.match(script,/item\.periodPx>=11\.5/);
  assert.match(script,/item\.stacked&&item\.activityRightDelta<=1\.5/);
  assert.match(script,/medianActivityWidthRatio>=0\.88/);
  assert.match(script,/activityHeights\.every\(\(height\)=>height>=44\)/);
  assert.match(script,/bodyScrollWidth<=391/);
  assert.match(script,/activityDomIntegrity/);
  assert.match(html,/atlas-person-monumental-register\.css\?v=[^"]+&mobile=20261120-ui01-readable-two-line-v1/);
});
