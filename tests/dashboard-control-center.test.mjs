import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const registry = require("../atlas-person-domain-registry.js");
const eraModel = require("../atlas-person-era-model.js");
const model = require("../atlas-dashboard-model.js");
const spatialModel = require("../atlas-person-spacetime-model.js");
const domainUiSource = fs.readFileSync(new URL("../atlas-person-domain-ui.js", import.meta.url), "utf8");
const storeSource = fs.readFileSync(new URL("../atlas-client-data-store.js", import.meta.url), "utf8");
const dashboardSource = fs.readFileSync(new URL("../atlas-dashboard.js", import.meta.url), "utf8");
const dashboardCssSource = fs.readFileSync(new URL("../atlas-dashboard.css", import.meta.url), "utf8");
const externalSource = fs.readFileSync(new URL("../atlas-person-external-references.js", import.meta.url), "utf8");
const mainSource = fs.readFileSync(new URL("../atlas-person-main.js", import.meta.url), "utf8");
const spacetimeSource = fs.readFileSync(new URL("../atlas-person-spacetime-view.js", import.meta.url), "utf8");
const statusSummarySource = fs.readFileSync(new URL("../status-summary.js", import.meta.url), "utf8");
const readApiSource = fs.readFileSync(new URL("../api/atlas-read.js", import.meta.url), "utf8");

