import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const route = require("../atlas-entity-route.js");
const compareView = require("../atlas-person-compare-view.js");
const read = (name) => fs.readFileSync(new URL("../" + name, import.meta.url), "utf8");
const view = read("atlas-person-spacetime-view.js");
const main = read("atlas-person-main.js");
const nav = read("atlas-main-authority-nav.js");
const html = read("index.html");
const bridgeCss = read("atlas-person-spacetime-compare-crosslink.css");
const compareCss = read("atlas-person-compare-view.css");
const a = "11111111-1111-4111-8111-111111111111";
const b = "22222222-2222-4222-8222-222222222222";
const c = "33333333-3333-4333-8333-333333333333";

const renderStart = view.indexOf("  function renderMeanwhile(summary, regionCode = \"\", polityId = \"\") {");
const renderEnd = view.indexOf("  async function fetchSpatialIndex(", renderStart);
assert.ok(renderStart > 0 && renderEnd > renderStart, "Missing real Meanwhile renderer");
const renderFunction = new Function(
  "window", "selectedPersonId", "meanwhileSelectedOrdinal", "meanwhileSelectionSource",
  "meanwhileMomentLabel", "meanwhileRegionLabel", "escapeHtml", "polityLabel", "periodLabel",
  "const text = (value) => value == null ? \"\" : String(value).trim();\n" + view.slice(renderStart,renderEnd) + "\nreturn renderMeanwhile;"
);
const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
  .replaceAll('"',"&quot;").replaceAll("'","&#039;");

test("UI-07 Meanwhile compare buttons appear only beside a distinct, canonical counterpart", () => {
  const summary = {
    unique_person_count: 2, activity_count: 2, region_counts: [],
    entries: [
      {person_id:a,display_name:"Person A",macroregion_code:"east_asia",activity:{}},
      {person_id:b,display_name:"Person B",macroregion_code:"europe",activity:{}},
      {person_id:"malformed-id",display_name:"Forged",macroregion_code:"europe",activity:{}}
    ]
  };
  const render = renderFunction(
    { ATLAS_ENTITY_ROUTE: route },a,1592,"manual",
    ()=>"AD 1592",(code)=>code,escapeHtml,()=>"Polity",()=>"AD 1592"
  );
  const output = render(summary);
  assert.equal((output.match(/data-spacetime-meanwhile-person=/g) || []).length,3);
  assert.equal((output.match(/data-spacetime-meanwhile-compare=/g) || []).length,1);
  assert.match(output,new RegExp('data-spacetime-meanwhile-compare="'+b+'"'));
  assert.doesNotMatch(output,new RegExp('data-spacetime-meanwhile-compare="'+a+'"'));
  assert.doesNotMatch(output,/data-spacetime-meanwhile-compare="malformed-id"/);
  assert.match(output,/<\/button><button type="button" class="spacetime-meanwhile-compare"/);
  const noAnchor = renderFunction(
    { ATLAS_ENTITY_ROUTE: route },null,1592,"manual",
    ()=>"AD 1592",(code)=>code,escapeHtml,()=>"Polity",()=>"AD 1592"
  )(summary);
  assert.doesNotMatch(noAnchor,/data-spacetime-meanwhile-compare=/);
  const inactiveAnchor = renderFunction(
    { ATLAS_ENTITY_ROUTE: route },c,1592,"manual",
    ()=>"AD 1592",(code)=>code,escapeHtml,()=>"Polity",()=>"AD 1592"
  )(summary);
  assert.doesNotMatch(inactiveAnchor,/data-spacetime-meanwhile-compare=/);
});

test("UI-07 Meanwhile compare click validates current selection and real filtered evidence without rebuilding canvas", () => {
  const start = view.indexOf("    const bindMeanwhileControls = () => {");
  const end = view.indexOf('    mount.querySelector("#spacetimeCameraZoomOut")',start);
  assert.ok(start >= 0 && end > start);
  const binding = view.slice(start,end);
  assert.doesNotMatch(binding,/renderInto\(mount\)/);
  const events = [];
  class Event {constructor(type,{detail}) {this.type=type;this.detail=detail;}}
  const button = {
    dataset:{spacetimeMeanwhileCompare:b},
    addEventListener(type,handler) {assert.equal(type,"click");this.click=handler;}
  };
  const mount = {
    querySelector() {return null;},
    querySelectorAll(selector) {
      return selector === "[data-spacetime-meanwhile-compare]" ? [button] : [];
    }
  };
  const source = "let meanwhilePolityId = \"\"; const text = (value) => value == null ? \"\" : String(value).trim();\n" + "let resumeExplorationAfterDetail = false;\n" + binding
    + "\nreturn {wasResuming:()=>resumeExplorationAfterDetail};";
  const create = new Function(
    "mount","meanwhileSummary","renderMeanwhile","clearMeanwhile","selectPerson",
    "meanwhileRegionCode","scheduleExplorationSnapshot","selectedPersonId","window","CustomEvent",
    source
  );
  const window = {ATLAS_ENTITY_ROUTE:route,dispatchEvent(event){events.push(event);}};
  const summary = {entries:[{person_id:a,macroregion_code:"east_asia"},{person_id:b,macroregion_code:"europe"}]};
  const bound = create(mount,summary,()=>"",()=>{},()=>{},"",()=>{},a,window,Event);
  button.click();
  assert.equal(events.length,1);
  assert.equal(events[0].type,"atlas-spacetime-compare-persons");
  assert.deepEqual(events[0].detail.personIds,[a,b]);
  assert.equal(bound.wasResuming(),true);
  const forged = create(mount,summary,()=>"",()=>{},()=>{},"east_asia",()=>{},a,window,Event);
  button.click();
  assert.equal(events.length,1,"A hidden region cannot initiate an unrelated compare event");
  assert.equal(forged.wasResuming(),false);
  const unplaced = create(mount,summary,()=>"",()=>{},()=>{},"",()=>{},c,window,Event);
  button.click();
  assert.equal(events.length,1,"The selected Person must itself be active in the chosen year");
  assert.equal(unplaced.wasResuming(),false);
});

