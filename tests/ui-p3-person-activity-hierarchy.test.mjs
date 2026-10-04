import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const table = read("atlas-person-table-view.js");
const register = read("atlas-person-monumental-register.css");
const mobile = read("atlas-ui-mobile-v8.css");
const main = read("atlas-person-main.js");
const html = read("index.html");

test("P3 silences ordinary 0/1-Activity counts and marks only multi-Activity rows", () => {
  assert.match(table, /const activityCount = activityRows\.length/);
  assert.match(table, /if \(activityCount <= 1\)/);
  assert.match(table, /is-activity-count-quiet/);
  assert.match(table, /row\.classList\.add\("has-multiple-activities"\)/);
  assert.match(table, /person-activity-toggle-value/);
  assert.match(table, /value\.textContent = `\$\{activityCount\}건`/);
  assert.match(register, /person-register-count\.is-activity-count-quiet/);
  assert.match(register, /visibility: hidden/);
});

test("P3 keeps every Activity in the DOM and collapses only secondary rows by presentation", () => {
  assert.match(main, /activities\.map\(compactActivityHtml\)\.join\(""\)/);
  assert.match(register, /has-multiple-activities:not\(\.is-activities-expanded\)[\s\S]*?person-card-activity:nth-child\(n \+ 2\)[\s\S]*?display: none/s);
  assert.match(register, /is-activities-expanded[\s\S]*?person-card-activity \+ \.person-card-activity/s);
  assert.doesNotMatch(mobile, /person-card-activity:nth-child\(n \+ 2\)[\s\S]*?display: none/s);
  assert.match(mobile, /P4 ownership boundary: compact Person Register geometry is defined only in/);
});

test("P3 disclosure is accessible and cannot trigger Person selection", () => {
  assert.match(table, /toggle\.setAttribute\("aria-expanded", "false"\)/);
  assert.match(table, /toggle\.setAttribute\("aria-controls", targetId\)/);
  assert.match(table, /활동 \$\{activityCount\}건 · 모두 펼치기/);
  assert.match(table, /row\.classList\.toggle\("is-activities-expanded", expanded\)/);
  assert.match(table, /event\.stopPropagation\(\)/);
  assert.match(table, /document\.addEventListener\("click", onActivityToggle, true\)/);
  assert.doesNotMatch(table, /onActivityToggle[\s\S]*?event\.preventDefault\(\)/);
});

test("P3 keeps single-Activity duplicate periods suppressed while multi-Activity periods stay factual", () => {
  assert.match(table, /const singleActivity = activityRows\.length === 1/);
  assert.match(table, /normalizeRangeWithoutApproximation/);
  assert.match(table, /approximationOnlyDifference/);
  assert.match(table, /promoteApproximationToPersonRange\(personRangeElement, periodText\)/);
  assert.match(register, /person-card-activity-period\.is-redundant \{\s*display: none;/s);
});

test("P3 uses restrained honor-metal disclosure instead of a new badge grammar", () => {
  assert.match(register, /\.person-activity-toggle \{/);
  assert.match(register, /border-bottom: 1px solid rgba\(192, 174, 136, \.26\)/);
  assert.match(register, /background: transparent/);
  assert.match(register, /\.person-activity-toggle\[aria-expanded="true"\]/);
  assert.match(register, /var\(--atlas-honor-metal-strong\)/);
  assert.doesNotMatch(register, /\.person-activity-toggle \{[\s\S]*?border-radius: 999px/s);
});

test("P3 browser assets use the Activity hierarchy cache key", () => {
  assert.match(html, /atlas-person-monumental-register\.css\?v=20261004-ui-p11-breathing-wash-v2/);
  assert.match(html, /atlas-ui-mobile-v8\.css\?v=20261004-ui-p4-mobile-compact-v1/);
  assert.match(html, /atlas-person-table-view\.js\?v=20261004-ui-p9-promote-approximation-v1/);
});
