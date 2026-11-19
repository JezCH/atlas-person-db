import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const read = (name) => fs.readFileSync(new URL("../"+name, import.meta.url), "utf8");
const route = read("atlas-entity-route.js");
const person = read("atlas-person-main.js");
const nav = read("atlas-main-authority-nav.js");
const view = read("atlas-person-spacetime-view.js");
const html = read("index.html");
const detailCss = read("atlas-person-chronicle-detail.css");
const worldCss = read("atlas-person-spacetime-instrument-tools.css");

test("UI-06B Activity entry is a canonical Person Activity pair, never a guessed year", () => {
  for (const src of [route,person,nav,view]) assert.doesNotThrow(() => new Function(src));
  assert.match(route, /function activityHash\(personId,activityId\)/);
  assert.match(person, /data-person-open-activity=/);
  assert.match(person, /selectedPersonDetail\?\.activities\?\.some/);
  assert.match(nav, /atlas-person-open-activity-spacetime/);
  assert.match(nav, /routeModel\.activityHash\?\.\(personId, activityId\)/);
  assert.match(nav, /focusActivityId:resolvedRoute\.activity_id \|\| null/);
  assert.match(view, /requestedActivityId/);
  assert.match(view, /await beginActivityExploration\(mount, requestedPersonId, requestedActivityId, \{ focus:true \}\)/);
  assert.match(view, /const nextTimeOrdinal = activity\.midpoint_ordinal/);
  assert.match(view, /Number\.isInteger\(selectedTimeOrdinal\)/);
  assert.match(view, /기준 연대가 미확정/);
  assert.match(view, /현재 검토된 주 위치/);
});

