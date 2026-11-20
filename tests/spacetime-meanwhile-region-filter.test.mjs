import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const view = read("atlas-person-spacetime-view.js");
const css = read("atlas-person-spacetime-instrument-tools.css");
const nav = read("atlas-main-authority-nav.js");
const html = read("index.html");

const renderStart = view.indexOf("  function renderMeanwhile(summary");
const renderEnd = view.indexOf("  async function fetchSpatialIndex", renderStart);
assert.ok(renderStart >= 0 && renderEnd > renderStart);
const render = new Function(
  "meanwhileSelectedOrdinal", "meanwhileSelectionSource", "meanwhileMomentLabel",
  "escapeHtml", "polityLabel", "periodLabel", "meanwhileRegionLabel", "selectedPersonId",
  "const text = (value) => value == null ? \"\" : String(value).trim();\n" + view.slice(renderStart, renderEnd) + "\nreturn renderMeanwhile;"
)(1, "manual", () => "1592년", String, () => "정치체", () => "기간", (code) => ({ europe:"유럽", africa:"아프리카" }[code] || code), null);

const entries = [
  { person_id:"p1", display_name:"A", activity_id:"a1", macroregion_code:"europe" },
  { person_id:"p1", display_name:"A", activity_id:"a2", macroregion_code:"europe" },
  { person_id:"p2", display_name:"B", activity_id:"a3", macroregion_code:"africa" }
];
const summary = {
  unique_person_count:2, activity_count:3, entries,
  region_counts:[
    {code:"europe",unique_person_count:1},
    {code:"africa",unique_person_count:1},
    {code:"east-asia",unique_person_count:0}
  ]
};

test("regional controls expose globally deduplicated counts and all Activity rows by default", () => {
  const markup = render(summary);
  assert.equal((markup.match(/data-spacetime-meanwhile-person=/g) || []).length, 3);
  assert.match(markup, /전체 <b>2<\/b>명/);
  assert.match(markup, /data-spacetime-meanwhile-region="europe"/);
  assert.match(markup, /data-spacetime-meanwhile-region="africa"/);
  assert.doesNotMatch(markup, /data-spacetime-meanwhile-region="east-asia"/);
  assert.match(markup, /전체 인물 2명 · 활동 3건/);
});

test("regional filter limits Activity rows while preserving the global denominator and distinct Person count", () => {
  const europe = render(summary, "europe");
  assert.equal((europe.match(/data-spacetime-meanwhile-person=/g) || []).length, 2);
  assert.match(europe, /전체 인물 2명 · 활동 3건 \/ 현재 유럽 1명 · 활동 2건/);
  assert.match(europe, /data-spacetime-meanwhile-region="europe" aria-pressed="true"/);
  assert.doesNotMatch(europe, /data-spacetime-meanwhile-person="p2"/);
  const africa = render(summary, "africa");
  assert.equal((africa.match(/data-spacetime-meanwhile-person=/g) || []).length, 1);
  assert.match(africa, /data-spacetime-meanwhile-person="p2"/);
  assert.doesNotMatch(africa, /data-spacetime-meanwhile-person="p1"/);
});

test("UI regional filtering resets with year/Activity changes and remains keyboard accessible", () => {
  assert.match(view, /let meanwhileRegionCode = ""/);
  assert.match(view, /meanwhileRegionCode = "";\s*meanwhilePolityId = "";\s*renderInto\(mount\)/);
  assert.match(view, /renderMeanwhile\(meanwhileSummary, meanwhileRegionCode, meanwhilePolityId\)/);
  assert.match(view, /querySelectorAll\("\[data-spacetime-meanwhile-region\]"\)/);
  assert.match(view, /button\.dataset\.spacetimeMeanwhileRegion \|\| ""/);
  assert.match(css, /\.spacetime-meanwhile-regions button\[aria-pressed="true"\]/);
  assert.match(css, /\.spacetime-meanwhile-regions button:focus-visible/);
  assert.match(nav, /atlas-person-spacetime-view\.js\?v=20261119-meanwhile-all-activities-v1&region=20261119-ui06a-v1/);
  assert.match(nav, /instrument-finish-v1&ui=20261119-ui03a-readability-v1&region=20261119-ui06a-v1/);
  assert.match(html, /atlas-main-authority-nav\.js\?v=20261118-polity-direct-sources-v1&ui=20261119-ui03a-readability-v1&region=20261119-ui06a-v1/);
});
