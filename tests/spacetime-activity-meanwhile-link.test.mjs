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

test("Meanwhile runtime is excluded from core bootstrap and loaded only when a moment is requested",()=>{
  const independentStart=view.indexOf("const RUNTIME_INDEPENDENT_ASSETS");
  const dependentStart=view.indexOf("const RUNTIME_SPACE_AXIS_DEPENDENT_ASSETS");
  const independentBlock=view.slice(independentStart,dependentStart);
  assert.doesNotMatch(independentBlock,/atlas-person-spacetime-meanwhile\.js/);
  assert.match(view,/const RUNTIME_MEANWHILE_ASSET = Object\.freeze\(/);
  assert.match(view,/function ensureMeanwhileModule\(\)/);
  assert.match(view,/if \(meanwhileRuntimePromise\) return meanwhileRuntimePromise/);
  assert.match(view,/meanwhileRuntimePromise = null/);
  assert.match(view,/function meanwhileRuntime\(\)/);
  assert.match(view,/ATLAS_SPACETIME_MEANWHILE_RUNTIME_MISSING/);

  const selectStart=view.indexOf("async function selectActivity(");
  const selectEnd=view.indexOf("\n  function",selectStart+10);
  const selectBody=view.slice(selectStart,selectEnd);
  assert.match(selectBody,/await ensureMeanwhileModule\(\)/);

  const yearStart=view.indexOf("async function setMeanwhileYear(");
  const yearEnd=view.indexOf("\n  function",yearStart+10);
  const yearBody=view.slice(yearStart,yearEnd);
  assert.match(yearBody,/await ensureMeanwhileModule\(\)/);
});

test("lazy Meanwhile interactions are race-safe and stale loads cannot restore superseded selection",()=>{
  assert.match(view,/let meanwhileInteractionSerial = 0/);
  assert.match(view,/const interactionSerial = \+\+meanwhileInteractionSerial/);
  assert.match(view,/interactionSerial !== meanwhileInteractionSerial/);

  const personStart=view.indexOf("function selectPerson(");
  const personEnd=view.indexOf("\n  async function selectActivity",personStart);
  const personBody=view.slice(personStart,personEnd);
  assert.match(personBody,/meanwhileInteractionSerial \+= 1/);

  const clearStart=view.indexOf("function clearSelection(");
  const clearEnd=view.indexOf("\n  async function setMeanwhileYear",clearStart);
  const clearBody=view.slice(clearStart,clearEnd);
  assert.match(clearBody,/meanwhileInteractionSerial \+= 1/);

  const manualClearStart=view.indexOf("function clearMeanwhile(");
  const manualClearEnd=view.indexOf("\n  function meanwhileRegionLabel",manualClearStart);
  const manualClearBody=view.slice(manualClearStart,manualClearEnd);
  assert.match(manualClearBody,/meanwhileInteractionSerial \+= 1/);
});

test("active Meanwhile state remains fail-closed even though its module is optional at startup",()=>{
  assert.match(view,/const meanwhile = meanwhileOrdinal == null \? null : meanwhileRuntime\(\)/);
  assert.match(view,/meanwhile\.summarize\(\s*compiled\.partitioned\.tracks,\s*meanwhileOrdinal/s);
  const runtimeStart=view.indexOf("function runtime()");
  const runtimeEnd=view.indexOf("\n  function viewportFitMinimumZoom",runtimeStart);
  const runtimeBody=view.slice(runtimeStart,runtimeEnd);
  assert.doesNotMatch(runtimeBody,/meanwhile:\s*window\.ATLAS_PERSON_SPACETIME_MEANWHILE/);
  assert.match(runtimeBody,/ATLAS_SPACETIME_RUNTIME_INCOMPLETE/);
});
