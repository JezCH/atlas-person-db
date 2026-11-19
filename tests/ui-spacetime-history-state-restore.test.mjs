import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const route = createRequire(import.meta.url)("../atlas-entity-route.js");
const read = (name) => fs.readFileSync(new URL("../" + name, import.meta.url), "utf8");
const view = read("atlas-person-spacetime-view.js");
const nav = read("atlas-main-authority-nav.js");
const html = read("index.html");
const person = "11111111-1111-4111-8111-111111111111";
const activity = "22222222-2222-4222-8222-222222222222";
const hash = route.activityHash(person, activity);
const begin = view.indexOf("  function captureExplorationState() {");
const end = view.indexOf("  function captureRenderFocus(mount) {", begin);
assert.ok(begin >= 0 && end > begin, "Missing production capture/restore logic");
const actual = view.slice(begin, end);

function makeSandbox() {
  const history = { state: { keep: true }, calls: 0,
    replaceState(value) { this.state = value; this.calls++; } };
  const window = {
    location: { hash, href: "https://atlas-person-db.vercel.app/" + hash },
    ATLAS_ENTITY_ROUTE: route,
    ATLAS_PERSON_SPACETIME_MEANWHILE: { summarize() {} }
  };
  const track = { person_id: person, primary_segments: [{ activity_id: activity }] };
  const declarations = [
    "const CAMERA_MIN_ZOOM = 0.5, CAMERA_MAX_ZOOM = 15, CAMERA_DEFAULT_ZOOM = 5;",
    "let explorationHistorySnapshotTimer = null, currentTimelineProjection = null;",
    "let selectedPersonId = " + JSON.stringify(person) + ", selectedActivityId = " + JSON.stringify(activity) + ";",
    "let selectedTimeOrdinal = 20, query = '한글 검색', cameraZoom = 6.5;",
    "let cameraScrollLeft = 110, cameraScrollTop = 230, cameraCenterOrdinal = 30.5;",
    "let meanwhileSelectedOrdinal = 42, meanwhileSelectionSource = 'manual', meanwhileRegionCode = 'east_asia';",
    "let externalFocusPersonId = null, pendingViewportHorizontalRatio = null;",
    "let pendingViewportCameraOrdinal = null, pendingFocusPersonId = 'old', pendingActivityFocus = 'old', pendingCameraAnchor = 'old';",
    "let explorationOrigin = {personId:" + JSON.stringify(person) + ",activityId:" + JSON.stringify(activity) +
      ",query:'원래 활동',zoom:5,scrollLeft:10,scrollTop:15,centerOrdinal:12,horizontalRatio:0.25,meanwhileOrdinal:15,meanwhileSource:'activity',regionCode:'east_asia'};"
  ];
  const exportApi = [
    "return { captureExplorationState, restoreExplorationState, persistExplorationState,",
    "reset() { selectedPersonId=null; selectedActivityId=null; selectedTimeOrdinal=null; query='';",
    "cameraZoom=5; cameraScrollLeft=0; cameraScrollTop=0; cameraCenterOrdinal=null;",
    "meanwhileSelectedOrdinal=null; meanwhileSelectionSource=null; meanwhileRegionCode=''; explorationOrigin=null; },",
    "read() { return {selectedPersonId,selectedActivityId,selectedTimeOrdinal,query,cameraZoom,",
    "cameraScrollLeft,cameraScrollTop,pendingViewportHorizontalRatio,pendingViewportCameraOrdinal,",
    "meanwhileSelectedOrdinal,meanwhileRegionCode,explorationOrigin,pendingFocusPersonId,pendingActivityFocus}; } };"
  ];
  const factory = new Function(
    "window","history","document","model","timelineRange","compileAtlas","inspectorRuntime",
    "horizontalCameraRatioFromStoredGeometry","updateCameraPosition","rememberHorizontalCameraGeometry",
    [...declarations, actual, ...exportApi].join("\n")
  );
  const api = factory(window, history, { getElementById() { return null; } },
    { historicalYearToOrdinal(year) { return year; }, REGION_DEFINITIONS: [{code:"east_asia"},{code:"europe"}] },
    () => ({start_year:-100,end_year:100}),
    () => ({partitioned:{tracks:[track]}}),
    () => ({selectedActivity(t,id) { return t === track && id === activity ? { id } : null; }}),
    () => 0.46, () => {}, () => {}
  );
  return { window, history, api };
}

