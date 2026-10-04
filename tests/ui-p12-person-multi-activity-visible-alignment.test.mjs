import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=(path)=>fs.readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
const table=read("atlas-person-table-view.js");
const register=read("atlas-person-monumental-register.css");
const verifier=read("scripts/verify-ui-v10-production-visual.mjs");
const html=read("index.html");

test("P12 removes multi-Activity disclosure and keeps every Activity rendered",()=>{
  assert.match(table,/row\.classList\.toggle\("has-multiple-activities", activityCount > 1\)/);
  assert.match(table,/count\.textContent = `\$\{activityCount\}건`/);
  assert.doesNotMatch(table,/person-activity-toggle|data-person-activity-toggle|aria-expanded|setActivityExpansion|onActivityToggle/);
  assert.doesNotMatch(register,/person-card-activity:nth-child\(n \+ 2\)[\s\S]*?display:\s*none/s);
  assert.doesNotMatch(register,/is-activities-expanded|\.person-activity-toggle/);
});

test("P12 makes multi-Activity mobile rows use the same Person columns as ordinary rows",()=>{
  const mobileStart=register.indexOf("@media (max-width: 760px)");
  const narrowStart=register.indexOf("@media (max-width: 340px)");
  const mobile=register.slice(mobileStart,narrowStart);
  assert.match(mobile,/grid-template-columns: minmax\(82px, \.92fr\) minmax\(0, 1\.35fr\) auto/);
  assert.match(mobile,/grid-template-areas: "identity activities range"/);
  assert.doesNotMatch(mobile,/identity activities range count|--atlas-person-mobile-count-width/);
  assert.match(mobile,/\.person-register-count \{\s*display: none;/s);
});

test("P12 aligns every multi-Activity period to the ordinary chronology edge",()=>{
  const mobileStart=register.indexOf("@media (max-width: 760px)");
  const narrowStart=register.indexOf("@media (max-width: 340px)");
  const mobile=register.slice(mobileStart,narrowStart);
  assert.match(mobile,/has-multiple-activities \.person-register-range \{\s*display: none;/s);
  assert.match(mobile,/has-multiple-activities \.person-register-activities \{\s*grid-column: 2 \/ 4;\s*grid-row: 1;/s);
  assert.match(mobile,/\.person-card-activity-period \{[\s\S]*?margin-left: auto;[\s\S]*?text-align: right;/s);
  assert.match(verifier,/periodRightDeltas/);
  assert.match(verifier,/activityAreaRightDelta<=1\.5/);
  assert.match(verifier,/periodRightDeltas\.every\(\(delta\)=>delta<=1\.5\)/);
});

test("P12 keeps the below-340px fallback explicit and full-width",()=>{
  const narrow=register.slice(register.indexOf("@media (max-width: 340px)"));
  assert.match(narrow,/has-multiple-activities \.person-register-activities \{\s*grid-column: 1 \/ -1;\s*grid-row: 2;/s);
});

test("P12 publishes fresh browser assets",()=>{
  assert.match(html,/atlas-person-monumental-register\.css\?v=20261004-ui-p12-multi-activity-visible-v1/);
  assert.match(html,/atlas-person-table-view\.js\?v=20261004-ui-p12-multi-activity-visible-v1/);
});
