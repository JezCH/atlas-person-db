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
