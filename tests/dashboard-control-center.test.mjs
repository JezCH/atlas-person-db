import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const registry = require("../atlas-person-domain-registry.js");
const model = require("../atlas-dashboard-model.js");
const domainUiSource = fs.readFileSync(new URL("../atlas-person-domain-ui.js", import.meta.url), "utf8");
const storeSource = fs.readFileSync(new URL("../atlas-client-data-store.js", import.meta.url), "utf8");
const dashboardSource = fs.readFileSync(new URL("../atlas-dashboard.js", import.meta.url), "utf8");
const externalSource = fs.readFileSync(new URL("../atlas-person-external-references.js", import.meta.url), "utf8");
const mainSource = fs.readFileSync(new URL("../atlas-person-main.js", import.meta.url), "utf8");
const spacetimeSource = fs.readFileSync(new URL("../atlas-person-spacetime-view.js", import.meta.url), "utf8");
const statusSummarySource = fs.readFileSync(new URL("../status-summary.js", import.meta.url), "utf8");

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

test("attention queue derives actionable Person sets from canonical snapshots and deduplicates affected Persons", () => {
  const persons = [
    { id:"p1", activity_count:1, external_references:{ namuwiki:{status:"linked"} }, facets:{ polities:[{id:"x"}] } },
    { id:"p2", activity_count:0, external_references:{}, facets:{ polities:[{id:"y"}] } },
    { id:"p3", activity_count:1, external_references:{ namuwiki:{status:"not_found"} }, facets:{ polities:[{id:"y"}] } }
  ];
  const queue = model.buildAttentionQueue({
    personResult:{ persons },
    domainResult:{ by_person_id:{ p1:"governance" } },
    spatialIndex:{
      polity_geography:{ x:"europe", y:"east-asia" },
      polity_subregions:{ x:"western-europe" },
      place_function_records:[]
    }
  });
  const byCode = Object.fromEntries(queue.items.map((item) => [item.code, item]));
  assert.deepEqual(byCode.domain.person_ids,["p2","p3"]);
  assert.deepEqual(byCode.namuwiki.person_ids,["p2"]);
  assert.deepEqual(byCode.spatial.person_ids,["p2","p3"]);
  assert.equal(queue.known_outstanding_checks,5);
  assert.equal(queue.known_affected_persons,2);
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


test("incomplete breakdown only exposes reasons supported by canonical state", () => {
  const persons = [
    { id:"p1", external_references:{ namuwiki:{status:"linked"} }, facets:{ polities:[{id:"x"}] } },
    { id:"p2", external_references:{}, facets:{ polities:[{id:"y"}] } },
    { id:"p3", external_references:{ namuwiki:{status:"not_found"} }, facets:{ polities:[{id:"z"}] } }
  ];
  const result = model.buildIncompleteBreakdown({
    personResult:{ persons },
    domainResult:{ by_person_id:{ p1:"governance" } },
    spatialIndex:{
      polity_subregions:{ x:"western-europe" },
      place_function_records:[],
      review_queue:[
        { polity_id:"y", reason:"transregional_empire_requires_activity_period_capital_review" }
      ]
    }
  });
  assert.equal(result.domain.available,false);
  assert.equal(result.domain.total,2);
  assert.equal(result.domain.unavailable_reason,"DOMAIN_UNRESOLVED_REASON_NOT_EXPOSED");
  assert.deepEqual(result.namuwiki.rows.map((row) => [row.code,row.count]),[["REFERENCE_ABSENT",1]]);
  assert.equal(result.spatial.total,2);
  assert.deepEqual(result.spatial.rows.map((row) => [row.code,row.count]),[
    ["transregional_empire_requires_activity_period_capital_review",1]
  ]);
  assert.equal(result.spatial.unattributed_count,1);
  assert.equal(result.spatial.complete,false);
  assert.equal(result.runtime.total,null);
  assert.equal(result.duplicate.total,null);
});

test("breakdown UI keeps unavailable reasons visibly unknown and never invents dashboard reason taxonomies", () => {
  assert.match(dashboardSource, /snapshot\.incomplete_breakdown/);
  assert.match(dashboardSource, /Reason unavailable/);
  assert.match(dashboardSource, /unavailable_reason/);
  assert.doesNotMatch(dashboardSource, /Historical ambiguity|Conflict review|Explicit HOLD/);
  assert.doesNotMatch(dashboardSource, /fetch\s*\(/);
});


test("legacy status summary reuses shared Person Runtime instead of issuing a duplicate normalized read", () => {
  assert.match(statusSummarySource, /ATLAS_CLIENT_DATA_STORE/);
  assert.match(statusSummarySource, /dataStore\.loadPersons\(\{ force \}\)/);
  assert.match(statusSummarySource, /activity_count/);
  assert.doesNotMatch(statusSummarySource, /AtlasReader\.loadPersonPolitics/);
  assert.doesNotMatch(statusSummarySource, /\/api\/atlas-read/);
});
