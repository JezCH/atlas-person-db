import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read = (file) => readFileSync(new URL("../" + file, import.meta.url), "utf8");
const view = read("atlas-person-spacetime-view.js");
const css = read("atlas-person-spacetime-instrument-tools.css");
const nav = read("atlas-main-authority-nav.js");
const html = read("index.html");
const id1 = "11111111-1111-4111-8111-111111111111";
const id2 = "22222222-2222-4222-8222-222222222222";
const person1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const person2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const person3 = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const person4 = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const text = (value) => value == null ? "" : String(value).trim();
const escape = (value) => String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll('"',"&quot;");
const activity = (id,label) => id ? {polity:{id,display_name:label}} : {polity:null};
const entries = [
  {person_id:person1,display_name:"A",activity_id:"act-1",macroregion_code:"europe",activity:activity(id1,"정치체 가")},
  {person_id:person1,display_name:"A",activity_id:"act-2",macroregion_code:"europe",activity:activity(id1,"정치체 가")},
  {person_id:person2,display_name:"B",activity_id:"act-3",macroregion_code:"europe",activity:activity(id2,"정치체 나")},
  {person_id:person3,display_name:"C",activity_id:"act-4",macroregion_code:"europe",activity:activity(null)},
  {person_id:person4,display_name:"D",activity_id:"act-5",macroregion_code:"east_asia",activity:activity(id1,"정치체 가")}
];
const summary = {entries,unique_person_count:4,activity_count:5,
  region_counts:[{code:"europe",unique_person_count:3},{code:"east_asia",unique_person_count:1}]};
const start = view.indexOf('  function renderMeanwhile(summary, regionCode = "", polityId = "") {');
const end = view.indexOf("  async function fetchSpatialIndex(", start);
assert.ok(start >= 0 && end > start,"Real Meanwhile renderer is required");
const render = new Function(
  "meanwhileSelectedOrdinal","meanwhileSelectionSource","meanwhileMomentLabel",
  "escapeHtml","polityLabel","periodLabel","meanwhileRegionLabel","selectedPersonId","window","text",
  view.slice(start,end) + "\nreturn renderMeanwhile;"
)(1592,"manual",()=>"AD 1592",escape,(act)=>act?.polity?.display_name || "정치체 미상",()=>"AD 1592",(code)=>code==="europe"?"유럽":"동아시아",null,{},text);

test("MEAN-02 offers only actual reviewed primary Activity polity IDs and not guessed names",()=>{
  const output = render(summary);
  assert.match(output,/id="spacetimeMeanwhilePolity"/);
  assert.match(output,/검토된 주 위치 활동만 표시/);
  assert.match(output,new RegExp('value="'+id1+'"'));
  assert.match(output,new RegExp('value="'+id2+'"'));
  assert.match(output,/정치체 가 · 2명/);
  assert.match(output,/정치체 나 · 1명/);
  assert.match(output,/전체 인물 4명 · 활동 5건/);
  assert.equal((output.match(/data-spacetime-meanwhile-person=/g)||[]).length,5);
  assert.doesNotMatch(output,/value="정치체 가"/);
});

test("MEAN-02 region and polity filters keep Person/Activity denominators distinct",()=>{
  const europe = render(summary,"europe",id1);
  assert.match(europe,/전체 인물 4명 · 활동 5건 \/ 현재 유럽 · 정치체 가 1명 · 활동 2건/);
  assert.equal((europe.match(/data-spacetime-meanwhile-person=/g)||[]).length,2);
  assert.match(europe,new RegExp('value="'+id1+'" selected'));
  assert.doesNotMatch(europe,new RegExp('value="'+id2+'" selected'));
  assert.doesNotMatch(europe,new RegExp('data-spacetime-meanwhile-person="'+person2+'"'));
  const allRegions = render(summary,"",id1);
  assert.match(allRegions,/현재 정치체 가 2명 · 활동 3건/);
  assert.equal((allRegions.match(/data-spacetime-meanwhile-person=/g)||[]).length,3);
  const unknown = render(summary,"europe","not-a-registered-polity");
  assert.equal((unknown.match(/data-spacetime-meanwhile-person=/g)||[]).length,4);
  assert.doesNotMatch(unknown,/selected.*not-a-registered-polity/);
  const asia = render(summary,"east_asia",id2);
  assert.equal((asia.match(/data-spacetime-meanwhile-person=/g)||[]).length,1);
});

