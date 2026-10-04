import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const register = read("atlas-person-monumental-register.css");
const html = read("index.html");

test("P8 removes fixed mobile Activity columns that created a hollow center", () => {
  const mobile = register.slice(register.indexOf("@media (max-width: 760px)"));
  assert.match(mobile, /\.person-table-activities \.person-card-activity \{[\s\S]*?display: flex;[\s\S]*?flex-wrap: wrap;/s);
  assert.doesNotMatch(mobile, /grid-template-columns: minmax\(0, 1\.08fr\) minmax\(0, \.82fr\) auto/);
  assert.doesNotMatch(mobile, /"activity-head activity-role activity-period"/);
});

test("P8 lets polity relation and role basis read as one left-to-right factual phrase", () => {
  const mobile = register.slice(register.indexOf("@media (max-width: 760px)"));
  assert.match(mobile, /\.person-card-activity-head \{[\s\S]*?flex: 0 1 auto;/s);
  assert.match(mobile, /\.person-card-activity-role \{[\s\S]*?flex: 0 1 auto;[\s\S]*?text-align: left;/s);
  assert.match(mobile, /\.person-card-activity-role::before \{[\s\S]*?content: "· ";/s);
  assert.match(mobile, /column-gap: 4px/);
});

test("P8 keeps genuinely different Activity periods at the right edge without reserving an empty column", () => {
  const mobile = register.slice(register.indexOf("@media (max-width: 760px)"));
  assert.match(mobile, /\.person-card-activity-period \{[\s\S]*?flex: 0 0 auto;[\s\S]*?margin-left: auto;/s);
  assert.match(mobile, /@media \(max-width: 340px\)[\s\S]*?flex-basis: 100%;[\s\S]*?margin-left: 0;/s);
});

test("P8 publishes the horizontal-flow Register asset", () => {
  assert.match(html, /atlas-person-monumental-register\.css\?v=20261004-ui-p11-breathing-wash-v2/);
});
