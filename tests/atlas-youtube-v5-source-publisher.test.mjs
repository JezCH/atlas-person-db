import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const {assertPriorRawSignalCoverage}=require("../server/atlas-youtube-person-signal-publish-service.js");

test("new v5 publication preserves every old raw name, not just filtered public candidates",()=>{
  const completeRaw=[
    {raw_name:"Princess Diana",distinct_channel_count:55,video_count:87},
    {raw_name:"Malcolm X",distinct_channel_count:52,video_count:63},
    {raw_name:"Already Registered Person",distinct_channel_count:20,video_count:25}
  ];
  assert.doesNotThrow(()=>assertPriorRawSignalCoverage(completeRaw,[
    {raw_name:"Princess Diana",distinct_channel_count:70,video_count:102},
    {raw_name:"Malcolm X",distinct_channel_count:60,video_count:80},
    {raw_name:"Already Registered Person",distinct_channel_count:20,video_count:25},
    {raw_name:"Anne Boleyn",distinct_channel_count:15,video_count:17}
  ]));
  assert.throws(()=>assertPriorRawSignalCoverage(completeRaw,
    completeRaw.filter(x=>x.raw_name!=="Already Registered Person")),
    /PREVIOUS_RAW_LABEL_LOST/);
  assert.throws(()=>assertPriorRawSignalCoverage(completeRaw,
    completeRaw.map(x=>x.raw_name==="Malcolm X" ? {...x,video_count:62}:x)),
    /PREVIOUS_RAW_EVIDENCE_REGRESSION/);
});

test("empty prior raw baseline or duplicate new names cannot silently pass",()=>{
  assert.throws(()=>assertPriorRawSignalCoverage([],[]),/PRIOR_RAW_SIGNAL_ROWS_REQUIRED/);
  assert.throws(()=>assertPriorRawSignalCoverage(
    [{raw_name:"René Descartes",distinct_channel_count:3,video_count:4}],
    [{raw_name:"René Descartes",distinct_channel_count:5,video_count:6},
     {raw_name:"Rene\u0301 Descartes",distinct_channel_count:4,video_count:5}]
  ),/DUPLICATE_RAW_NORMALIZED_NAME/);
});

test("v5 workflow never uses the registry-filtered public discovery as the old raw baseline",()=>{
  const workflow=fs.readFileSync(new URL("../.github/workflows/youtube-person-signal-publish.yml",import.meta.url),"utf8");
  const script=fs.readFileSync(new URL("../scripts/youtube-fetch-previous-signals.py",import.meta.url),"utf8");
  const builder=fs.readFileSync(new URL("../scripts/youtube-build-person-signal-snapshot.py",import.meta.url),"utf8");
  assert.ok(workflow.includes("yt-title-person-reviewed-v5"));
  assert.ok(!workflow.includes("--previous-snapshot /tmp/atlas-youtube-publication/previous.json"));
  assert.ok(script.includes('registration_filtered_discovery'));
  assert.ok(builder.includes('source_context_name_candidates'));
  assert.ok(builder.includes('source_name_generation_independent_of_registered_persons'));
});

test("incremental QA does not invent new raw Person names from filtered old view",async()=>{
  const {computeIncrementalAudit}=await import("../scripts/youtube-incremental-review.mjs");
  const row=(raw_name,rank)=>({raw_name,rank,distinct_channel_count:3,video_count:3});
  const previous={projection:"registration_filtered_discovery",
    is_complete_raw_baseline:false,stored_count:2,
    snapshot:{snapshot_id:"old",threshold_counts:{"3":3}},
    rows:[row("Existing Person",1),row("Another Person",2)]};
  const current={snapshot:{snapshot_id:"new",threshold_counts:{"3":3}},
    signals:[row("Existing Person",1),row("Another Person",2),row("Registered Person",3)]};
  const result=computeIncrementalAudit(current,previous);
  assert.equal(result.summary.comparison_scope,"FILTERED_PREVIOUS_DISCOVERY_NOT_FULL_RAW");
  assert.equal(result.summary.new_raw_names,null);
  assert.equal(result.summary.names_absent_from_filtered_previous,1);
});

test("UI reveals stale parser and counts candidate names rather than certified Persons",()=>{
  const ui=fs.readFileSync(new URL("../atlas-registration-review.js",import.meta.url),"utf8");
  assert.ok(ui.includes("구형 제목 앞부분 추출 통계"));
  assert.ok(ui.includes("최신 제목 문맥 감사 미반영"));
  assert.ok(ui.includes("개 이름 후보"));
});