test("MEAN-02 changes only Meanwhile panel, restores focus and resets polity on region change",()=>{
  const bindStart = view.indexOf("    const bindMeanwhileControls = () => {");
  const bindStop = view.indexOf('    mount.querySelector("#spacetimeCameraZoomOut")',bindStart);
  assert.ok(bindStart>=0 && bindStop>bindStart);
  const source = view.slice(bindStart,bindStop);
  assert.doesNotMatch(source,/renderInto\(mount\)/);
  const renderEvents=[],focusEvents=[];
  let regionButtons=[],politySelect=null;
  const makeButtons=()=>{
    regionButtons=["","europe","east_asia"].map(region=>({
      dataset:{spacetimeMeanwhileRegion:region},
      addEventListener(type,cb){assert.equal(type,"click");this.click=cb;},
      focus(){focusEvents.push("region:"+region);}
    }));
    politySelect={
      addEventListener(type,cb){assert.equal(type,"change");this.change=cb;},
      focus(){focusEvents.push("polity");}
    };
  };
  makeButtons();
  const panel={set outerHTML(value){renderEvents.push(value);makeButtons();}};
  const mount={
    querySelector(q) {
      if(q===".spacetime-meanwhile")return panel;
      if(q==="#spacetimeMeanwhilePolity")return politySelect;
      return null;
    },
    querySelectorAll(q) {
      if(q==="[data-spacetime-meanwhile-region]")return regionButtons;
      if(q==="[data-spacetime-meanwhile-person]")return [];
      if(q==="[data-spacetime-meanwhile-compare]")return [];
      throw Error("unexpected selector " + q);
    }
  };
  const create = new Function("mount","meanwhileSummary","renderMeanwhile","clearMeanwhile","selectPerson",
    "meanwhileRegionCode","scheduleExplorationSnapshot","text",
    'let meanwhilePolityId = ""; let resumeExplorationAfterDetail = false;\n'
    + source + "\nreturn {get:()=>({region:meanwhileRegionCode,polity:meanwhilePolityId})};");
  let snapshots=0;
  const bound = create(mount,summary,(_s,region,polity)=>"region="+region+";polity="+polity,()=>{},()=>{},"",()=>{snapshots++;},text);
  politySelect.change({target:{value:id1}});
  assert.deepEqual(bound.get(),{region:"",polity:id1});
  assert.equal(renderEvents.at(-1),"region=;polity="+id1);
  assert.equal(focusEvents.at(-1),"polity");
  regionButtons[1].click();
  assert.deepEqual(bound.get(),{region:"europe",polity:""});
  assert.equal(renderEvents.at(-1),"region=europe;polity=");
  assert.equal(focusEvents.at(-1),"region:europe");
  politySelect.change({target:{value:"not-reviewed"}});
  assert.deepEqual(bound.get(),{region:"europe",polity:""});
  assert.equal(snapshots,2);
});

test("MEAN-02 saves/restores only evidence-backed polity ID across exploration and protects current comparisons",()=>{
  assert.match(view,/polityId: meanwhilePolityId/);
  assert.match(view,/isReviewedPolityAtMoment\(snapshot\.polityId, meanwhileSelectedOrdinal, meanwhileRegionCode\)/);
  assert.match(view,/polityId: isReviewedPolityAtMoment\(prior\.polityId, prior\.meanwhileOrdinal, prior\.regionCode\)/);
  assert.match(view,/meanwhilePolityId = origin\.polityId \|\| ""/);
  assert.match(view,/!meanwhilePolityId \|\| text\(entry\.activity\?\.polity\?\.id\) === meanwhilePolityId/);
  assert.match(view,/meanwhilePolityId = "";\s*renderInto\(mount\)/);
  assert.match(css,/spacetime-meanwhile-polity-filter select:focus-visible/);
  assert.match(css,/@media \(max-width: 760px\)[\s\S]*spacetime-meanwhile-polity-filter/);
  assert.match(nav,/atlas-person-spacetime-view\.js\?v=[^"]+&polity=20261120-ui06a-id-filter-v1/);
  assert.match(nav,/atlas-person-spacetime-instrument-tools\.css\?v=[^"]+&polity=20261120-ui06a-id-filter-v1/);
  assert.match(html,/atlas-main-authority-nav\.js\?v=[^"]+&polity=20261120-ui06a-id-filter-v1/);
});
