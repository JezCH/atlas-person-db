import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const css = read("atlas-person-monumental-register.css");
const table = read("atlas-person-table-view.js");
const sorting = read("atlas-person-header-sorting.js");
const html = read("index.html");

test("P2 dense Register restores comparison columns without changing Person data rendering", () => {
  assert.match(table, /const HEADER_CELLS = \[/);
  assert.match(table, /\["person-table-col-era", "시대"\]/);
  assert.match(table, /\["person-table-col-identity", "인물"\]/);
  assert.match(table, /\["person-table-col-range", "주요 활동기간"\]/);
  assert.match(table, /\["person-table-col-activities", "활동 관계"\]/);
  assert.match(table, /\["person-table-col-count", "활동 수"\]/);
  assert.match(table, /grid\.prepend\(makeHeader\(\)\)/);
  assert.doesNotMatch(table, /fetch\s*\(/);
});

test("P2 removes detached sorting chrome and keeps sorting attached to factual columns", () => {
  assert.doesNotMatch(sorting, /person-register-sortbar/);
  assert.match(sorting, /person-table-col-identity/);
  assert.match(sorting, /person-table-col-range/);
  assert.match(sorting, /person-table-activity-subhead > span:first-child/);
});

test("P2 desktop rows are materially denser than the former card-like Register", () => {
  assert.match(css, /--atlas-register-era-width: 78px/);
  assert.match(css, /padding: 8px 0;/);
  assert.match(css, /font-size: 15px;/);
  assert.match(css, /\.person-table-activities \.person-card-activity-period\.is-redundant \{\s*display: none;/s);
  assert.doesNotMatch(css, /padding: 18px 0 17px/);
  assert.doesNotMatch(css, /font-size: clamp\(18px, 1\.45vw, 22px\)/);
});

test("P2 mobile Register stays compact while P10 fills the factual center column", () => {
  const mobile = css.slice(css.indexOf("@media (max-width: 760px)"));
  assert.match(mobile, /grid-template-columns: minmax\(82px, \.92fr\) minmax\(0, 1\.35fr\) auto/);
  assert.match(mobile, /grid-template-areas: "identity activities range"/);
  assert.match(mobile, /\.person-table-activities \.person-card-activity \{[\s\S]*?display: flex;[\s\S]*?flex-wrap: wrap;/s);
  assert.match(mobile, /\.person-card-activity-role \{[\s\S]*?text-align: left;/s);
  assert.match(mobile, /padding: 7px 0/);
  assert.match(mobile, /> \.person-table-head \{\s*display: none;/s);
});

test("P2 dark Register removes the old wide identity slab while preserving domain semantics", () => {
  assert.match(css, /box-shadow: none !important;/);
  assert.match(css, /background: transparent !important;/);
  assert.match(css, /color: var\(--person-domain-on-dark, #e9e5dd\)/);
  assert.match(css, /data-representative-domain="science"/);
  assert.doesNotMatch(css, /data-representative-domain="knowledge"/);
});

test("P2 dense Register contract remains intact under the P3 Activity hierarchy assets", () => {
  assert.match(html, /atlas-person-monumental-register\.css\?v=20261004-ui-p11-breathing-wash-v2/);
  assert.match(html, /atlas-person-table-view\.js\?v=20261004-ui-p9-promote-approximation-v1/);
  assert.match(html, /atlas-person-header-sorting\.js\?v=20261004-ui-p2-dense-register-v1/);
});
