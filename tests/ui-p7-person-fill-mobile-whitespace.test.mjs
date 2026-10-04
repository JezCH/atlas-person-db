import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const register = read("atlas-person-monumental-register.css");
const table = read("atlas-person-table-view.js");
const verifier = read("scripts/verify-ui-v10-production-visual.mjs");
const html = read("index.html");

test("P7 keeps mobile Activity facts on one compact scan line without restoring vertical waste", () => {
  const mobile = register.slice(register.indexOf("@media (max-width: 760px)"));
  assert.match(mobile, /\.person-table-activities \.person-card-activity \{[\s\S]*?display: flex;[\s\S]*?flex-wrap: wrap;/s);
  assert.match(mobile, /align-items: baseline/);
  assert.match(mobile, /padding: 0;/);
});

test("P7 removes blank vertical air from ordinary mobile Person rows", () => {
  const mobile = register.slice(register.indexOf("@media (max-width: 760px)"));
  assert.match(mobile, /row-gap: 1px/);
  assert.match(mobile, /padding: 4px 0/);
  assert.match(mobile, /person-era-band[\s\S]*?padding: 8px 2px 4px/s);
  assert.match(mobile, /person-register-entry::before[\s\S]*?top: 6px/s);
});

test("P7 keeps factual text more visible while preserving compact geometry", () => {
  const mobile = register.slice(register.indexOf("@media (max-width: 760px)"));
  assert.match(mobile, /person-table-identity > strong \{[\s\S]*?color: #ddd9d0;[\s\S]*?font-size: 15px/s);
  assert.match(mobile, /person-register-range \{[\s\S]*?color: #c8c3ba;[\s\S]*?font-size: 9\.2px/s);
  assert.match(mobile, /person-card-activity-role \{[\s\S]*?color: #aaada9;[\s\S]*?font-size: 8\.4px/s);
  assert.match(mobile, /person-card-activity-head b \{[\s\S]*?color: #d4d1ca;[\s\S]*?font-size: 10\.2px/s);
});

test("P7 collapses Activity periods that differ from Person range only by Korean approximation marker", () => {
  assert.match(table, /function normalizeRangeWithoutApproximation/);
  assert.match(table, /replaceAll\("약", ""\)/);
  assert.match(table, /const approximationOnlyDifference/);
  assert.match(table, /function promoteApproximationToPersonRange/);
  assert.match(table, /range\.textContent = periodText/);
  assert.match(table, /range\.dataset\.rangeApproximationFromActivity = "true"/);
  assert.doesNotMatch(table, /appendApproximationNote/);
  assert.doesNotMatch(table, /role\.textContent\s*=\s*[^\n]*연대 근사/);
  assert.match(table, /if \(exactMatch \|\| approximationOnlyDifference\)/);
  assert.match(table, /period\.classList\.add\("is-redundant"\)/);
});

test("P7 keeps genuinely different Activity periods visible and protects very narrow screens", () => {
  const mobile = register.slice(register.indexOf("@media (max-width: 760px)"));
  assert.match(mobile, /person-card-activity-period \{[\s\S]*?white-space: nowrap/s);
  assert.match(mobile, /@media \(max-width: 340px\)[\s\S]*?person-card-activity-period \{[\s\S]*?flex-basis: 100%/s);
});

test("P7 publishes the new assets and tightens Production density acceptance", () => {
  assert.match(html, /atlas-person-monumental-register\.css\?v=20261004-ui-p10-center-column-v1/);
  assert.match(html, /atlas-person-table-view\.js\?v=20261004-ui-p9-promote-approximation-v1/);
  assert.equal((verifier.match(/ordinaryMedianHeight<=56/g) || []).length, 2);
});
