import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";

const read = (name) => fs.readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
const html = read("index.html");
const css = read("atlas-person-compact-shell.css");
const person = read("atlas-person-main.js");
const authority = read("atlas-main-authority-nav.js");
const summary = read("status-summary.js");
const table = read("atlas-person-table-view.js");
const sorting = read("atlas-person-header-sorting.js");

test("Person uses a single visible heading; other domains retain their global heading", () => {
  assert.match(person, /<div class="person-main-toolbar-heading"><h2>인물<\/h2>/);
  assert.doesNotMatch(person, /AUTHORITATIVE PERSON READ|<h2>인물 목록<\/h2>/);
  assert.match(person, /heading\.append\(connection\)/);
  assert.match(authority, /topbar\.hidden = domain === "persons"/);
  assert.match(css, /\.main-area > \.topbar\[hidden\] \{ display: none !important; \}/);
  assert.match(css, /\.person-group\.person-group-historical > \.person-group-head[\s\S]*?clip-path: inset\(50%\)/);
  assert.match(html, /atlas-person-compact-shell\.css\?v=20261010-person-compact-shell-v1/);
});

test("healthy Person Runtime card no longer consumes a row; errors retain retry", () => {
  assert.match(css, /\.registration-summary\[data-state="loading"\],[\s\S]*?\.registration-summary\[data-state="ok"\]\s*\{[\s\S]*?display: none;/);
  assert.match(css, /\.registration-summary\[data-state="error"\]/);
  assert.match(summary, /id="registrationSummaryRefresh"/);
  assert.match(summary, /verifySummary\(\{ force:true \}\)/);
  assert.match(summary, /setConnectionStatus\("ok", "데이터 정상"/);
  assert.match(summary, /setConnectionStatus\("error", "연결 오류"/);
  assert.match(summary, /activityCount\.toLocaleString\("ko-KR"\)/);
  assert.doesNotMatch(summary, /title\.textContent = "Person Runtime 정상"/);
});

test("compact Person header retains actions, filters, chronology and mobile controls", () => {
  for (const id of ["personMainRefresh","personMainExcelExport","personMainSort","personMainGroups","personMainDetail"]) {
    assert.ok(person.includes(id), `missing ${id}`);
  }
  assert.match(css, /@media \(min-width: 761px\)/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /\.person-main-actions/);
  assert.match(person, /atlas-person-polity-filter-change/);
  assert.match(person, /atlas-person-domain-filter-change/);
  assert.match(person, /atlas-person-search-change/);
});

test("Korean Person-year display keeps numeric raw BC/AD chronology for sorting", () => {
  const start = table.indexOf("function localizedRegisterRange(value)");
  const end = table.indexOf("function configureActivityHierarchy", start);
  assert.ok(start >= 0 && end > start);
  const format = vm.runInNewContext("("+table.slice(start, end).trim()+")");
  assert.equal(format("약 BC 2700 – 약 BC 2700"), "기원전 약 2700년");
  assert.equal(format("약 BC 3150 – 약 BC 3125"), "기원전 약 3150~3125년");
  assert.equal(format("BC 2589 – BC 2566"), "기원전 2589~2566년");
  assert.equal(format("약 BC 3150 – BC 3125"), "기원전 약 3150년~3125년");
  assert.equal(format("BC 100 – AD 100"), "BC 100 – AD 100");
  assert.match(table, /range\.dataset\.chronologyRaw = String\(range\.textContent/);
  assert.match(table, /range\?\.dataset\?\.chronologyRaw \|\| range\?\.textContent/);
  assert.match(sorting, /element\?\.dataset\?\.chronologyRaw \|\| element\?\.textContent/);
});
