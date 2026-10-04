import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=(path)=>fs.readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
const register=read("atlas-person-monumental-register.css");
const verifier=read("scripts/verify-ui-v10-production-visual.mjs");
const html=read("index.html");

test("P10 puts Person identity, Activity facts, and chronology on the same mobile scan row",()=>{
  const mobileStart=register.indexOf("@media (max-width: 760px)");
  const narrowStart=register.indexOf("@media (max-width: 340px)");
  const mobile=register.slice(mobileStart,narrowStart);
  assert.match(mobile,/grid-template-columns: minmax\(82px, \.92fr\) minmax\(0, 1\.35fr\) auto/);
  assert.match(mobile,/grid-template-areas: "identity activities range"/);
  assert.match(mobile,/align-items: start/);
  assert.match(mobile,/column-gap: 7px/);
});

test("P10 gives the Activity facts the flexible center column instead of a detached second line",()=>{
  const mobileStart=register.indexOf("@media (max-width: 760px)");
  const narrowStart=register.indexOf("@media (max-width: 340px)");
  const mobile=register.slice(mobileStart,narrowStart);
  assert.match(mobile,/\.person-register-activities \{[\s\S]*?grid-area: activities;[\s\S]*?min-width: 0;[\s\S]*?padding: 0;/s);
  assert.match(mobile,/\.person-table-activities \.person-card-activity \{[\s\S]*?display: flex;[\s\S]*?min-width: 0;/s);
  assert.doesNotMatch(mobile,/grid-template-areas:\s*"identity range"\s*"activities activities"/s);
});

test("P10 preserves a safe stacked fallback only below 340px",()=>{
  const narrow=register.slice(register.indexOf("@media (max-width: 340px)"));
  assert.match(narrow,/grid-template-areas:\s*"identity range"\s*"activities activities"/s);
  assert.match(narrow,/has-multiple-activities[\s\S]*?grid-template-areas:\s*"identity range count"\s*"activities activities activities"/s);
});

test("P10 Production acceptance measures whether Activity facts actually cover the visual center",()=>{
  assert.match(verifier,/const centerSamples=ordinaryRows\.slice\(0,30\)/);
  assert.match(verifier,/coversCenter:activityRect\.left<=centerX&&activityRect\.right>=centerX/);
  assert.match(verifier,/centerCoverageRate>=0\.8/);
  assert.match(verifier,/medianActivityWidthRatio>=0\.24/);
});

test("P10 publishes the center-column Register asset",()=>{
  assert.match(html,/atlas-person-monumental-register\.css\?v=20261004-ui-p10-center-column-v1/);
});
