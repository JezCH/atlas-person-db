import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const view=readFileSync(new URL("../atlas-person-spacetime-view.js",import.meta.url),"utf8");
const contract=JSON.parse(readFileSync(new URL("./fixtures/spacetime-completion-contract.json",import.meta.url),"utf8"));

test("Activity selection drives the shared Meanwhile ordinal from its midpoint",()=>{
  const start=view.indexOf("function selectActivity(");
  const end=view.indexOf("\n  function",start+10);
  const body=view.slice(start,end);
  assert.match(body,/selectedTimeOrdinal = activity\.midpoint_ordinal/);
  assert.match(body,/meanwhileSelectedOrdinal = selectedTimeOrdinal/);
  assert.match(body,/meanwhileSelectionSource = "activity"/);
});

test("manual and Activity-selected moments share one ordinal-based Meanwhile path",()=>{
  assert.match(view,/let meanwhileSelectedOrdinal = null/);
  assert.match(view,/let meanwhileSelectionSource = null/);
  assert.match(view,/function setMeanwhileYear\(/);
  assert.match(view,/meanwhileSelectedOrdinal = ordinal/);
  assert.match(view,/meanwhileSelectionSource = "manual"/);
  assert.match(view,/meanwhile\.summarize\(\s*compiled\.partitioned\.tracks,\s*meanwhileOrdinal/s);
  assert.match(view,/projection\.yForOrdinal\(meanwhileOrdinal\)/);
  assert.doesNotMatch(view,/let meanwhileYear = null/);
});

test("Activity-derived Meanwhile moment clears with Activity identity but manual moment survives",()=>{
  assert.match(view,/function clearActivityLinkedMeanwhile\(/);
  const start=view.indexOf("function clearActivityLinkedMeanwhile(");
  const end=view.indexOf("\n  function",start+10);
  const body=view.slice(start,end);
  assert.match(body,/meanwhileSelectionSource === "activity"/);
  assert.match(body,/meanwhileSelectedOrdinal = null/);
  assert.match(body,/meanwhileSelectionSource = null/);
});

test("Meanwhile remains active-Activity based and search-independent",()=>{
  assert.match(view,/compiled\.partitioned\.tracks,\s*meanwhileOrdinal/s);
  assert.doesNotMatch(view,/visibleTracks,\s*meanwhileOrdinal/s);
  assert.equal(contract.meanwhile_verification.active_activity_source,"primary_spatial_activity_segments");
  assert.equal(contract.meanwhile_verification.search_independent_global_summary,true);
});
