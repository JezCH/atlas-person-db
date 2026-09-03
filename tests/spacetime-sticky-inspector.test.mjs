import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require=createRequire(import.meta.url);
const inspector=require("../atlas-person-spacetime-inspector.js");

function segment(id,start,end,classification="primary",extra={}) {
  return {
    stable_id:`${id}:${start}:${end}:${classification}`,
    activity_id:id,
    start_ordinal:start,
    end_ordinal:end,
    political_spatial_class:classification,
    activity:{
      id,
      polity:{display_name:`Polity ${id}`},
      relation:{code:classification==="counterparty"?"opposes":"rules",display_name:classification},
      role:{code:"leader",display_name:"Leader"},
      start:{year:start < 0 ? start : start+1},
      end:{year:end < 0 ? end : end+1}
    },
    spatial_precision:"place",
    historical_source_refs:["H"],
    display_source_refs:["D"],
    ...extra
  };
}

test("inspector groups multiple spatial slices under one Activity identity",()=>{
  const track={
    primary_segments:[
      segment("a1",10,19,"primary",{place_name:"Rome"}),
      segment("a1",20,29,"primary",{place_name:"Constantinople"})
    ]
  };
  const groups=inspector.groupActivities(track);
  assert.equal(groups.length,1);
  assert.equal(groups[0].activity_id,"a1");
  assert.equal(groups[0].segments.length,2);
  assert.deepEqual(groups[0].segments.map(s=>s.place_name),["Rome","Constantinople"]);
  assert.equal(groups[0].midpoint_ordinal,19);
});

test("Person extent spans all Activities while Activity midpoint stays Activity-specific",()=>{
  const track={primary_segments:[segment("a1",10,20),segment("a2",100,120)]};
  assert.deepEqual(inspector.personExtent(track),{start_ordinal:10,end_ordinal:120});
  assert.equal(inspector.activityMidpointOrdinal(track,"a1"),15);
  assert.equal(inspector.activityMidpointOrdinal(track,"a2"),110);
});

test("counterparty Activity stays inspectable without becoming primary placement",()=>{
  const track={
    primary_segments:[segment("a1",10,20)],
    counterparty_segments:[segment("a2",12,18,"counterparty")]
  };
  const groups=inspector.groupActivities(track);
  assert.equal(groups.length,2);
  assert.deepEqual(groups.find(g=>g.activity_id==="a2").classifications,["counterparty"]);
});

test("source refs are consolidated without losing placement slices",()=>{
  const track={primary_segments:[
    segment("a1",10,15,"primary",{historical_source_refs:["H1"],display_source_refs:["D1"]}),
    segment("a1",16,20,"primary",{historical_source_refs:["H2"],display_source_refs:["D1"]})
  ]};
  const group=inspector.groupActivities(track)[0];
  assert.deepEqual(group.source_refs,["D1","H1","H2"]);
  assert.equal(inspector.placementSlices(group).length,2);
});

const view=readFileSync(new URL("../atlas-person-spacetime-view.js",import.meta.url),"utf8");
const css=readFileSync(new URL("../atlas-person-spacetime-view.css",import.meta.url),"utf8");

test("Production view uses right sticky Person/Activity inspector and distinct Activity selection state",()=>{
  assert.match(view,/atlas-person-spacetime-inspector\.js\?v=20260903-c8/);
  assert.match(view,/let selectedActivityId = null/);
  assert.match(view,/let selectedTimeOrdinal = null/);
  assert.match(view,/function selectActivity\(/);
  assert.match(view,/data-spacetime-activity=/);
  assert.match(view,/spacetime-sticky-inspector/);
  assert.doesNotMatch(view,/class="spacetime-selection" id="spacetimeSelection"/);
  assert.match(css,/\.spacetime-sticky-inspector\{[^}]*position:sticky/);
  assert.match(css,/\.spacetime-workspace\{[^}]*grid-template-columns/);
});

test("C8 selection computes Activity midpoint but does not yet mutate Meanwhile state",()=>{
  const start=view.indexOf("function selectActivity(");
  const end=view.indexOf("\n  function",start+10);
  const body=view.slice(start,end);
  assert.match(body,/selectedActivityId/);
  assert.match(body,/selectedTimeOrdinal/);
  assert.doesNotMatch(body,/meanwhileYear\s*=/);
});
