import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const require=createRequire(import.meta.url);
const dossier=require("../atlas-polity-dossier-view.js");
const workbench=readFileSync(new URL("../atlas-polity-review-workbench.js",import.meta.url),"utf8");

function workbenchDates() {
  const start=workbench.indexOf("  function validHistoricalYear(");
  const end=workbench.indexOf("  function activityHtml(",start);
  assert.ok(start>0 && end>start,"Use current real Workbench year formatting functions");
  const ctx={};
  vm.runInNewContext(workbench.slice(start,end)+
    "\nglobalThis.dates={formatYear,observedSpan,activitySpan};",ctx);
  return ctx.dates;
}

test("Polity dossier never reports fictitious historical year zero",()=>{
  assert.equal(dossier.activitySpan({activity_start:0,activity_end:0}),"시작 미상–종료 미상");
  assert.equal(dossier.activitySpan({activity_start:-1,activity_end:1}),"기원전 1–1");
  const view=dossier.dossierForPolity({
    id:"00000000-0000-4000-8000-000000000201",
    activities:[{id:"a0",person_id:"00000000-0000-4000-8000-000000000001",
      activity_start:0,activity_end:0,chronology_status:"reviewed"}],
    unresolved_activity_count:0
  });
  assert.equal(view.observed_span.label,"시작 미상–종료 미상");
  assert.equal(view.people[0].observed_span.label,"시작 미상–종료 미상");
});

test("Polity Workbench rejects zero and noninteger chronology but keeps BCE/CE",()=>{
  const f=workbenchDates();
  assert.equal(f.formatYear(0),"미상");
  assert.equal(f.formatYear(1),"1");
  assert.equal(f.formatYear(-44),"기원전 44");
  assert.equal(f.formatYear("1"),"미상");
  assert.equal(f.formatYear(NaN),"미상");
  assert.equal(f.activitySpan({activity_start:0,activity_end:0}),"시작 미상–종료 미상");
  assert.equal(f.activitySpan({activity_start:-1,activity_end:1}),"기원전 1–1");
  assert.equal(f.observedSpan({activity_count:1,first_activity_year:0,last_activity_year:0,has_ongoing_activity:false}),"시작 미상–종료 미상");
});
