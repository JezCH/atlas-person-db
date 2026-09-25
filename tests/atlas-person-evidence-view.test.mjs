import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require=createRequire(import.meta.url);
const evidenceView=require("../atlas-person-evidence-view.js");

const activity={
  id:"00000000-0000-4000-8000-000000000201",
  period_basis:{code:"reign",display_name:"재위 기간"},
  chronology_status:"resolved",
  confidence:"high",
  start:{year:1603,month:3,day:24,granularity:"day",certainty:"exact",calendar:"gregorian"},
  end:{year:1605,month:null,day:null,granularity:"year",certainty:"exact",calendar:"gregorian"},
  sources:[
    {source_type:"book",title:"Source A",canonical_url:"https://example.com/a",locator:"p. 10"},
    {source_type:"article",citation_text:"Source B citation",canonical_url:"https://example.com/b",locator:"§2"}
  ]
};

test("Evidence Inspector derives only source-backed Activity evidence fields",()=>{
  const evidence=evidenceView.evidenceForActivity(activity);
  assert.equal(evidence.source_count,2);
  assert.equal(evidence.period_basis,"재위 기간");
  assert.equal(evidence.chronology_status,"resolved");
  assert.equal(evidence.confidence,"high");
  assert.deepEqual(evidence.start.meta,[
    {key:"granularity",value:"day"},
    {key:"certainty",value:"exact"},
    {key:"calendar",value:"gregorian"}
  ]);
  assert.deepEqual(evidence.end.meta,[
    {key:"granularity",value:"year"},
    {key:"certainty",value:"exact"},
    {key:"calendar",value:"gregorian"}
  ]);
  assert.equal(evidence.sources[0].locator,"p. 10");
});

test("Evidence Inspector keeps missing canonical evidence visibly missing instead of inventing confidence",()=>{
  const evidence=evidenceView.evidenceForActivity({
    id:"00000000-0000-4000-8000-000000000202",
    period_basis:{code:"active_years"},
    start:null,
    end:null,
    sources:[]
  });
  assert.equal(evidence.source_count,0);
  assert.equal(evidence.period_basis,"active_years");
  assert.equal(evidence.chronology_status,null);
  assert.equal(evidence.confidence,null);
  assert.deepEqual(evidence.start.meta,[]);
  assert.deepEqual(evidence.end.meta,[]);
});

test("Evidence Inspector renderer groups chronology metadata and exact source locators without new reads",()=>{
  const renderer=evidenceView.createRenderer({
    escapeHtml:(value)=>String(value??"")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;"),
    boundaryLabel:(boundary)=>boundary?.year?String(boundary.year):"연도 미상",
    sourceListHtml:(sources)=>`<sources count="${sources.length}">${sources.map((row)=>row.locator).join("|")}</sources>`
  });
  const html=renderer.activityEvidenceHtml(activity);
  assert.match(html,/person-evidence-inspector/);
  assert.match(html,/근거 보기/);
  assert.match(html,/출처 2건/);
  assert.match(html,/기간 기준/);
  assert.match(html,/연대 상태/);
  assert.match(html,/신뢰도/);
  assert.match(html,/정밀도/);
  assert.match(html,/확실성/);
  assert.match(html,/달력/);
  assert.match(html,/p\. 10\|§2/);
  assert.doesNotMatch(html,/fetch\s*\(|XMLHttpRequest|\/api\//);
});
