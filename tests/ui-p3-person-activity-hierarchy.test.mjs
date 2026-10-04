import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const table = read("atlas-person-table-view.js");
const register = read("atlas-person-monumental-register.css");
const mobile = read("atlas-ui-mobile-v8.css");
const main = read("atlas-person-main.js");
const html = read("index.html");

test("P12 keeps ordinary 0/1-Activity counts quiet and multi-Activity count static", () => {
  assert.match(table, /const activityCount = activityRows\.length/);
  assert.match(table, /row\.classList\.toggle\("has-multiple-activities", activityCount > 1\)/);
  assert.match(table, /count\.classList\.toggle\("is-activity-count-quiet", activityCount <= 1\)/);
  assert.match(table, /count\.textContent = `\$\{activityCount\}건`/);
  assert.doesNotMatch(table, /person-activity-toggle|aria-expanded|setActivityExpansion|onActivityToggle/);
  assert.match(register, /person-register-count\.is-activity-count-quiet/);
});

test("P12 keeps every Activity visible instead of collapsing secondary rows", () => {
  assert.match(main, /activities\.map\(compactActivityHtml\)\.join\("")/);
  assert.doesNotMatch(register, /person-card-activity:nth-child\(n \+ 2\)[\s\S]*?display: none/s);
  assert.doesNotMatch(register, /is-activities-expanded/);
  assert.doesNotMatch(mobile, /person-card-activity:nth-child\(n \+ 2\)[\s\S]*?display: none/s);
  assert.match(register, /P12 Multi-Activity visibility: every Activity remains visible/);
});

test("P12 removes disclosure interaction from the Person row", () => {
  assert.doesNotMatch(table, /data-person-activity-toggle/);
  assert.doesNotMatch(table, /document\.addEventListener\("click", onActivityToggle, true\)/);
  assert.doesNotMatch(register, /\.person-activity-toggle/);
});

test("P12 keeps single-Activity duplicate periods suppressed while multi-Activity periods stay factual", () => {
  assert.match(table, /const singleActivity = activityRows\.length === 1/);
  assert.match(table, /normalizeRangeWithoutApproximation/);
  assert.match(table, /approximationOnlyDifference/);
  assert.match(table, /promoteApproximationToPersonRange\(personRangeElement, periodText\)/);
  assert.match(register, /person-card-activity-period\.is-redundant \{\s*display: none;/s);
});

test("P12 publishes always-visible Register assets", () => {
  assert.match(html, /atlas-person-monumental-register\.css\?v=20261004-ui-p12-multi-activity-visible-v1/);
  assert.match(html, /atlas-ui-mobile-v8\.css\?v=20261004-ui-p4-mobile-compact-v1/);
  assert.match(html, /atlas-person-table-view\.js\?v=20261004-ui-p12-multi-activity-visible-v1/);
});