test("UI-06B restores original chronology, camera, search, region and Activity origin after reload", () => {
  const {api,history} = makeSandbox();
  assert.equal(api.persistExplorationState(), true);
  assert.equal(history.state.keep, true);
  assert.equal(history.calls, 1);
  const snapshot = history.state.atlasSpacetimeExplorationV1;
  assert.equal(snapshot.routeHash, hash);
  assert.equal(snapshot.horizontalRatio, 0.46);
  assert.equal(snapshot.activityOrigin.activityId, activity);
  api.reset();
  assert.equal(api.restoreExplorationState(snapshot, person, activity), true);
  const state = api.read();
  assert.equal(state.selectedPersonId, person);
  assert.equal(state.selectedActivityId, activity);
  assert.equal(state.selectedTimeOrdinal, 20);
  assert.equal(state.query, "한글 검색");
  assert.equal(state.cameraZoom, 6.5);
  assert.equal(state.pendingViewportHorizontalRatio, 0.46);
  assert.equal(state.pendingViewportCameraOrdinal, 30.5);
  assert.equal(state.meanwhileSelectedOrdinal, 42);
  assert.equal(state.meanwhileRegionCode, "east_asia");
  assert.equal(state.explorationOrigin.query, "원래 활동");
  assert.equal(state.pendingFocusPersonId, null);
  assert.equal(state.pendingActivityFocus, null);
});

test("UI-06B rejects unrelated links and bounds unsafe history data", () => {
  const {api,window} = makeSandbox();
  const snapshot = api.captureExplorationState();
  api.reset();
  assert.equal(api.restoreExplorationState({...snapshot,routeHash:"#atlas-spacetime"}, person, activity), false);
  assert.equal(api.restoreExplorationState(snapshot, "33333333-3333-4333-8333-333333333333", activity), false);
  window.location.hash = "#atlas-spacetime/person/33333333-3333-4333-8333-333333333333";
  assert.equal(api.restoreExplorationState(snapshot, person, activity), false);
  window.location.hash = hash;
  assert.equal(api.restoreExplorationState({
    ...snapshot,zoom:100,scrollLeft:-90,horizontalRatio:2,
    centerOrdinal:9999,meanwhileOrdinal:9999,selectedTimeOrdinal:9999,regionCode:"invalid"
  },person,activity),true);
  const state = api.read();
  assert.equal(state.cameraZoom,15);
  assert.equal(state.cameraScrollLeft,0);
  assert.equal(state.pendingViewportHorizontalRatio,null);
  assert.equal(state.pendingViewportCameraOrdinal,null);
  assert.equal(state.meanwhileSelectedOrdinal,null);
  assert.equal(state.selectedTimeOrdinal,null);
  assert.equal(state.meanwhileRegionCode,"");
});

test("UI-06B dossier Back destination persists only on matching canonical Person history entry", () => {
  const first = nav.indexOf("  function validExplorationReturn(route) {");
  const last = nav.indexOf("  function showDomain(", first);
  assert.ok(first >= 0 && last > first);
  const history = {state:{atlasSpacetimeReturnV1:{routeHash:hash,personId:person}}};
  const validate = new Function("history","parseRoute",nav.slice(first,last)+"\nreturn validExplorationReturn;")(history,route.parseHash);
  assert.equal(validate(route.parseHash(route.entityHash("persons","person",person))),hash);
  history.state = null;
  assert.equal(validate(route.parseHash(route.entityHash("persons","person",person))),null);
  history.state = {atlasSpacetimeReturnV1:{routeHash:hash,personId:person}};
  assert.equal(validate(route.parseHash(route.entityHash("persons","person","33333333-3333-4333-8333-333333333333"))),null);
});

test("UI-06B snapshots at scroll, render, pagehide and while leaving; canonical deep links stay intact", () => {
  assert.match(view,/scroll\.addEventListener\("scroll", \(\) => \{\s*updateCameraPosition\(scroll, projection\);\s*scheduleExplorationSnapshot\(\)/);
  assert.match(view,/restoreRenderFocus\(mount, renderFocus\);\s*scheduleExplorationSnapshot\(\)/);
  assert.match(view,/window\.addEventListener\("pagehide"/);
  assert.match(view,/Object\.freeze\(\{ activate, captureExplorationState, persistExplorationState \}\)/);
  assert.match(nav,/atlasSpacetimeReturnV1: \{ routeHash: fromRoute\.canonical_hash, personId \}/);
  assert.match(nav,/view\?\.activate\?\.\(\{ focusPersonId, focusActivityId, explorationState \}\)/);
  assert.match(nav,/atlas-person-spacetime-view\.js\?v=[^"]+&history=20261120-v1/);
  assert.match(html,/atlas-main-authority-nav\.js\?v=[^"]+&history=20261120-v1/);
});
