import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const compare = require("../atlas-person-compare-view.js");
const temporal = require("../atlas-person-spacetime-model.js");
const read = (name) => fs.readFileSync(new URL("../" + name, import.meta.url), "utf8");
const html = read("index.html"), css = read("atlas-person-compare-view.css");
const detail = (id,start,end,options={}) => ({
  id,polity:{display_name:options.polity || "정치체 A"},
  start:{year:start,certainty:options.startCertainty || "exact",
    granularity:options.startGranularity || "year",calendar:options.calendar || "gregorian"},
  end:{year:end,certainty:options.endCertainty || "exact",
    granularity:options.endGranularity || "year",calendar:options.endCalendar || options.calendar || "gregorian"},
  chronology_status:options.chronology || "reviewed"
});
const people=(left,right)=>[
  {id:"p1",display_name:"인물 <A>",activities:left},
  {id:"p2",display_name:"인물 B",activities:right}
];

test("UI-07B BCE/CE ordinal matches the ATLAS temporal model, never creating year zero",()=>{
  for (const year of [-3000,-500,-2,-1,1,2,1592,2026]){
    const ordinal=temporal.historicalYearToOrdinal(year);
    assert.equal(compare.yearOrdinal(year),ordinal);
    assert.notEqual(ordinal,null);
  }
  for(const bad of [0,0.5,null,undefined,NaN,Infinity]) assert.equal(compare.yearOrdinal(bad),null);
  assert.deepEqual(
    compare.compareIntervals(people([detail("a",-2,2)],[detail("b",-1,1)])).confirmed.map(x=>[x.first,x.last]),
    [[-1,0]],"BCE 1 and AD 1 are adjacent with no year zero"
  );
});

test("UI-07B distinguishes genuinely documented overlap from separate finite Activity ranges",()=>{
  const a=detail("a1",1592,1598,{polity:"조선"});
  const b=detail("b1",1595,1601,{polity:"잉글랜드"});
  const result=compare.compareIntervals(people([a],[b]));
  assert.equal(result.total,1);
  assert.equal(result.confirmed.length,1);
  assert.deepEqual([result.confirmed[0].first,result.confirmed[0].last],[1594,1597]);
  assert.equal(result.candidates.length,0);
  const output=compare.render(people([a],[b]));
  assert.match(output,/활동기간 교차 검토/);
  assert.match(output,/등록 Activity 조합 1쌍/);
  assert.match(output,/AD 1595 – AD 1598/);
  assert.match(output,/기록 경계상 교차/);
  assert.match(output,/atlas-compare-interval-bar is-first/);
  assert.match(output,/atlas-compare-interval-bar is-intersection/);
  assert.match(output,/조선/);
  assert.match(output,/잉글랜드/);
  assert.match(output,/인물 &lt;A&gt;/);
  assert.doesNotMatch(output,/인물 <A>/);
  assert.match(output,/접촉·협력·영향을 주었다는 증거는 아닙니다/);
  const separate=compare.compareIntervals(people([detail("a",100,120)],[detail("b",130,150)]));
  assert.deepEqual([separate.confirmed.length,separate.candidates.length,separate.separate,separate.inconclusive],
    [0,0,1,0]);
});

test("UI-07B marks approximate, uncertain, missing precision and cross-calendar overlaps as review candidates",()=>{
  const base=detail("a",100,120);
  for (const suspect of [
    detail("b",110,130,{startCertainty:"approximate"}),
    detail("b",110,130,{endCertainty:"uncertain"}),
    detail("b",110,130,{startGranularity:"month"}),
    detail("b",110,130,{calendar:"julian"}),
    detail("b",110,130,{chronology:"disputed"}),
    { ...detail("b",110,130),start:{year:110} }
  ]){
    const result=compare.compareIntervals(people([base],[suspect]));
    assert.equal(result.confirmed.length,0);
    assert.equal(result.candidates.length,1);
    assert.equal(result.separate,0);
    const output=compare.render(people([base],[suspect]));
    assert.match(output,/교차 가능 구간 · 검토 필요/);
    assert.match(output,/정확한 교집합으로 확정하지 않습니다/);
    assert.match(output,/atlas-compare-overlap--candidate/);
  }
});

test("UI-07B unknown and ongoing periods never acquire fabricated end dates or negative evidence",()=>{
  const base=detail("a",100,120);
  const ongoing={...detail("b",115,9999),end:{status:"ongoing",as_of:"2026-11-20"}};
  const examples=[
    ongoing,detail("b",115,0),{...detail("b",115,120),start:{year:0}},
    {...detail("b",115,120),end:{year:100}},
    {...detail("b",115,120),end:{status:"ongoing"}}
  ];
  for(const activity of examples){
    const result=compare.compareIntervals(people([base],[activity]));
    assert.equal(result.confirmed.length,0);
    assert.equal(result.candidates.length,0);
    assert.equal(result.inconclusive,1);
    assert.match(compare.render(people([base],[activity])),/근거 부족으로 판별할 수 없습니다/);
  }
  const differingCalendarWithNoNumericOverlap=compare.compareIntervals(
    people([detail("a",100,110)],[detail("b",200,220,{calendar:"julian"})])
  );
  assert.equal(differingCalendarWithNoNumericOverlap.separate,0,
    "Do not claim disjoint historical dates when chronology systems conflict");
  assert.equal(differingCalendarWithNoNumericOverlap.inconclusive,1);
});

test("UI-07B compares all registered Activity combinations and keeps hidden overflow accessible",()=>{
  const left=[detail("a1",100,160),detail("a2",200,210)];
  const right=Array.from({length:12},(_,i)=>detail("b"+i,105+i,120+i));
  const result=compare.compareIntervals(people(left,right));
  assert.equal(result.total,24);
  assert.equal(result.confirmed.length,12);
  assert.equal(result.separate,12);
  const output=compare.render(people(left,right));
  assert.match(output,/교차 후보 및 기록 4건 더 보기/);
  assert.equal((output.match(/class="atlas-compare-overlap atlas-compare-overlap--confirmed"/g)||[]).length,12);
  assert.equal((output.match(/class="atlas-compare-activity"/g)||[]).length,14);
  assert.match(output,/atlas-compare-overlap-more/);
});

test("UI-07B is an additive, accessible two-Person visual on the existing compare surface",()=>{
  assert.match(css,/\.atlas-compare-period-analysis/);
  assert.match(css,/\.atlas-compare-interval-rail/);
  assert.match(css,/\.atlas-compare-overlap--candidate/);
  assert.match(css,/@media \(max-width: 760px\)/);
  assert.match(css,/\.atlas-compare-overlap-more > summary:focus-visible/);
  assert.match(compare.render(people([detail("a",120,130)],[detail("b",125,135)])),
    /role="img" aria-label=/);
  assert.match(html,/atlas-person-compare-view\.js\?v=20261120-ui07-comparison-v1/);
  assert.match(html,/atlas-person-compare-view\.css\?v=20261120-ui07-comparison-v1/);
  assert.match(html,/ui07b=20261120-evidence-period-v1/);
});