test("dashboard model derives progress from canonical snapshots without stored dashboard counters", () => {
  const P1="00000000-0000-4000-8000-000000000001", P2="00000000-0000-4000-8000-000000000002", P3="00000000-0000-4000-8000-000000000003";
  const X="00000000-0000-4000-8000-000000000101", Y="00000000-0000-4000-8000-000000000102", Z="00000000-0000-4000-8000-000000000103";
  const A1="00000000-0000-4000-8000-000000000201", A2="00000000-0000-4000-8000-000000000202", A3="00000000-0000-4000-8000-000000000203";
  const activity=(id,polity,start,end)=>({id,polity:{id:polity},start:{year:start},end:{year:end}});
  const persons = [
    { id:P1, historicity:"historical", activity_count:2, external_references:{ namuwiki:{status:"linked"} }, facets:{ polities:[{id:X}] }, activity_summaries:[activity(A1,X,100,110)] },
    { id:P2, historicity:"historical", activity_count:0, external_references:{ namuwiki:{status:"not_found"} }, facets:{ polities:[{id:Y}] }, activity_summaries:[activity(A2,Y,120,130)] },
    { id:P3, historicity:"uncertain", activity_count:1, external_references:{}, facets:{ polities:[{id:Z}] }, activity_summaries:[activity(A3,Z,140,150)] }
  ];
  const snapshot = model.buildDashboardSnapshot({
    personResult:{ persons },
    domainResult:{ by_person_id:{ [P1]:"governance", [P2]:"culture" } },
    spatialIndex:{
      schema:spatialModel.SPATIAL_INDEX_SCHEMA,
      polity_geography:{ [X]:"europe", [Y]:"east-asia" },
      polity_subregions:{ [X]:"western-europe" },
      place_function_records:[],
      review_queue:[{polity_id:Y,reason:"activity_specific_review"}],
      activity_spatial_overrides:[]
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
  const activity=(id,polity,start,end)=>({id,polity:{id:polity},start:{year:start},end:{year:end}});
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


test("incomplete breakdown only exposes reasons supported by canonical state", () => {
  const P1="00000000-0000-4000-8000-000000000001", P2="00000000-0000-4000-8000-000000000002", P3="00000000-0000-4000-8000-000000000003";
  const X="00000000-0000-4000-8000-000000000101", Y="00000000-0000-4000-8000-000000000102", Z="00000000-0000-4000-8000-000000000103";
  const A1="00000000-0000-4000-8000-000000000201", A2="00000000-0000-4000-8000-000000000202", A3="00000000-0000-4000-8000-000000000203";
  const activity=(id,polity,start,end)=>({id,polity:{id:polity},start:{year:start},end:{year:end}});
  const persons = [
    { id:P1, external_references:{ namuwiki:{status:"linked"} }, facets:{ polities:[{id:X}] }, activity_summaries:[activity(A1,X,100,110)] },
    { id:P2, external_references:{}, facets:{ polities:[{id:Y}] }, activity_summaries:[activity(A2,Y,120,130)] },
    { id:P3, external_references:{ namuwiki:{status:"not_found"} }, facets:{ polities:[{id:Z}] }, activity_summaries:[activity(A3,Z,140,150)] }
  ];
  const result = model.buildIncompleteBreakdown({
    personResult:{ persons },
    domainResult:{ by_person_id:{ [P1]:"governance" } },
    spatialIndex:{
      schema:spatialModel.SPATIAL_INDEX_SCHEMA,
      polity_geography:{ [X]:"europe" },
      polity_subregions:{ [X]:"western-europe" },
      place_function_records:[],
      review_queue:[{ polity_id:Y, reason:"activity_specific_review" }],
      activity_spatial_overrides:[]
    }
  });
  assert.equal(result.domain.available,false);
  assert.equal(result.domain.total,2);
  assert.equal(result.domain.unavailable_reason,"DOMAIN_UNRESOLVED_REASON_NOT_EXPOSED");
  assert.deepEqual(result.namuwiki.rows.map((row) => [row.code,row.count]),[["REFERENCE_ABSENT",1]]);
  assert.equal(result.spatial.total,2);
  assert.deepEqual(result.spatial.rows.map((row) => [row.code,row.count]),[["placement_missing",2]]);
  assert.equal(result.spatial.unit,"activity");
  assert.equal(result.spatial.unattributed_count,0);
  assert.equal(result.spatial.complete,true);
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


test("Dashboard loads the canonical spacetime model before its model and does not duplicate spatial resolution rules", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const spatialIndex = html.indexOf("atlas-person-spacetime-model.js");
  const dashboardIndex = html.indexOf("atlas-dashboard-model.js");
  assert.ok(spatialIndex >= 0 && spatialIndex < dashboardIndex);
  const dashboardModelSource = fs.readFileSync(new URL("../atlas-dashboard-model.js", import.meta.url), "utf8");
  assert.match(dashboardModelSource, /spatialModel\.resolveActivityPlacement/);
  assert.doesNotMatch(dashboardModelSource, /placeFunctionIds/);
});


test("legacy status summary reuses shared Person Runtime instead of issuing a duplicate normalized read", () => {
  assert.match(statusSummarySource, /ATLAS_CLIENT_DATA_STORE/);
  assert.match(statusSummarySource, /dataStore\.loadPersons\(\{ force \}\)/);
  assert.match(statusSummarySource, /activity_count/);
  assert.doesNotMatch(statusSummarySource, /AtlasReader\.loadPersonPolitics/);
  assert.doesNotMatch(statusSummarySource, /\/api\/atlas-read/);
});


test("dashboard has no no-op shared-source update listener", () => {
  assert.doesNotMatch(dashboardSource, /addEventListener\(["']atlas-client-data-source-updated["']/);
});


test("KPI drill-down preserves metric units and only exposes exact Person target sets", () => {
  const persons = [
    { id:"p1", external_references:{ namuwiki:{status:"linked"} }, facets:{polities:[]}, activity_summaries:[] },
    { id:"p2", external_references:{}, facets:{polities:[]}, activity_summaries:[] },
    { id:"p3", external_references:{ namuwiki:{status:"not_found"} }, facets:{polities:[]}, activity_summaries:[] }
  ];
  const attention = model.buildAttentionQueue({
    personResult:{persons},
    domainResult:{by_person_id:{p1:"governance"}},
    spatialIndex:null
  });
  const drill = model.buildKpiDrilldown({personResult:{persons},attentionQueue:attention});
  assert.deepEqual(drill.persons.person_ids,["p1","p2","p3"]);
  assert.equal(drill.persons.mode,"all_persons");
  assert.deepEqual(drill.domain.person_ids,["p2","p3"]);
  assert.deepEqual(drill.namuwiki.person_ids,["p2"]);
  assert.equal(drill.activities.available,false);
  assert.equal(drill.activities.unavailable_reason,"ACTIVITY_UNIT_DRILLDOWN_NOT_EXPOSED");
  assert.equal(drill.polities.available,false);
  assert.equal(drill.spatial.available,false);
  assert.equal(drill.spatial.unavailable_reason,"SPATIAL_KPI_IS_ACTIVITY_UNIT_USE_ATTENTION_PERSON_TARGETS");
});

test("KPI cards reuse Person Main drill-down without converting Activity or Polity metrics into Person counts", () => {
  assert.match(dashboardSource, /data-dashboard-kpi/);
  assert.match(dashboardSource, /kpiCard\(\{code:"persons"/);
  assert.match(dashboardSource, /kpiCard\(\{code:"domain"/);
  assert.match(dashboardSource, /kpiCard\(\{code:"namuwiki"/);
  assert.match(dashboardSource, /ATLAS_PERSON_MAIN\?\.setDashboardFilter/);
  assert.match(dashboardSource, /ATLAS_PERSON_MAIN\?\.clearDashboardFilter/);
  assert.doesNotMatch(dashboardSource, /data-dashboard-kpi="activities"/);
  assert.doesNotMatch(dashboardSource, /data-dashboard-kpi="polities"/);
  assert.doesNotMatch(dashboardSource, /data-dashboard-kpi="spatial"/);
  assert.doesNotMatch(dashboardSource, /fetch\s*\(/);
});


test("dashboard KPI order keeps actionable coverage ahead of passive counts on narrow layouts", () => {
  const persons = dashboardSource.indexOf('code:"persons"');
  const domain = dashboardSource.indexOf('code:"domain"');
  const namuwiki = dashboardSource.indexOf('code:"namuwiki"');
  const spatial = dashboardSource.indexOf('code:"spatial"');
  const activities = dashboardSource.indexOf('code:"activities"');
  const polities = dashboardSource.indexOf('code:"polities"');
  assert.ok(persons >= 0 && domain > persons && namuwiki > domain && spatial > namuwiki);
  assert.ok(activities > spatial && polities > activities);
});

test("coverage KPIs expose absolute done/total and remaining work", () => {
  assert.match(dashboardSource, /DOMAIN COVERAGE[\s\S]*w\.domain\.done[\s\S]*w\.domain\.total[\s\S]*w\.domain\.remaining/);
  assert.match(dashboardSource, /NAMUWIKI REVIEW[\s\S]*w\.namuwiki\.done[\s\S]*w\.namuwiki\.total[\s\S]*w\.namuwiki\.remaining/);
  assert.match(dashboardSource, /SPATIAL READY[\s\S]*w\.spatial\.done[\s\S]*w\.spatial\.total[\s\S]*w\.spatial\.remaining/);
});


test("Data Quality excludes Person work counters already exposed by Needs Attention", () => {
  const start = dashboardSource.indexOf("DATA QUALITY");
  const end = dashboardSource.indexOf("dashboard-lower-grid", start);
  assert.ok(start >= 0 && end > start);
  const block = dashboardSource.slice(start,end);
  assert.doesNotMatch(block, /분야 미분류|나무위키 미검토|domain_unclassified|namuwiki_missing/);
  assert.match(block, /Spatial 미해결/);
  assert.match(block, /Spatial review queue/);
  assert.match(block, /Runtime Activity 없음/);
  assert.match(block, /Non-timeline registry/);
});

test("quality snapshot keeps only non-duplicated structural and exception counters", () => {
  const snapshot = model.buildDashboardSnapshot({
    personResult:{ persons:[{ id:"p1", historicity:"historical", activity_count:0, external_references:{}, facets:{polities:[]} }] },
    domainResult:{ by_person_id:{} },
    spatialIndex:null,
    nonTimelineRows:[{person_name:"Legend"}]
  });
  assert.equal(Object.hasOwn(snapshot.quality,"domain_unclassified"),false);
  assert.equal(Object.hasOwn(snapshot.quality,"namuwiki_missing"),false);
  assert.deepEqual(Object.keys(snapshot.quality).sort(),[
    "no_runtime_activity","non_timeline_registry","spatial_review","spatial_unresolved"
  ]);
});


test("Recent Delta read surface is backed by canonical mutation ledgers and preserves delete coverage as unknown", () => {
  assert.match(readApiSource, /surface === "recent-delta"/);
  assert.match(readApiSource, /atlas_v2\.authoring_manifest_runs/);
  assert.match(readApiSource, /atlas_v2\.person_profile_mutation_audits/);
  assert.match(readApiSource, /atlas_v2\.correction_manifest_runs/);
  assert.match(readApiSource, /atlas_v2\.person_merge_audits/);
  assert.match(readApiSource, /delete_person:false/);
  assert.match(readApiSource, /PERSON_DELETE_IMMUTABLE_AUDIT_NOT_EXPOSED/);
  assert.doesNotMatch(readApiSource, /select[\s\S]{0,120}request_id[\s\S]{0,120}as occurred_at/i);
});

test("shared store owns the Recent Delta fetch and Dashboard only consumes normalized shared state", () => {
  assert.match(storeSource, /recentDelta:[\s\S]*__atlas_read_surface=recent-delta/);
  assert.match(storeSource, /function loadRecentDelta/);
  assert.match(dashboardSource, /store\.loadRecentDelta\(\{ force \}\)/);
  assert.doesNotMatch(dashboardSource, /fetch\s*\(/);
});

test("Recent Delta model preserves canonical chronology and explicit coverage gaps", () => {
  const delta=model.buildRecentDelta({
    rows:[
      {occurred_at:"2026-09-19T02:00:00.000Z",kind:"profile",operation:"set_person_external_reference",person_id:"p1",display_name:"인물 1",change_count:1},
      {occurred_at:"2026-09-19T01:00:00.000Z",kind:"correction",operation:"relationship_correction",person_id:null,display_name:null,change_count:3}
    ],
    coverage:{authoring:true,profile:true,correction:true,merge:false,delete_person:false,delete_person_reason:"PERSON_DELETE_IMMUTABLE_AUDIT_NOT_EXPOSED"}
  });
  assert.equal(delta.available,true);
  assert.equal(delta.latest_at,"2026-09-19T02:00:00.000Z");
  assert.deepEqual(delta.rows.map((row)=>row.label),["외부참조 수정","Activity 보정"]);
  assert.deepEqual(delta.tracked_sources,["authoring","profile","correction"]);
  assert.deepEqual(delta.gaps,["PERSON_DELETE_IMMUTABLE_AUDIT_NOT_EXPOSED"]);
});

test("Dashboard Recent Delta shows tracked mutations without inventing untracked delete counts", () => {
  assert.match(dashboardSource, /RECENT DELTA/);
  assert.match(dashboardSource, /최근 추적 변경/);
  assert.match(dashboardSource, /Coverage gap/);
  assert.doesNotMatch(dashboardSource, /delete(?:d)? persons?\s*[:=]\s*\$?\{?0/i);
});


test("public runtime identity surface exposes only deployment identity fields and never admin configuration", () => {
  assert.match(readApiSource, /surface === "runtime-identity"/);
  assert.match(readApiSource, /function publicRuntimeIdentity/);
  const start=readApiSource.indexOf("function publicRuntimeIdentity");
  const end=readApiSource.indexOf("function createPublicRuntimeIdentityHandler",start);
  const block=readApiSource.slice(start,end);
  assert.match(block, /provider/);
  assert.match(block, /environment/);
  assert.match(block, /git_commit_sha/);
  assert.match(block, /git_commit_ref/);
  assert.match(block, /region/);
  assert.doesNotMatch(block, /deployment_url|configurationStatus|ATLAS_SESSION_SECRET|ATLAS_MUTATION_TOKEN|SUPABASE_DB_URL/);
});

test("shared store owns Runtime Identity and Dashboard does not issue a direct system fetch", () => {
  assert.match(storeSource, /systemIdentity:[\s\S]*__atlas_read_surface=runtime-identity/);
  assert.match(storeSource, /function loadSystemIdentity/);
  assert.match(dashboardSource, /store\.loadSystemIdentity\(\{ force \}\)/);
  assert.doesNotMatch(dashboardSource, /fetch\s*\(/);
});

test("System Strip distinguishes known Production main identity from unknown runtime state", () => {
  const known=model.buildSystemStrip({
    identity:{provider:"vercel",environment:"production",git_commit_sha:"1234567890abcdef1234567890abcdef12345678",git_commit_ref:"main",region:"icn1"}
  },{
    persons:{status:"ready"},personDomains:{status:"ready"},spatialIndex:{status:"error"}
  });
  assert.equal(known.available,true);
  assert.equal(known.production_main,true);
  assert.equal(known.git_commit_short,"1234567890ab");
  assert.deepEqual(known.source_health,{available:true,total:3,ready:2,errors:1,loading:0});

  const unknown=model.buildSystemStrip(null,{});
  assert.equal(unknown.available,false);
  assert.equal(unknown.production_main,null);
  assert.equal(unknown.git_commit_sha,null);
  assert.equal(unknown.source_health.total,null);
});

test("Dashboard System / Production Strip reports deployed identity without claiming GitHub main parity", () => {
  assert.match(dashboardSource, /SYSTEM \/ PRODUCTION/);
  assert.match(dashboardSource, /DEPLOYED GIT/);
  assert.match(dashboardSource, /GitHub Actions 상태는 runtime identity와 별도/);
  assert.doesNotMatch(dashboardSource, /main parity|GitHub main exact|CI success|Actions success/i);
});


test("canonical Person Era model is reusable by Dashboard without a duplicate era taxonomy", () => {
  assert.equal(eraModel.ERAS.length,10);
  assert.deepEqual(model.buildEraRegionHeatmap({personResult:{persons:[]},spatialIndex:null}).eras,eraModel.ERAS);
  const dashboardModelSource=fs.readFileSync(new URL("../atlas-dashboard-model.js",import.meta.url),"utf8");
  assert.match(dashboardModelSource,/require\("\.\/atlas-person-era-model\.js"\)/);
  assert.doesNotMatch(dashboardModelSource,/early-civilization", label:/);
});

test("Era × region heatmap counts placed Activity presence by canonical era overlap and macroregion", () => {
  const P1="00000000-0000-4000-8000-000000000001";
  const POLITY="00000000-0000-4000-8000-000000000101";
  const A1="00000000-0000-4000-8000-000000000201";
  const A2="00000000-0000-4000-8000-000000000202";
  const activity=(id,start,end)=>({id,polity:{id:POLITY},start:{year:start},end:{year:end}});
  const personResult={persons:[{
    id:P1,
    activity_summaries:[activity(A1,590,610),activity(A2,1490,1500)]
  }]};
  const spatialIndex={
    schema:spatialModel.SPATIAL_INDEX_SCHEMA,
    regions:[{code:"europe",label:"유럽"},{code:"east-asia",label:"동아시아"}],
    polity_geography:{[POLITY]:"europe"},
    polity_subregions:{[POLITY]:"western-europe"},
    place_function_records:[],
    review_queue:[],
    activity_spatial_overrides:[]
  };
  const heatmap=model.buildEraRegionHeatmap({personResult,spatialIndex});
  const byEra=Object.fromEntries(heatmap.rows.map((row)=>[row.era.code,Object.fromEntries(row.cells.map((cell)=>[cell.region_code,cell.count]))]));
  assert.equal(heatmap.available,true);
  assert.deepEqual(heatmap.regions.map((region)=>region.code),["europe","east-asia"]);
  assert.equal(byEra.classical.europe,1);
  assert.equal(byEra["early-medieval"].europe,1);
  assert.equal(byEra["late-medieval"].europe,1);
  assert.equal(byEra["early-modern"].europe,1);
  assert.equal(byEra.classical["east-asia"],0);
  assert.equal(heatmap.placed_activity_count,2);
  assert.equal(heatmap.unresolved_activity_count,0);
});

test("Heatmap deduplicates multiple spatial segments of one Activity within the same era and region", () => {
  const POLITY="00000000-0000-4000-8000-000000000101";
  const A1="00000000-0000-4000-8000-000000000201";
  const personResult={persons:[{id:"p1",activity_summaries:[{id:A1,polity:{id:POLITY},start:{year:100},end:{year:200}}]}]};
  const spatialIndex={
    schema:spatialModel.SPATIAL_INDEX_SCHEMA,
    regions:[{code:"europe",label:"유럽"}],
    polity_geography:{},
    polity_subregions:{},
    place_function_records:[],
    review_queue:[{polity_id:POLITY,reason:"activity_specific_review"}],
    activity_spatial_overrides:[{
      activity_id:A1,expected_polity_id:POLITY,expected_start_year:100,expected_end_year:200,override_mode:"timeline_segments",
      region_code:"",subregion_code:"",location_label:"",reason:"fixture",source_refs:["fixture"],
      segments:[
        {start_year:100,end_year:149,region_code:"europe",subregion_code:"western-europe",location_label:"A",source_refs:["fixture"]},
        {start_year:150,end_year:200,region_code:"europe",subregion_code:"western-europe",location_label:"B",source_refs:["fixture"]}
      ]
    }]
  };
  const heatmap=model.buildEraRegionHeatmap({personResult,spatialIndex});
  const classical=heatmap.rows.find((row)=>row.era.code==="classical");
  assert.equal(classical.cells[0].count,1);
});

test("Dashboard heatmap reuses canonical spatial resolver and renders zero as real zero only when source is available", () => {
  const dashboardModelSource=fs.readFileSync(new URL("../atlas-dashboard-model.js",import.meta.url),"utf8");
  assert.match(dashboardModelSource,/spatialModel\.resolveActivityPlacement/);
  assert.match(dashboardSource,/ERA × REGION COVERAGE/);
  assert.match(dashboardSource,/heatmap\.available/);
  assert.match(dashboardSource,/data-heatmap-level/);
  assert.doesNotMatch(dashboardSource,/fetch\s*\(/);
});


test("Completeness Matrix keeps Person and Activity units separate and preserves unavailable sources as unknown", () => {
  const P1="00000000-0000-4000-8000-000000000001";
  const P2="00000000-0000-4000-8000-000000000002";
  const X="00000000-0000-4000-8000-000000000101";
  const A1="00000000-0000-4000-8000-000000000201";
  const A2="00000000-0000-4000-8000-000000000202";
  const persons=[
    {id:P1,activity_count:1,external_references:{namuwiki:{status:"linked"}},facets:{polities:[{id:X}]},activity_summaries:[{id:A1,polity:{id:X},start:{year:100},end:{year:120}}]},
    {id:P2,activity_count:0,external_references:{},facets:{polities:[{id:X}]},activity_summaries:[{id:A2,polity:{id:X},start:{year:130},end:{year:null}}]}
  ];
  const matrix=model.buildCompletenessMatrix({
    personResult:{persons},
    domainResult:null,
    spatialIndex:null
  });
  const byCode=Object.fromEntries(matrix.rows.map((row)=>[row.code,row]));
  assert.equal(matrix.person_check_count,3);
  assert.equal(matrix.activity_check_count,2);
  assert.equal(byCode.domain.available,false);
  assert.equal(byCode.domain.complete,null);
  assert.equal(byCode.domain.incomplete,null);
  assert.equal(byCode.domain.total,null);
  assert.equal(byCode.namuwiki.unit,"person");
  assert.equal(byCode.namuwiki.complete,1);
  assert.deepEqual(byCode.namuwiki.person_ids,[P2]);
  assert.equal(byCode.runtime_activity.incomplete,1);
  assert.deepEqual(byCode.runtime_activity.person_ids,[P2]);
  assert.equal(byCode.chronology.unit,"activity");
  assert.equal(byCode.chronology.complete,1);
  assert.equal(byCode.chronology.incomplete,1);
  assert.equal(byCode.chronology.person_ids,null);
  assert.equal(byCode.spatial.available,false);
  assert.equal(byCode.spatial.total,null);
});

test("Completeness Matrix Spatial row reuses the canonical Activity resolver", () => {
  const X="00000000-0000-4000-8000-000000000101";
  const A1="00000000-0000-4000-8000-000000000201";
  const A2="00000000-0000-4000-8000-000000000202";
  const persons=[{id:"p1",activity_count:2,external_references:{namuwiki:{status:"not_found"}},facets:{polities:[{id:X}]},activity_summaries:[
    {id:A1,polity:{id:X},start:{year:100},end:{year:120}},
    {id:A2,polity:{id:X},start:{year:130},end:{year:150}}
  ]}];
  const spatialIndex={
    schema:spatialModel.SPATIAL_INDEX_SCHEMA,
    polity_geography:{[X]:"europe"},
    polity_subregions:{[X]:"western-europe"},
    place_function_records:[],
    review_queue:[],
    activity_spatial_overrides:[]
  };
  const matrix=model.buildCompletenessMatrix({personResult:{persons},domainResult:{by_person_id:{p1:"governance"}},spatialIndex});
  const spatial=matrix.rows.find((row)=>row.code==="spatial");
  assert.equal(spatial.available,true);
  assert.equal(spatial.unit,"activity");
  assert.equal(spatial.complete,2);
  assert.equal(spatial.incomplete,0);
  assert.equal(spatial.percentage,100);
});

test("Completeness Matrix only drills down exact Person target sets and never converts Activity counts into Person targets", () => {
  assert.match(dashboardSource,/COMPLETENESS MATRIX/);
  assert.match(dashboardSource,/data-dashboard-completeness/);
  assert.match(dashboardSource,/item\.unit !== "person"/);
  assert.match(dashboardSource,/code:\x60completeness_\$\{item\.code\}\x60/);
  assert.match(dashboardSource,/Person과 Activity 단위를 합산하지 않음/);
  assert.doesNotMatch(dashboardSource,/fetch\s*\(/);
});

test("Completeness Matrix is derived from existing canonical snapshots without a new source", () => {
  assert.match(fs.readFileSync(new URL("../atlas-dashboard-model.js",import.meta.url),"utf8"),/function buildCompletenessMatrix/);
  assert.doesNotMatch(storeSource,/completeness/i);
});


test("Recent Activity Timeline reuses normalized Recent Delta and sorts canonical events newest-first", () => {
  const delta=model.buildRecentDelta({
    rows:[
      {occurred_at:"2026-09-19T01:00:00.000Z",kind:"authoring",operation:"create_activity",person_id:"p1",display_name:"인물 1",change_count:1},
      {occurred_at:"2026-09-19T03:00:00.000Z",kind:"profile",operation:"set_person_external_reference",person_id:"p2",display_name:"인물 2",change_count:2},
      {occurred_at:"2026-09-19T02:00:00.000Z",kind:"correction",operation:"relationship_correction",person_id:null,display_name:null,change_count:3}
    ],
    coverage:{authoring:true,profile:true,correction:true,merge:false,delete_person:false,delete_person_reason:"PERSON_DELETE_IMMUTABLE_AUDIT_NOT_EXPOSED"}
  });
  const timeline=model.buildRecentActivityTimeline(delta);
  assert.equal(timeline.available,true);
  assert.deepEqual(timeline.entries.map((entry)=>entry.kind),["profile","correction","authoring"]);
  assert.equal(timeline.event_count,3);
  assert.equal(timeline.total_change_count,6);
  assert.equal(timeline.person_scoped_count,2);
  assert.equal(timeline.project_wide_count,1);
  assert.equal(timeline.latest_at,"2026-09-19T03:00:00.000Z");
  assert.deepEqual(timeline.tracked_sources,["authoring","profile","correction"]);
  assert.deepEqual(timeline.gaps,["PERSON_DELETE_IMMUTABLE_AUDIT_NOT_EXPOSED"]);
});

test("Recent Activity Timeline aggregates event and change counts by canonical mutation kind without a new source", () => {
  const timeline=model.buildRecentActivityTimeline({
    available:true,
    rows:[
      {occurred_at:"2026-09-19T03:00:00.000Z",kind:"profile",operation:"a",label:"A",person_id:"p1",display_name:"P1",change_count:1},
      {occurred_at:"2026-09-19T02:00:00.000Z",kind:"profile",operation:"b",label:"B",person_id:"p2",display_name:"P2",change_count:2},
      {occurred_at:"2026-09-19T01:00:00.000Z",kind:"merge",operation:"c",label:"C",person_id:"p3",display_name:"P3",change_count:1}
    ],
    tracked_sources:["profile","merge"],
    gaps:[]
  });
  assert.deepEqual(timeline.kind_summary,[
    {kind:"profile",event_count:2,change_count:3},
    {kind:"merge",event_count:1,change_count:1}
  ]);
  assert.doesNotMatch(storeSource,/recentActivityTimeline|recent-activity-timeline/i);
});

test("Recent Activity Timeline preserves unavailable Recent Delta as unknown instead of zero activity", () => {
  const timeline=model.buildRecentActivityTimeline({
    available:false,
    rows:[],
    tracked_sources:[],
    gaps:["RECENT_DELTA_SOURCE_UNAVAILABLE"]
  });
  assert.equal(timeline.available,false);
  assert.equal(timeline.event_count,null);
  assert.equal(timeline.total_change_count,null);
  assert.equal(timeline.person_scoped_count,null);
  assert.equal(timeline.project_wide_count,null);
  assert.deepEqual(timeline.gaps,["RECENT_DELTA_SOURCE_UNAVAILABLE"]);
});

test("Dashboard replaces duplicate Recent Delta cards with one timeline view while retaining coverage metadata", () => {
  assert.match(dashboardSource,/RECENT ACTIVITY TIMELINE/);
  assert.match(dashboardSource,/dashboard-timeline-entry/);
  assert.match(dashboardSource,/timeline\.person_scoped_count/);
  assert.match(dashboardSource,/Coverage gap/);
  assert.doesNotMatch(dashboardSource,/function recentDeltaCard/);
  assert.doesNotMatch(dashboardSource,/fetch\s*\(/);
});

test("Dashboard only expands shared source details when a source is not ready", () => {
  assert.match(dashboardSource, /sourceIssues = \(snapshot\.sources \|\| \[\]\)\.filter\(\(source\) => source\?\.status !== "ready"\)/);
  assert.match(dashboardSource, /SOURCE ISSUES/);
  assert.match(dashboardSource, /sourceIssues\.map\(sourceCard\)/);
  assert.doesNotMatch(dashboardSource, /<p class="eyebrow">SOURCE HEALTH<\/p><h3>기준 원본 상태<\/h3>/);
  assert.doesNotMatch(dashboardSource, /snapshot\.sources\.map\(sourceCard\)/);
});

test("Incomplete Reasons suppresses known zero-work cards but preserves unknown reason sources", () => {
  assert.match(dashboardSource, /function shouldRenderBreakdown\(item\)/);
  assert.match(dashboardSource, /item\?\.total == null\) return item\?\.available !== true/);
  assert.match(dashboardSource, /return Number\(item\.total\) > 0/);
  assert.match(dashboardSource, /incompleteCards\.map\(\(\[label,item\]\) => breakdownCard\(label,item\)\)/);
});

test("single lower Dashboard panel expands across the full lower grid", () => {
  assert.match(dashboardCssSource, /dashboard-lower-grid>\.dashboard-panel:only-child\{grid-column:1\/-1\}/);
});

test("Dashboard keeps actionable work panels ahead of large analysis surfaces", () => {
  const work = dashboardSource.indexOf("WORK FRONTIER");
  const quality = dashboardSource.indexOf("DATA QUALITY");
  const completeness = dashboardSource.indexOf("COMPLETENESS MATRIX");
  const heatmap = dashboardSource.indexOf("ERA × REGION COVERAGE");
  const timeline = dashboardSource.indexOf("RECENT DELTA · RECENT ACTIVITY TIMELINE");
  assert.ok(work >= 0 && quality > work);
  assert.ok(completeness > quality && heatmap > completeness && timeline > heatmap);
});

test("mobile Dashboard reduces table travel and caps timeline height without dropping data", () => {
  assert.match(dashboardCssSource, /@media\(max-width:600px\)\{\.dashboard-heatmap\{min-width:760px;font-size:9px\}/);
  assert.match(dashboardCssSource, /\.dashboard-completeness\{min-width:540px;font-size:9px\}/);
  assert.match(dashboardCssSource, /\.dashboard-timeline\{max-height:360px;overflow:auto;overscroll-behavior:contain;padding-right:4px\}/);
  assert.match(dashboardCssSource, /scrollbar-gutter:stable/);
  assert.match(dashboardSource, /timeline\.entries\.map\(recentTimelineEntry\)/);
});


test("Source Freshness separates intrinsic source timestamps from browser read timestamps", () => {
  const freshness=model.buildSourceFreshness({
    spatialIndex:{generated_at:"2026-09-18T14:08:00.000Z"},
    recentDelta:{available:true,latest_at:"2026-09-19T03:00:00.000Z"},
    sourceStates:{
      persons:{label:"Person Runtime",status:"ready",loaded_at:"2026-09-19T05:00:00.000Z"},
      personDomains:{label:"Person Domain",status:"ready",loaded_at:"2026-09-19T05:00:01.000Z"},
      spatialIndex:{label:"Spatial Index",status:"ready",loaded_at:"2026-09-19T05:00:02.000Z"},
      nonTimeline:{label:"Non-timeline Registry",status:"ready",loaded_at:"2026-09-19T05:00:03.000Z"},
      recentDelta:{label:"Recent Delta",status:"ready",loaded_at:"2026-09-19T05:00:04.000Z"},
      systemIdentity:{label:"Runtime Identity",status:"ready",loaded_at:"2026-09-19T05:00:05.000Z"}
    }
  });
  const byKey=Object.fromEntries(freshness.rows.map((row)=>[row.key,row]));
  assert.equal(freshness.total_sources,6);
  assert.equal(freshness.data_timestamp_known,2);
  assert.equal(freshness.data_timestamp_unknown,4);
  assert.equal(freshness.read_timestamp_known,6);
  assert.equal(byKey.spatialIndex.data_at,"2026-09-18T14:08:00.000Z");
  assert.equal(byKey.spatialIndex.data_basis,"generated_at");
  assert.equal(byKey.recentDelta.data_at,"2026-09-19T03:00:00.000Z");
  assert.equal(byKey.recentDelta.data_basis,"latest_tracked_mutation");
  assert.equal(byKey.persons.data_at,null);
  assert.equal(byKey.persons.read_at,"2026-09-19T05:00:00.000Z");
  assert.equal(byKey.persons.data_timestamp_unavailable_reason,"PERSON_RUNTIME_DATA_TIMESTAMP_NOT_EXPOSED");
});

test("Source Freshness never promotes loaded_at into canonical data freshness", () => {
  const freshness=model.buildSourceFreshness({
    spatialIndex:null,
    recentDelta:{available:false,latest_at:null},
    sourceStates:{
      persons:{label:"Person Runtime",status:"ready",loaded_at:"2026-09-19T05:00:00.000Z"},
      recentDelta:{label:"Recent Delta",status:"error",loaded_at:null}
    }
  });
  const byKey=Object.fromEntries(freshness.rows.map((row)=>[row.key,row]));
  assert.equal(byKey.persons.data_at,null);
  assert.equal(byKey.persons.data_timestamp_known,false);
  assert.equal(byKey.persons.read_timestamp_known,true);
  assert.equal(byKey.recentDelta.data_at,null);
  assert.equal(byKey.recentDelta.data_timestamp_unavailable_reason,"RECENT_DELTA_SOURCE_UNAVAILABLE");
});

test("Dashboard Source Freshness exposes source timestamp basis and last read without arbitrary stale thresholds", () => {
  assert.match(dashboardSource,/SOURCE FRESHNESS/);
  assert.match(dashboardSource,/SOURCE TIMESTAMP/);
  assert.match(dashboardSource,/LAST READ/);
  assert.match(dashboardSource,/Source timestamp와 browser last read를 구분/);
  assert.match(dashboardSource,/임의 fresh\/stale 판정 없음/);
  assert.doesNotMatch(dashboardSource,/stale_after|freshness_threshold|hours_old|days_old/i);
  assert.doesNotMatch(dashboardSource,/fetch\s*\(/);
});

test("Source Freshness derives from existing sourceStates and canonical payload timestamps without a new store source", () => {
  const dashboardModelSource=fs.readFileSync(new URL("../atlas-dashboard-model.js",import.meta.url),"utf8");
  assert.match(dashboardModelSource,/function buildSourceFreshness/);
  assert.match(dashboardModelSource,/spatialIndex\?\.generated_at/);
  assert.match(dashboardModelSource,/recentDelta\?\.latest_at/);
  assert.doesNotMatch(storeSource,/sourceFreshness|source-freshness/i);
});