test("remaining in the contemporary world preserves the Activity-derived year but labels the continuation correctly", () => {
  assert.match(view, /if \(explorationOrigin && meanwhileSelectionSource === "activity"\) meanwhileSelectionSource = "exploration"/);
  assert.match(view, /활동에서 이어진 동시대 시점/);
  assert.match(view, /meanwhile\.summarize\(\s*compiled\.partitioned\.tracks/);
  assert.match(view, /selectedActivityId = null/);
  assert.match(view, /spacetimeReturnToActivity/);
  assert.match(view, /pendingViewportHorizontalRatio = origin\.horizontalRatio/);
  assert.match(view, /pendingViewportCameraOrdinal = origin\.centerOrdinal/);
  assert.match(view, /window\.dispatchEvent\(new CustomEvent\("atlas-spacetime-activity-selected"/);
});

test("Activity origin and return helpers restore real camera, query and Meanwhile state", async () => {
  const start=view.indexOf("  function rememberActivityOrigin(");
  const stop=view.indexOf("  function clearSelection(", start);
  assert.ok(start>0 && stop>start, "Expected scoped Activity origin functions");
  const source=view.slice(start,stop);
  const selected=[];
  let draws=0;
  const factory=new Function("selectActivity","renderInto", `
    let currentTimelineProjection = { ready:true };
    let query="original filter";
    let cameraZoom=5.75;
    let cameraScrollLeft=75;
    let cameraScrollTop=110;
    let cameraCenterOrdinal=1592;
    let meanwhileSelectedOrdinal=1592;
    let meanwhileSelectionSource="activity";
    let meanwhileRegionCode="europe";
    let pendingViewportHorizontalRatio=null;
    let pendingViewportCameraOrdinal=null;
    let externalFocusPersonId=null;
    let explorationOrigin=null;
    function updateCameraPosition(scroll) { cameraScrollLeft=scroll.scrollLeft;cameraScrollTop=scroll.scrollTop; }
    function rememberHorizontalCameraGeometry() {}
    function horizontalCameraRatioFromStoredGeometry() { return 0.42; }
    ${source}
    return {
      beginActivityExploration,returnToActivityOrigin,
      getOrigin:()=>explorationOrigin,
      relocate:()=>{query="different";cameraZoom=11;cameraScrollLeft=850;cameraScrollTop=900;cameraCenterOrdinal=1900;meanwhileSelectedOrdinal=1900;meanwhileSelectionSource="manual";meanwhileRegionCode="africa";},
      get:()=>({query,cameraZoom,cameraScrollLeft,cameraScrollTop,center:cameraCenterOrdinal,
        horizontalRatio:pendingViewportHorizontalRatio,restoredOrdinal:pendingViewportCameraOrdinal,
        meanwhileSelectedOrdinal,meanwhileSelectionSource,meanwhileRegionCode,externalFocusPersonId})
    };
  `);
  const tools=factory(async (_mount,personId,activityId,options)=>{
    selected.push({personId,activityId,focus:options.focus});
    return activityId==="act-1";
  },()=>{draws+=1;});
  const mount={
    querySelector(selector) {
      if (selector===".spacetime-scroll") return { scrollLeft:75,scrollTop:110 };
      if (selector==="#spacetimeReturnToActivity") return {focus(){}};
      return null;
    }
  };
  assert.equal(await tools.beginActivityExploration(mount,"p1","missing",{focus:true}),false);
  assert.equal(tools.getOrigin(),null);
  assert.equal(await tools.beginActivityExploration(mount,"p1","act-1",{focus:true}),true);
  const origin=tools.getOrigin();
  assert.ok(Object.isFrozen(origin));
  assert.equal(origin.personId,"p1");
  assert.equal(origin.activityId,"act-1");
  assert.equal(origin.horizontalRatio,0.42);
  tools.relocate();
  assert.equal(await tools.returnToActivityOrigin(mount),true);
  const state=tools.get();
  assert.equal(state.query,"original filter");
  assert.equal(state.cameraZoom,5.75);
  assert.equal(state.cameraScrollLeft,75);
  assert.equal(state.cameraScrollTop,110);
  assert.equal(state.restoredOrdinal,1592);
  assert.equal(state.horizontalRatio,0.42);
  assert.equal(state.meanwhileSelectedOrdinal,1592);
  assert.equal(state.meanwhileSelectionSource,"activity");
  assert.equal(state.meanwhileRegionCode,"europe");
  assert.equal(state.externalFocusPersonId,"p1");
  assert.equal(selected.at(-1).focus,false);
  assert.equal(draws,1, "Nonempty saved region is restored with one render");
});

test("Activity links are keyboard-visible, cache-busted, and do not add a new backend", () => {
  assert.match(detailCss,/\.person-activity-world-link:focus-visible/);
  assert.match(worldCss,/\.spacetime-return-activity:focus-visible/);
  for (const asset of ["atlas-entity-route.js","atlas-person-main.js","atlas-main-authority-nav.js","atlas-person-chronicle-detail.css"]){
    assert.match(html,new RegExp(asset.replaceAll(".","\\.") + '[^"]*activity=20261120-moment-return-v1'));
  }
  assert.match(nav,/atlas-person-spacetime-view\.js\?v=[^"]*&activity=20261120-moment-return-v1/);
  assert.doesNotMatch(person,/\/api\/atlas-mutate|\/api\/atlas-authoring/);
  assert.doesNotMatch(view,/\bgeometryMutation\b|\/api\/atlas-mutate/);
});


test("Activity deep-link focus uses the selected Activity primary position, never representative Person placement", () => {
  const start=view.indexOf("  function focusActivityInViewport(");
  const end=view.indexOf("  function updateMinimapViewport(",start);
  assert.ok(start>0&&end>start,"Reviewed Activity focus helper required");
  let projected=null;
  let updated=0;
  const focus=new Function("runtime","cameraInsets","updateCameraPosition","cameraHeaderHeight","cameraViewportCenterY",
    view.slice(start,end)+"\nreturn focusActivityInViewport;"
  )(
    ()=>({exploration:{focusScrollTarget(item){projected=item;return {left:item.x-100,top:item.y-150};}}}),
    ()=>({left:120,top:36}),
    ()=>{updated+=1;},()=>36,()=>150
  );
  const scroll={clientWidth:400,clientHeight:300,scrollWidth:2000,scrollHeight:5000,scrollLeft:50,scrollTop:80};
  const projection={yForOrdinal:(year)=>year*2};
  const track={primary_segments:[
    {activity_id:"representative",x_anchor:0.1,start_ordinal:1400,end_ordinal:1800},
    {activity_id:"requested",x_anchor:0.8,start_ordinal:1580,end_ordinal:1600}
  ]};
  assert.equal(focus(scroll,projection,track,"requested",1590,1000),true);
  assert.deepEqual(projected,{x:800,y:3180});
  assert.equal(scroll.scrollLeft,700);
  assert.equal(scroll.scrollTop,3030);
  assert.equal(updated,1);
  projected=null;
  assert.equal(focus(scroll,projection,track,"unplaced",1592,1000),false);
  assert.equal(projected,null,"No fabricated horizontal location for an unplaced Activity");
  assert.equal(scroll.scrollLeft,700,"Keep world region without a reviewed primary Activity placement");
  assert.equal(updated,2);
});

test("first Activity entry exposes a wired return button immediately, without canvas rerender", () => {
  const start=view.indexOf("  function rememberActivityOrigin(");
  const end=view.indexOf("  async function beginActivityExploration(",start);
  assert.ok(start>0&&end>start);
  let click=null,added=null;
  const document={createElement:()=>({
    addEventListener(type,handler){assert.equal(type,"click");click=handler;}
  })};
  const factory=new Function("document","returnToActivityOrigin",`
    let query="";
    let cameraZoom=5;
    let cameraScrollLeft=10,cameraScrollTop=20,cameraCenterOrdinal=1592;
    let meanwhileSelectedOrdinal=1592,meanwhileSelectionSource="activity",meanwhileRegionCode="";
    let currentTimelineProjection={};
    let explorationOrigin=null;
    function updateCameraPosition(){}
    function rememberHorizontalCameraGeometry(){}
    function horizontalCameraRatioFromStoredGeometry(){return 0.5;}
    ${view.slice(start,end)}
    return {rememberActivityOrigin,getOrigin:()=>explorationOrigin};
  `);
  let returned=0;
  const fn=factory(document,()=>{returned+=1;});
  const toolbar={
    firstChild:null,
    querySelector(){return null;},
    insertBefore(button){added=button;}
  };
  const mount={querySelector(selector){
    if(selector===".spacetime-scroll")return {scrollLeft:10,scrollTop:20};
    if(selector===".spacetime-toolbar")return toolbar;
    return null;
  }};
  fn.rememberActivityOrigin(mount,"person-1","activity-2");
  assert.equal(fn.getOrigin().activityId,"activity-2");
  assert.equal(added?.id,"spacetimeReturnToActivity");
  assert.equal(added?.type,"button");
  assert.match(added?.textContent,/시작 활동 시점으로/);
  assert.equal(typeof click,"function");
  click();
  assert.equal(returned,1);
});
