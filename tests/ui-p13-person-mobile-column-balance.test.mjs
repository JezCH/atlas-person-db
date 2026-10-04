import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=(path)=>fs.readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
const register=read("atlas-person-monumental-register.css");
const verifier=read("scripts/verify-ui-v10-production-visual.mjs");
const html=read("index.html");

test("P13 widens the mobile Person identity column and balances it against Activity",()=>{
  const mobileStart=register.indexOf("@media (max-width: 760px)");
  const narrowStart=register.indexOf("@media (max-width: 340px)");
  const mobile=register.slice(mobileStart,narrowStart);
  assert.match(mobile,/grid-template-columns: minmax\(118px, 1\.05fr\) minmax\(0, 1fr\) auto/);
  assert.match(verifier,/medianIdentityWidthRatio>=0\.32/);
  assert.match(verifier,/medianActivityToIdentityRatio>=0\.75/);
  assert.match(verifier,/medianActivityToIdentityRatio<=1\.15/);
});

test("P13 gives every visible polity Activity a full mobile vertical slot",()=>{
  const mobileStart=register.indexOf("@media (max-width: 760px)");
  const narrowStart=register.indexOf("@media (max-width: 340px)");
  const mobile=register.slice(mobileStart,narrowStart);
  assert.match(mobile,/has-multiple-activities \{\s*padding-block: 0;/s);
  assert.match(mobile,/has-multiple-activities \.person-register-identity \{[\s\S]*?padding-top: 7px;[\s\S]*?padding-bottom: 7px;/s);
  assert.match(mobile,/has-multiple-activities \.person-card-activity,[\s\S]*?min-height: 36px;[\s\S]*?padding: 7px 0;/s);
  assert.match(verifier,/activityHeights\.every\(\(height\)=>height>=34\)/);
  assert.match(verifier,/rowHeight>=mobileMultiActivity\.total\*34/);
});

test("P13 keeps multi-Activity chronology on the same right edge",()=>{
  const mobileStart=register.indexOf("@media (max-width: 760px)");
  const narrowStart=register.indexOf("@media (max-width: 340px)");
  const mobile=register.slice(mobileStart,narrowStart);
  assert.match(mobile,/has-multiple-activities \.person-register-range \{\s*display: none;/s);
  assert.match(mobile,/has-multiple-activities \.person-register-activities \{\s*grid-column: 2 \/ 4;/s);
  assert.match(verifier,/activityAreaRightDelta<=1\.5/);
  assert.match(verifier,/periodRightDeltas\.every\(\(delta\)=>delta<=1\.5\)/);
});

test("P13 publishes a fresh Register cache key",()=>{
  assert.match(html,/atlas-person-monumental-register\.css\?v=20261004-ui-p13-column-balance-polity-height-v1/);
  assert.match(html,/atlas-person-table-view\.js\?v=20261004-ui-p13-column-balance-polity-height-v1/);
});
