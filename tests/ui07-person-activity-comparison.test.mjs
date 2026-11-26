import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const compare = require("../atlas-person-compare-view.js");
const read = (name) => fs.readFileSync(new URL("../" + name, import.meta.url), "utf8");
const main = read("atlas-person-main.js");
const html = read("index.html");
const css = read("atlas-person-compare-view.css");
const personA = "11111111-1111-4111-8111-111111111111";
const personB = "22222222-2222-4222-8222-222222222222";
const source = (title,url) => ({ title, canonical_url:url, institution:"사료 검증 기관", publication_year: 1951 });
const left = {
  id:personA, display_name:"장군 & 왕", canonical_name_en:"General & King",
  activities:[
    { id:"a1",polity:{display_name:"조선"},relation:{code:"serves"},
      role:{display_name:"지휘관"},period_basis:{display_name:"개별 사료"},
      start:{year:1592,certainty:"exact",granularity:"year",calendar:"gregorian"},
      end:{year:1598,certainty:"approximate",granularity:"year"},
      chronology_status:"reviewed",confidence:"high",
      sources:[source("출처 1","https://example.com/history-a")],
      notes:"승인된 활동 기간" },
    { id:"a2",polity:{display_name:"다른 정치체"},
      start:{year:-10,certainty:"uncertain"},end:{status:"ongoing",as_of:"2020-01-01"},
      sources:[] }
  ],
  sources:[source("인물 1 출처","https://example.com/person-a")]
};
const right = {
  id:personB, display_name:"Scholar <script>alert(1)</script>",
  activities:[
    { id:"b1",polity:{display_name:"국가 B"},role:{display_name:"학자"},
      relation:{code:"active_in"},period_basis:{code:"year_range"},
      start:{year:1595,certainty:"uncertain"},end:{year:1601,certainty:"approximate"},
      sources:[source("안전하지 않은 출처","javascript:alert(1)"),
        source("사료 2","https://example.com/history-b")] }
  ],
  sources:[]
};

test("UI-07 shows two canonical Persons and all Activity records, not inferred lifetime or contact", () => {
  const output = compare.render([left,right]);
  assert.match(output,/두 인물의 활동 기록 비교/);
  assert.match(output,/장군 &amp; 왕/);
  assert.match(output,/Scholar &lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.equal((output.match(/class="atlas-compare-activity"/g)||[]).length,3);
  assert.match(output,/등록된 활동 2건/);
  assert.match(output,/등록된 활동 1건/);
  assert.match(output,/조선/);
  assert.match(output,/다른 정치체/);
  assert.match(output,/국가 B/);
  assert.match(output,/지휘관/);
  assert.match(output,/기간 기준: 개별 사료/);
  assert.match(output,/기간 기준: 표시 확인 필요/);
  assert.match(output,/BC 10\?/);
  assert.match(output,/약 AD 1598/);
  assert.match(output,/현재 \(2020-01-01 확인\)/);
  assert.match(output,/출생·사망 연도가 아니라/);
  assert.match(output,/동시대 활동이 실제 접촉·영향·관계를 뜻하지 않습니다/);
});

test("UI-07 includes Activity-specific evidence and Person sources without unsafe URLs", () => {
  const output = compare.render([left,right]);
  assert.match(output,/https:\/\/example\.com\/history-a/);
  assert.match(output,/https:\/\/example\.com\/history-b/);
  assert.match(output,/https:\/\/example\.com\/person-a/);
  assert.match(output,/사료 검증 기관/);
  assert.match(output,/rel="noopener noreferrer"/);
  assert.doesNotMatch(output,/href="javascript:/i);
  assert.equal(compare.safeSourceUrl("javascript:alert(1)"),null);
  assert.match(output,/이 활동의 출처 \(2\)/);
  assert.match(output,/인물 출처 \(1\)/);
  assert.match(output,/연결된 출처 없음/);
});

test("UI-07 does not invent year zero or silently compare the same Person twice", () => {
  assert.equal(compare.boundaryLabel({year:0}),"연도 미상");
  assert.equal(compare.boundaryLabel({year:-1,certainty:"exact"}),"BC 1");
  assert.equal(compare.boundaryLabel({status:"ongoing"}),"현재 (확인일 미상 확인)");
  assert.throws(()=>compare.render([left,left]),/TWO_DISTINCT_PERSONS/);
  assert.throws(()=>compare.render([left]),/TWO_DISTINCT_PERSONS/);
});

test("UI-07 Person Main selects two validated detail IDs and reads only their bounded Person endpoints", () => {
  assert.doesNotThrow(()=>new Function(main));
  assert.match(main,/const compareView = window\.ATLAS_PERSON_COMPARE_VIEW/);
  assert.match(main,/let comparisonIds = \[\]/);
  assert.match(main,/comparisonIds\.length < 2 \? \[\.\.\.comparisonIds, id\]/);
  assert.match(main,/reader\.UUID_PATTERN\?\.test\?\.\(id\)/);
  assert.match(main,/const records = await Promise\.all\(ids\.map\(async \(id\)/);
  assert.match(main,/const result = await reader\.readPerson\(id\)/);
  assert.match(main,/comparisonCache\.set\(id, result\.person\)/);
  assert.match(main,/serial !== comparisonRequestSerial/);
  assert.match(main,/panel\.innerHTML = compareView\.render\(records,\s*\{/);
  assert.match(main,/returnToExploration: Boolean\(window\.ATLAS_MAIN_AUTHORITY_NAV/);
  assert.match(main,/data-person-compare-add/);
  assert.match(main,/data-compare-remove/);
  assert.match(main,/data-compare-close/);
  assert.match(main,/id="personComparePanel"/);
});

test("UI-07 integrates new assets before Person main, preserving prior versions and mobile layout", () => {
  assert.match(html,/atlas-person-compare-view\.css\?v=20261120-ui07-comparison-v1/);
  assert.match(html,/atlas-person-compare-view\.js\?v=20261120-ui07-comparison-v1/);
  assert.match(html,/atlas-person-main\.js\?v=[^"]+&ui07=20261120-comparison-v1/);
  assert.ok(html.indexOf("atlas-person-compare-view.js") < html.indexOf('atlas-person-main.js?v='));
  assert.match(css,/grid-template-columns: minmax\(0,1fr\) minmax\(0,1fr\)/);
  assert.match(css,/@media \(max-width: 760px\)/);
  assert.match(css,/\.atlas-compare-columns \{ grid-template-columns: minmax\(0,1fr\); \}/);
  assert.match(css,/@media \(max-width: 390px\)/);
  assert.match(css,/\.atlas-person-compare\[hidden\]/);
});
