import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import meanwhile from "../atlas-person-spacetime-meanwhile.js";

const read=(file)=>fs.readFileSync(new URL("../"+file,import.meta.url),"utf8");
const view=read("atlas-person-spacetime-view.js");
const nav=read("atlas-main-authority-nav.js");
const html=read("index.html");
const css=read("atlas-person-spacetime-instrument-tools.css");

// Exercise the actual rendering function with source-backed fixture entries,
// rather than checking only a screenshot of the first 24 rows.
const start=view.indexOf("  function renderMeanwhile(summary) {");
const stop=view.indexOf("\n  async function fetchSpatialIndex",start);
assert.ok(start>=0 && stop>start,"Current Meanwhile renderer must remain available");
const rendererBody=view.slice(start,stop);
function render(summary,selectedRegion=null) {
  const makeRender=new Function(
    "meanwhileSelectedOrdinal","meanwhileSelectionSource","meanwhileRegionFilter",
    "meanwhileMomentLabel","meanwhileRegionLabel","escapeHtml","polityLabel","periodLabel",
    rendererBody+"\nreturn renderMeanwhile;"
  );
  const escape=(value)=>String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
  return makeRender(0,"manual",selectedRegion,()=> "기원전 1년",(code)=>({east_asia:"동아시아",europe:"유럽"}[code]||code),escape,()=> "정치체",()=> "활동 기간")(summary);
}
const tracks=Array.from({length:30},(_,i)=>({
  person_id:"p"+i,
  display_name:"인물 "+i,
  primary_segments:[{activity_id:"a"+i,macroregion_code:i<27?"east_asia":"europe",start_ordinal:-50,end_ordinal:50,activity:{}}]
}));
const summary=meanwhile.summarize(tracks,0,["east_asia","europe"]);

test("UI-06A region drill-down retains all 30 real-activity fixtures and 24+6 disclosure",()=>{
  assert.equal(summary.unique_person_count,30);
  assert.equal(summary.activity_count,30);
  assert.deepEqual(summary.region_counts.map((x)=>x.unique_person_count),[27,3]);
  const all=render(summary);
  assert.equal((all.match(/data-spacetime-meanwhile-person=/g)||[]).length,30);
  assert.match(all,/활동 기록 6건 더 보기/);
  assert.match(all,/활동 중인 인물 30명 · 활동 기록 30건/);
  assert.match(all,/data-spacetime-meanwhile-region="" aria-pressed="true"/);
  assert.match(all,/동아시아<\/b> 27명/);
  assert.match(all,/유럽<\/b> 3명/);
});

test("UI-06A region selection filters the displayed entries without changing global denominators",()=>{
  const asia=render(summary,"east_asia");
  const europe=render(summary,"europe");
  assert.equal((asia.match(/data-spacetime-meanwhile-person=/g)||[]).length,27);
  assert.equal((europe.match(/data-spacetime-meanwhile-person=/g)||[]).length,3);
  assert.match(asia,/활동 기록 3건 더 보기/);
  assert.doesNotMatch(europe,/활동 기록 \d+건 더 보기/);
  assert.match(asia,/동아시아 · 인물 27명 · 활동 27건 \/ 전체 30건/);
  assert.match(europe,/유럽 · 인물 3명 · 활동 3건 \/ 전체 30건/);
  assert.match(asia,/data-spacetime-meanwhile-region="east_asia" aria-pressed="true"/);
  assert.match(europe,/data-spacetime-meanwhile-region="europe" aria-pressed="true"/);
  assert.match(europe,/활동 중인 인물 30명 · 활동 기록 30건/);
});

test("UI-06A keeps region-unknown historical activity discoverable through All",()=>{
  const withUnknown=meanwhile.summarize([...tracks,{
    person_id:"unknown",
    display_name:"권역 미확정 인물",
    primary_segments:[{activity_id:"unknown-activity",macroregion_code:null,start_ordinal:-3,end_ordinal:3,activity:{}}]
  }],0,["east_asia","europe"]);
  assert.equal(withUnknown.activity_count,31);
  assert.equal(withUnknown.unique_person_count,31);
  assert.equal(withUnknown.region_counts.reduce((sum,region)=>sum+region.unique_person_count,0),30);
  assert.equal((render(withUnknown).match(/data-spacetime-meanwhile-person=/g)||[]).length,31);
  assert.equal((render(withUnknown,"east_asia").match(/data-spacetime-meanwhile-person=/g)||[]).length,27);
  assert.match(render(withUnknown),/권역 미확정 인물/);
});

test("UI-06A keeps coordinate/LOD code intact and supports keyboard-accessible region filter",()=>{
  assert.match(view,/const regionEntries = meanwhileRegionFilter == null/);
  assert.match(view,/entry\.macroregion_code === meanwhileRegionFilter/);
  assert.match(view,/mount\.querySelectorAll\("\[data-spacetime-meanwhile-region\]"\)\.forEach/);
  assert.match(view,/meanwhileRegionFilter = null;\s*renderInto\(mount\);/);
  assert.match(view,/nextButton\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(css,/\.spacetime-meanwhile-regions button:focus-visible/);
  assert.match(css,/\.spacetime-meanwhile-regions button\[aria-pressed="true"\]/);
  assert.match(nav,/atlas-person-spacetime-view\.js\?v=20261119-meanwhile-all-activities-v1&ui06=region-drilldown-v1/);
  assert.match(nav,/atlas-person-spacetime-instrument-tools\.css\?v=20261008-spacetime-l2-instrument-finish-v1&ui=20261119-ui03a-readability-v1&ui06=region-drilldown-v1/);
  assert.match(html,/atlas-main-authority-nav\.js\?v=[^"]+&ui06=region-drilldown-v1/);
});
