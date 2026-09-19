import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const registry = require("../atlas-person-domain-registry.js");
const model = require("../atlas-dashboard-model.js");
const spatialModel = require("../atlas-person-spacetime-model.js");
const domainUiSource = fs.readFileSync(new URL("../atlas-person-domain-ui.js", import.meta.url), "utf8");
const storeSource = fs.readFileSync(new URL("../atlas-client-data-store.js", import.meta.url), "utf8");
const dashboardSource = fs.readFileSync(new URL("../atlas-dashboard.js", import.meta.url), "utf8");
const externalSource = fs.readFileSync(new URL("../atlas-person-external-references.js", import.meta.url), "utf8");
const mainSource = fs.readFileSync(new URL("../atlas-person-main.js", import.meta.url), "utf8");
const spacetimeSource = fs.readFileSync(new URL("../atlas-person-spacetime-view.js", import.meta.url), "utf8");

test("dashboard model derives progress from canonical snapshots without stored dashboard counters", () => {
  const persons = [
    { id:"p1", historicity:"historical", activity_count:2, external_references:{ namuwiki:{status:"linked"} }, facets:{ polities:[{id:"x"}] } },
    { id:"p2", historicity:"historical", activity_count:0, external_references:{ namuwiki:{status:"not_found"} }, facets:{ polities:[{id:"y"}] } },
    { id:"p3", historicity:"uncertain", activity_count:1, external_references:{}, facets:{ polities:[{id:"z"}] } }
  ];
  const snapshot = model.buildDashboardSnapshot({
    personResult:{ persons },
    domainResult:{ by_person_id:{ p1:"governance", p2:"culture" } },
    spatialIndex:{
      polity_geography:{ x:"europe", y:"east-asia" },
      polity_subregions:{ x:"western-europe" },
      place_function_records:[],
      review_queue:[{polity_id:"y"}]
    },
    nonTimelineRows:[{person_name:"Legend"}],
    sourceStates:{ persons:{label:"Person Runtime",status:"ready"} }
  });
  assert.equal(snapshot.kpis.persons,3);
  assert.equal(snapshot.kpis.activities,3);
  assert.equal(snapshot.work.domain.done,2);
  assert.equal(snapshot.work.namuwiki.done,2);
  assert.equal(snapshot.work.spatial.done,1);
  assert.equal(snapshot.work.spatial.remaining,2);
  assert.equal(snapshot.quality.no_runtime_activity,1);
  assert.equal(snapshot.quality.non_timeline_registry,1);
});

test("unavailable optional sources remain unknown instead of becoming fabricated zero coverage", () => {
  const snapshot = model.buildDashboardSnapshot({
    personResult:{ persons:[{ id:"p1", historicity:"historical", activity_count:1, external_references:{}, facets:{polities:[]} }] },
    domainResult:null,
    spatialIndex:null,
    nonTimelineRows:null,
    sourceStates:{ personDomains:{label:"Person Domain",status:"error",error:"unavailable"} }
  });
  assert.equal(snapshot.work.domain.done,null);
  assert.equal(snapshot.work.domain.remaining,null);
  assert.equal(snapshot.work.domain.percentage,null);
  assert.equal(snapshot.quality.domain_unclassified,null);
  assert.equal(snapshot.quality.non_timeline_registry,null);
});

test("Person domain codes and labels have one canonical registry", () => {
  assert.deepEqual(model.DOMAIN_CODES, registry.CODES);
  assert.match(domainUiSource, /ATLAS_PERSON_DOMAIN_REGISTRY/);
  assert.doesNotMatch(dashboardSource, /governance:"통치·정치"/);
});

