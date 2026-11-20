import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const polity = read("atlas-polity-review-workbench.js");
const style = read("atlas-polity-review-workbench.css");
const nav = read("atlas-main-authority-nav.js");

test("VIS-03 Polity discovery places actual search before secondary operational metrics in DOM order", () => {
  const header = polity.indexOf('<header class="polity-browser-summary card">');
  const controls = polity.indexOf('<section class="polity-browser-controls card">');
  const dataset = polity.indexOf('<section class="polity-browser-dataset card"');
  const list = polity.indexOf('data-current-polity-list');
  assert.ok(header > 0 && header < controls && controls < dataset && dataset < list);
  assert.match(polity, /data-polity-search placeholder="정치체명·별칭·인물·역할 검색"/);
  assert.match(polity, /data-polity-collection aria-label="역사권 탐색"/);
  assert.match(polity, /현재 등록된 정치체를 이름·별칭·연결 인물로 검색/);
  assert.doesNotMatch(polity, /이 목록은 기준 정치체 조회를 직접 사용합니다/);
});

test("VIS-03 retains six real Polity metrics, original evidence and native disclosure", () => {
  for (const name of ["total_polities", "linked_polities", "orphan_polities", "activity_count", "unique_linked_persons", "ongoing_polities"]) {
    assert.ok(polity.includes(`value("${name}")`), `Missing metric ${name}`);
  }
  assert.match(polity, /<details class="polity-browser-card card"/);
  assert.match(polity, /data-polity-id/);
  assert.match(polity, /dossierRenderer\.dossierHtml\(polity\)/);
  assert.match(polity, /<div class="polity-browser-detail">/);
});

test("VIS-03 mobile makes search/filter actions usable without concealing metrics", () => {
  const mobileStart = style.indexOf("/* VIS-03 — Mobile Polity information-first experience.");
  assert.ok(mobileStart >= 0);
  const mobile = style.slice(mobileStart);
  assert.match(mobile, /@media \(max-width: 700px\)/);
  assert.match(mobile, /\.polity-browser-controls input\[type="search"\][\s\S]*?min-height: 44px;/);
  assert.match(mobile, /\.polity-browser-filters button,[\s\S]*?min-height: 44px;/);
  assert.match(mobile, /\.polity-browser-kpis\s*\{\s*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(mobile, /@media \(max-width: 360px\)[\s\S]*?repeat\(2, minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(mobile, /display:\s*none|visibility:\s*hidden/);
  assert.match(nav, /atlas-polity-review-workbench\.css\?[^"]*vis03=polity-search-first-v1/);
  assert.match(nav, /atlas-polity-review-workbench\.js\?[^"]*vis03=polity-search-first-v1/);
});
