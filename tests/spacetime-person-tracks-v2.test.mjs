import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const tracks = require("../atlas-person-spacetime-person-tracks-v2.js");

function activity(id, startYear, endYear, relation = "rules") {
  return {
    id,
    start: { year: startYear },
    end: { year: endYear },
    polity: { id: `polity-${id}`, display_name: `Polity ${id}` },
    relation: { code: relation, display_name: relation },
    role: { code: `role-${id}`, display_name: `Role ${id}` }
  };
}

function compiled(activityId, segments) {
  return {
    activity_id: activityId,
    polity_id: `polity-${activityId}`,
    status: "placed",
    segments: segments.map((segment) => ({
      status: "placed",
      activity_id: activityId,
      polity_id: `polity-${activityId}`,
      macroregion_code: "europe",
      subregion_code: "western-europe",
      spatial_precision: "subregion",
      display_anchor_basis: "reviewed_subregion_center",
      historical_placement_basis: "polity_place_function",
      historical_confidence: "well_established",
      x_anchor: 0.2,
      x_min: 0.18,
      x_max: 0.22,
      ...segment
    }))
  };
}

test("one Person compiles to one track even when multiple Activities and placement segments exist", () => {
  const person = {
    id: "person-a",
    display_name: "인물 A",
    canonical_name_en: "Person A",
    activity_summaries: [
      activity("a1", 100, 110, "rules"),
      activity("a2", 120, 130, "serves")
    ]
  };
  const placements = [
    compiled("a1", [
      { start_year: 100, end_year: 105, x_anchor: 0.20 },
      { start_year: 106, end_year: 110, x_anchor: 0.21 }
    ]),
    compiled("a2", [{ start_year: 120, end_year: 130, x_anchor: 0.22 }])
  ];

  const result = tracks.compilePersonTracks([person], placements);
  assert.equal(result.tracks.length, 1);
  const track = result.tracks[0];
  assert.equal(track.person_id, "person-a");
  assert.equal(track.display_name, "인물 A");
  assert.equal(track.activity_count, 2);
  assert.equal(track.placed_activity_count, 2);
  assert.equal(track.segment_count, 3);
  assert.equal(track.segments.length, 3);
  assert.ok(track.segments.every((segment) => !Object.prototype.hasOwnProperty.call(segment, "display_name")));
});

test("track chronology and spatial extent are derived from segments without merging historical Activities", () => {
  const person = {
    id: "person-a",
    display_name: "인물 A",
    activity_summaries: [activity("later", 300, 320), activity("earlier", 200, 210)]
  };
  const result = tracks.compilePersonTrack(person, [
    compiled("later", [{ start_year: 300, end_year: 320, x_min: 0.4, x_max: 0.5 }]),
    compiled("earlier", [{ start_year: 200, end_year: 210, x_min: 0.1, x_max: 0.2 }])
  ]);

  assert.deepEqual(result.segments.map((segment) => segment.activity_id), ["earlier", "later"]);
  assert.equal(result.time_extent.start_year, 200);
  assert.equal(result.time_extent.end_year, 320);
  assert.equal(result.space_extent.min, 0.1);
  assert.equal(result.space_extent.max, 0.5);
});

test("counterparty relation is preserved as metadata but not reinterpreted by the Person track compiler", () => {
  const person = {
    id: "person-r",
    display_name: "저항 인물",
    activity_summaries: [activity("opp", 1919, 1920, "opposes")]
  };
  const track = tracks.compilePersonTrack(person, [compiled("opp", [{ start_year: 1919, end_year: 1920 }])]);
  assert.equal(track.segments.length, 1);
  assert.equal(track.segments[0].relation_code, "opposes");
  assert.equal(track.segments[0].is_counterparty_relation, true);
});

test("unresolved Activity never creates a fake track segment", () => {
  const person = {
    id: "person-u",
    display_name: "미해결 인물",
    activity_summaries: [activity("u1", 500, 510)]
  };
  const result = tracks.compilePersonTracks([person], [{ activity_id: "u1", status: "spatial_compile_unresolved", reason: "review_required", segments: [] }]);

  assert.equal(result.tracks.length, 0);
  assert.equal(result.unresolved_people.length, 1);
  assert.equal(result.unresolved_people[0].segment_count, 0);
  assert.equal(result.unresolved_activities.length, 1);
  assert.equal(result.unresolved_activities[0].reason, "review_required");
});

test("a partially placed Person remains renderable while unresolved Activities stay explicit", () => {
  const person = {
    id: "person-p",
    display_name: "부분 배치",
    activity_summaries: [activity("ok", 800, 810), activity("bad", 820, 830)]
  };
  const result = tracks.compilePersonTracks([person], [
    compiled("ok", [{ start_year: 800, end_year: 810 }]),
    { activity_id: "bad", status: "spatial_compile_unresolved", reason: "place_conflict", segments: [] }
  ]);

  assert.equal(result.tracks.length, 1);
  assert.equal(result.tracks[0].placed_activity_count, 1);
  assert.equal(result.tracks[0].unresolved_activities.length, 1);
  assert.equal(result.unresolved_activities[0].activity_id, "bad");
});

test("historical year zero is rejected instead of becoming a track coordinate", () => {
  const bad = activity("zero", 0, 10);
  assert.equal(tracks.activityChronology(bad), null);

  const person = { id: "person-zero", display_name: "연도 0", activity_summaries: [bad] };
  const result = tracks.compilePersonTrack(person, [compiled("zero", [{ start_year: 1, end_year: 10 }])]);
  assert.equal(result.status, "unresolved");
  assert.equal(result.segments.length, 0);
  assert.equal(result.unresolved_activities[0].reason, "chronology_unresolved");
});

test("multiple Persons remain separate tracks even when their Activities share the same coordinates", () => {
  const persons = [
    { id: "p1", display_name: "가", activity_summaries: [activity("a1", 1000, 1010)] },
    { id: "p2", display_name: "나", activity_summaries: [activity("a2", 1000, 1010)] }
  ];
  const result = tracks.compilePersonTracks(persons, [
    compiled("a1", [{ start_year: 1000, end_year: 1010, x_anchor: 0.3 }]),
    compiled("a2", [{ start_year: 1000, end_year: 1010, x_anchor: 0.3 }])
  ]);

  assert.equal(result.tracks.length, 2);
  assert.deepEqual(result.tracks.map((track) => track.person_id).sort(), ["p1", "p2"]);
  assert.equal(new Set(result.tracks.map((track) => track.track_id)).size, 2);
});