test("shared store is the sole browser owner of repeated Person/domain/spatial/non-timeline reads", () => {
  assert.match(storeSource, /personReader\.listPersons\(\)/);
  assert.match(storeSource, /\/api\/atlas-person-domain/);
  assert.match(storeSource, /atlas-polity-spatial-index\.json/);
  assert.match(storeSource, /non-timeline-persons\.json/);
  assert.doesNotMatch(dashboardSource, /fetch\s*\(/);
});

test("existing Person, external-reference and spacetime surfaces consume shared store", () => {
  assert.match(mainSource, /ATLAS_CLIENT_DATA_STORE/);
  assert.match(externalSource, /ATLAS_CLIENT_DATA_STORE/);
  assert.match(spacetimeSource, /ATLAS_CLIENT_DATA_STORE/);
  assert.doesNotMatch(externalSource, /fetch\s*\(READ_ENDPOINT/);
  assert.doesNotMatch(spacetimeSource, /fetch\s*\(SPATIAL_INDEX_URL/);
});

test("dashboard domain colors reuse canonical CSS tokens rather than duplicating hex values", () => {
  const css = fs.readFileSync(new URL("../atlas-dashboard.css", import.meta.url), "utf8");
  for (const code of model.DOMAIN_CODES) assert.match(css, new RegExp(`--atlas-person-domain-${code}`));
  assert.doesNotMatch(css, /#D4AF37|#B83A3A|#3F78C5|#59636D|#2E8B57|#9A5BA5|#E2D7B9|#D96B1E/i);
});


test("Person domain UI delegates source caching and in-flight dedupe to the shared store", () => {
  assert.match(domainUiSource, /dataStore\.loadPersonDomains\(\{ force \}\)/);
  assert.doesNotMatch(domainUiSource, /let loaded\s*=/);
  assert.doesNotMatch(domainUiSource, /let loadPromise\s*=/);
  assert.doesNotMatch(domainUiSource, /if \(!force && loaded\)/);
  assert.match(domainUiSource, /atlas-client-data-source-updated/);
  assert.match(domainUiSource, /event\?\.detail\?\.key !== "personDomains"/);
});

test("attention queue derives Spatial Person targets from the canonical Activity resolver, including overrides", () => {
  const P1="00000000-0000-4000-8000-000000000001";
  const P2="00000000-0000-4000-8000-000000000002";
  const POLITY_STATIC="00000000-0000-4000-8000-000000000101";
  const POLITY_REVIEW="00000000-0000-4000-8000-000000000102";
  const A1="00000000-0000-4000-8000-000000000201";
  const A2="00000000-0000-4000-8000-000000000202";
  const A3="00000000-0000-4000-8000-000000000203";
  const activity=(id,polity,start,end)=>({id,polity:{id},start:{year:start},end:{year:end}});
  const persons = [
    { id:P1, activity_count:2, external_references:{ namuwiki:{status:"linked"} }, facets:{ polities:[{id:POLITY_STATIC},{id:POLITY_REVIEW}] }, activity_summaries:[activity(A1,POLITY_STATIC,100,110),activity(A2,POLITY_REVIEW,120,130)] },
    { id:P2, activity_count:1, external_references:{ namuwiki:{status:"not_found"} }, facets:{ polities:[{id:POLITY_REVIEW}] }, activity_summaries:[activity(A3,POLITY_REVIEW,140,150)] }
  ];
  const spatialIndex={
    schema:spatialModel.SPATIAL_INDEX_SCHEMA,
    polity_geography:{ [POLITY_STATIC]:"europe" },
    polity_subregions:{ [POLITY_STATIC]:"western-europe" },
    place_function_records:[],
    review_queue:[{polity_id:POLITY_REVIEW,reason:"activity_specific_review"}],
    activity_spatial_overrides:[{
      activity_id:A2,expected_polity_id:POLITY_REVIEW,expected_start_year:120,expected_end_year:130,
      region_code:"europe",subregion_code:"western-europe",location_label:"Reviewed activity anchor",
      reason:"reviewed activity placement",source_refs:["fixture source"]
    }]
  };
  const status=model.spatialStatus({persons},spatialIndex);
  assert.equal(status.total,3);
  assert.equal(status.ready,2);
  assert.equal(status.unresolved,1);
  assert.deepEqual(status.unresolved_person_ids,[P2]);
  assert.equal(status.reason_counts.placement_missing,1);

  const queue = model.buildAttentionQueue({
    personResult:{ persons },
    domainResult:{ by_person_id:{ [P1]:"governance" } },
    spatialIndex
  });
  const byCode = Object.fromEntries(queue.items.map((item) => [item.code, item]));
  assert.deepEqual(byCode.domain.person_ids,[P2]);
  assert.deepEqual(byCode.namuwiki.person_ids,[]);
  assert.deepEqual(byCode.spatial.person_ids,[P2]);
  assert.equal(queue.known_outstanding_checks,2);
  assert.equal(queue.known_affected_persons,1);
  assert.equal(queue.complete,false);
  assert.equal(byCode.runtime_exclusion.count,null);
  assert.equal(byCode.duplicate_review.count,null);
});

test("attention queue preserves unavailable sources as unknown instead of fake zero", () => {
  const queue = model.buildAttentionQueue({
    personResult:{ persons:[{ id:"p1", external_references:{}, facets:{polities:[]} }] },
    domainResult:null,
    spatialIndex:null
  });
  const byCode = Object.fromEntries(queue.items.map((item) => [item.code, item]));
  assert.equal(byCode.domain.available,false);
  assert.equal(byCode.domain.count,null);
  assert.equal(byCode.spatial.available,false);
  assert.equal(byCode.spatial.count,null);
  assert.equal(byCode.namuwiki.count,1);
  assert.equal(queue.known_outstanding_checks,1);
});

test("attention queue drill-down reuses Person Main instead of creating a duplicate list UI", () => {
  assert.match(dashboardSource, /data-dashboard-attention/);
  assert.match(dashboardSource, /ATLAS_PERSON_MAIN\?\.setDashboardFilter/);
  assert.match(mainSource, /setDashboardFilter/);
  assert.match(mainSource, /secondaryPredicate:dashboardFilter/);
  assert.match(mainSource, /data-person-dashboard-filter-clear/);
  assert.doesNotMatch(dashboardSource, /fetch\s*\(/);
});


test("Dashboard loads the canonical spacetime model before its model and does not duplicate spatial resolution rules", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const spatialIndex = html.indexOf("atlas-person-spacetime-model.js");
  const dashboardIndex = html.indexOf("atlas-dashboard-model.js");
  assert.ok(spatialIndex >= 0 && spatialIndex < dashboardIndex);
  const dashboardModelSource = fs.readFileSync(new URL("../atlas-dashboard-model.js", import.meta.url), "utf8");
  assert.match(dashboardModelSource, /spatialModel\.resolveActivityPlacement/);
});
