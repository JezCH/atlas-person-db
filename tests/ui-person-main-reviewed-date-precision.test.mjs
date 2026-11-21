import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../atlas-person-main.js",import.meta.url),"utf8");
function actualFormatters(){
  const start=source.indexOf("  function validHistoricalYear(");
  const end=source.indexOf("  const TIMELINE_DISPOSITION_LABELS",start);
  assert.ok(start>0 && end>start,"Real Person main chronology functions should be found");
  return new Function(source.slice(start,end)+"\nreturn {yearLabel,rangeLabel,boundaryLabel};")();
}

test("Person main and compact register reject invented historical year zero",()=>{
  const f=actualFormatters();
  assert.equal(f.yearLabel(0),"연도 미상");
  assert.equal(f.yearLabel(-1),"BC 1");
  assert.equal(f.yearLabel(1),"AD 1");
  assert.equal(f.boundaryLabel({year:0,month:1,day:2,granularity:"day"}),"연도 미상");
  assert.equal(f.rangeLabel({first_activity_year:0,last_activity_year:1}),"시작 미상 – AD 1");
  assert.equal(f.rangeLabel({first_activity_year:-1,last_activity_year:1}),"BC 1 – AD 1");
  assert.equal(f.rangeLabel({first_activity_year:0,last_activity_year:0}),"주요 활동연도 미상");
  assert.equal(f.rangeLabel({first_activity_year:0,last_activity_year:null,
    activity_summaries:[{end:{status:"ongoing"}}]}),"시작 미상 – 현재");
});

test("Person main shows reviewed year / month / day precision without residual components",()=>{
  const {boundaryLabel}=actualFormatters();
  const date=(granularity)=>({year:1592,month:4,day:13,
    certainty:"exact",granularity,calendar:"julian"});
  assert.equal(boundaryLabel(date("year")),"AD 1592");
  assert.equal(boundaryLabel(date("month")),"AD 1592 4월");
  assert.equal(boundaryLabel(date("day")),"AD 1592 4월 13일");
  assert.equal(boundaryLabel(date(null)),"AD 1592 4월 13일");
  assert.equal(boundaryLabel(date("unknown")),"AD 1592");
  assert.equal(boundaryLabel({year:1592,day:13,granularity:"day"}),"AD 1592");
  assert.equal(boundaryLabel({...date("year"),certainty:"approximate"}),"약 AD 1592");
  assert.equal(boundaryLabel({...date("year"),certainty:"uncertain"}),"AD 1592?");
  assert.equal(boundaryLabel({year:1,granularity:"year"}),"AD 1");
});

test("registered Activity periods and chronicle details use the same corrected formatter",()=>{
  const view=source;
  assert.match(view,/class="person-card-activity-period">\$\{escapeHtml\(boundaryLabel\(activity\?\.start\)\)\}/);
  assert.match(view,/const period = `\$\{boundaryLabel\(activity.start\)\} — \$\{boundaryLabel\(activity.end\)\}`/);
  assert.match(view,/person-activity-dates/);
});
