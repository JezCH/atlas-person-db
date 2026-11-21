import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../atlas-person-main.js", import.meta.url), "utf8");

test("Main folds chronology certainty into date labels instead of extra status rows", () => {
  assert.match(source, /boundary\.certainty === "approximate"/);
  assert.match(source, /return `약 \$\{label\}`/);
  assert.match(source, /boundary\.certainty === "uncertain"/);
  assert.match(source, /return `\$\{label\}\?`/);

  assert.doesNotMatch(source, /`chronology: \$\{activity\.chronology_status\}`/);
  assert.doesNotMatch(source, /`confidence: \$\{activity\.confidence\}`/);
  assert.doesNotMatch(source, /boundary\.granularity, boundary\.certainty, boundary\.calendar/);
  assert.doesNotMatch(source, /AUTHORITATIVE PERSON READ|연대 불확실성은 활동기간 표기에 직접 반영합니다\./);
});

 
test("UI-05 Person Main respects authoritative temporal granularity in actual date helpers",()=>{
  const begin=source.indexOf("  function validHistoricalYear(");
  const end=source.indexOf("  const TIMELINE_DISPOSITION_LABELS",begin);
  assert.ok(begin>0&&end>begin);
  const context=vm.createContext({});
  vm.runInContext(source.slice(begin,end),context);
  const boundary=(year,granularity,certainty="exact")=>({
    year,month:6,day:22,granularity,certainty,calendar:"julian"
  });
  assert.equal(context.boundaryLabel(boundary(-44,"year")),"BC 44");
  assert.equal(context.boundaryLabel(boundary(1592,"month")),"AD 1592 6월");
  assert.equal(context.boundaryLabel(boundary(1592,"day")),"AD 1592 6월 22일");
  assert.equal(context.boundaryLabel(boundary(1592,null)),"AD 1592 6월 22일",
    "null legacy granularity preserves documented legacy components");
  assert.equal(context.boundaryLabel(boundary(-44,"year","approximate")),"약 BC 44");
  assert.equal(context.boundaryLabel(boundary(1592,"month","uncertain")),"AD 1592 6월?");
  assert.equal(context.boundaryLabel({year:1592,granularity:"day",day:22}),"AD 1592",
    "an orphan day without a month must never be projected");
  assert.equal(context.boundaryLabel({year:0,month:1,day:1}),"연도 미상",
    "historic chronology cannot contain year zero");
  assert.equal(context.boundaryLabel({status:"ongoing",as_of:"2026-11-21"}),"현재 (2026-11-21 확인)");
});

test("UI-05 direct Person detail ongoing Activity is not called closed or unknown",()=>{
  const begin=source.indexOf("  function validHistoricalYear(");
  const end=source.indexOf("  const TIMELINE_DISPOSITION_LABELS",begin);
  assert.ok(begin>0&&end>begin);
  const context=vm.createContext({});
  vm.runInContext(source.slice(begin,end),context);
  const ongoing={start:{year:2016},end:{status:"ongoing",as_of:"2026-11-21"}};
  assert.equal(context.rangeLabel({first_activity_year:2016,last_activity_year:null,
    activities:[ongoing]}),"AD 2016 – 현재");
  assert.equal(context.rangeLabel({first_activity_year:2016,last_activity_year:null,
    activity_summaries:[ongoing]}),"AD 2016 – 현재");
  assert.equal(context.rangeLabel({first_activity_year:2016,last_activity_year:null,
    activities:[{start:{year:2016},end:{year:null}}]}),"AD 2016 – 종료 미상");
  assert.equal(context.rangeLabel({first_activity_year:0,last_activity_year:2020}),
    "시작 미상 – AD 2020");
  assert.equal(context.rangeLabel({first_activity_year:null,last_activity_year:null}),
    "주요 활동연도 미상");
  // Guard against future detail payload changes silently reintroducing
  // the false '종료 미상' label for an ongoing Activity.
  const detailService=readFileSync(new URL("../server/atlas-person-read-service.js",import.meta.url),"utf8");
  const readDetail=detailService.slice(detailService.indexOf("async function readPersonDetail("));
  assert.match(readDetail,/\.\.\.summarizeActivities\(activities\)/);
  assert.match(readDetail,/\n    activities\n/);
  const shell=readFileSync(new URL("../index.html",import.meta.url),"utf8");
  assert.match(shell,/atlas-person-main\.js\?v=[^"]*datePrecision=20261121-authoritative-v1/);
});