test("UI-07 authority router opens verified canonical pair with preserved History and no forged navigation", () => {
  const start=nav.indexOf('  window.addEventListener("atlas-spacetime-compare-persons"');
  const end=nav.indexOf('  window.addEventListener("atlas-person-return-to-exploration"',start);
  assert.ok(start>=0 && end>start);
  const eventListeners=new Map(), calls=[];
  const window={
    location:{hash:route.entityHash("spacetime","person",a),href:"https://atlas-person-db.vercel.app/#atlas-spacetime/person/"+a},
    ATLAS_PERSON_MAIN:{openComparison(ids){calls.push(["open",ids]);return true;}},
    ATLAS_PERSON_SPACETIME_VIEW:{persistExplorationState(){calls.push(["persist"]);}},
    addEventListener(type,handler){eventListeners.set(type,handler);}
  };
  const history={state:null,replaceState(state){this.state=state;calls.push(["history"]);}};
  const routeHandler = new Function(
    "window","routeModel","parseRoute","showEntity","history",
    "let currentDomain=\"spacetime\";let explorationReturnHash=null;\n"+nav.slice(start,end)
      + "\nreturn ()=>explorationReturnHash;"
  )(window,route,route.parseHash,(domain,type,id)=>{
    calls.push(["navigate",domain,type,id]);
    window.location.hash=route.entityHash(domain,type,id);
    return true;
  },history);
  const fire=eventListeners.get("atlas-spacetime-compare-persons");
  fire({detail:{personIds:[a,a]}});
  fire({detail:{personIds:[a,"invalid"]}});
  fire({detail:{personIds:[b,a]}});
  assert.equal(calls.length,0);
  fire({detail:{personIds:[a,b]}});
  assert.deepEqual(calls,[
    ["persist"],
    ["navigate","persons","person",a],
    ["history"],
    ["open",[a,b]]
  ]);
  assert.equal(routeHandler(),route.entityHash("spacetime","person",a));
  assert.deepEqual(history.state.atlasSpacetimeReturnV1,
    {routeHash:route.entityHash("spacetime","person",a),personId:a});
});

test("UI-07 retains Person source-backed rendering and provides Back only with real return context", () => {
  const first={id:a,display_name:"A",activities:[{id:"actA",start:{year:1592},end:{year:1598},sources:[]}]};
  const second={id:b,display_name:"B",activities:[{id:"actB",start:{year:1594},end:{year:1596},sources:[]}]};
  const normal=compareView.render([first,second]);
  const returning=compareView.render([first,second],{returnToExploration:true});
  assert.doesNotMatch(normal,/data-compare-return-spacetime/);
  assert.match(returning,/data-compare-return-spacetime/);
  assert.equal((returning.match(/class="atlas-compare-activity"/g)||[]).length,2);
  assert.match(returning,/동시대 활동이 실제 접촉·영향·관계를 뜻하지 않습니다/);
  assert.match(main,/function openComparison\(personIds\)/);
  assert.match(main,/comparisonIds = ids;/);
  assert.match(main,/void renderComparisonPanel\(\)/);
  assert.match(main,/data-compare-return-spacetime/);
  assert.match(main,/CustomEvent\("atlas-person-return-to-exploration"\)/);
  assert.match(main,/openComparison,\s*restoreComparisonFromHistory,\s*clearSelection/);
  assert.match(main,/returnToExploration: Boolean\(window\.ATLAS_MAIN_AUTHORITY_NAV\?\.getExplorationReturnHash\?\.\(\)\)/);
  assert.match(nav,/history\.back\(\)/);
});

test("UI-07 new crosslink CSS is scoped to Meanwhile and all lazy assets are fresh", () => {
  assert.match(bridgeCss,/\.spacetime-meanwhile-compare-row/);
  assert.match(bridgeCss,/\[data-spacetime-meanwhile-compare\]/);
  assert.match(bridgeCss,/@media \(max-width: 760px\)/);
  assert.doesNotMatch(bridgeCss,/\.spacetime-scroll|\.spacetime-canvas|\.spacetime-world/);
  assert.match(compareCss,/\.atlas-compare-head-actions/);
  assert.match(nav,/atlas-person-spacetime-compare-crosslink\.css\?v=20261120-ui07-spacetime-v1/);
  assert.match(nav,/atlas-person-spacetime-view\.js\?v=[^"]+&ui07=20261120-cross-compare-v1/);
  assert.match(html,/atlas-main-authority-nav\.js\?v=[^"]+&bridge=20261120-cross-compare-v1/);
  assert.match(html,/atlas-person-main\.js\?v=[^"]+&bridge=20261120-cross-compare-v1/);
  assert.match(html,/atlas-person-compare-view\.js\?v=[^"]+&bridge=20261120-cross-compare-v1/);
  assert.match(html,/atlas-person-compare-view\.css\?v=[^"]+&bridge=20261120-cross-compare-v1/);
});
