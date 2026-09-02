import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const personTracks = require("../atlas-person-spacetime-person-tracks.js");
const viewSource = readFileSync(new URL("../atlas-person-spacetime-view.js", import.meta.url), "utf8");

test("Person Track preserves historical and display spatial evidence for the inspector", () => {
  const activity = {
    id: "activity-inspector-evidence",
    polity: { id: "polity-test", display_name: "Test Polity" },
    relation: { code: "rules" },
    role: { code: "king", display_name: "King" },
    start: { year: 100 },
    end: { year: 120 }
  };
  const placement = {
    activity_id: activity.id,
    polity_id: "polity-test",
    status: "placed",
    segments: [{
      status: "placed",
      activity_id: activity.id,
      polity_id: "polity-test",
      start_year: 100,
      end_year: 120,
      x_anchor: 0.5,
      x_min: 0.5,
      x_max: 0.5,
      macroregion_code: "europe",
      subregion_code: "italy",
      spatial_precision: "place",
      display_anchor_basis: "reviewed_place_point",
      place_function_type: "capital",
      place_name: "Rome",
      place_id: "place-rome",
      active_place_functions: [{
        function_type: "capital",
        place_name: "Rome",
        place_id: "place-rome",
        region_code: "europe",
        confidence: "well_established",
        source_refs: ["Historical source", "Historical source"]
      }],
      display_place_points: [{
        place_id: "place-rome",
        place_name: "Rome",
        function_type: "capital",
        macroregion_code: "europe",
        subregion_code: "italy",
        x_anchor: 0.5,
        display_anchor_basis: "reviewed_place_point",
        display_source_refs: ["Display source"]
      }],
      historical_placement_basis: "polity_place_function",
      historical_confidence: "well_established",
      historical_source_refs: ["Historical source"],
      display_confidence: "reviewed",
      display_source_refs: ["Display source"]
    }]
  };

  const track = personTracks.compilePersonTrack({
    id: "person-test",
    display_name: "Test Person",
    activity_summaries: [activity]
  }, [placement]);
  const segment = track.segments[0];

  assert.equal(segment.spatial_precision, "place");
  assert.equal(segment.place_name, "Rome");
  assert.equal(segment.place_id, "place-rome");
  assert.deepEqual(segment.historical_source_refs, ["Historical source"]);
  assert.equal(segment.display_confidence, "reviewed");
  assert.deepEqual(segment.display_source_refs, ["Display source"]);
  assert.deepEqual(segment.active_place_functions[0].source_refs, ["Historical source"]);
  assert.deepEqual(segment.display_place_points[0].display_source_refs, ["Display source"]);
});

test("selected Person inspector renders precision, Place evidence, and both provenance layers", () => {
  assert.match(viewSource, /function spatialPrecisionLabel\(/);
  assert.match(viewSource, /function renderSelectionEvidence\(/);
  assert.match(viewSource, /spacetime-selection-evidence/);
  assert.match(viewSource, /공간 정밀도/);
  assert.match(viewSource, /Place evidence/);
  assert.match(viewSource, /역사 배치 근거/);
  assert.match(viewSource, /표시 정밀도 근거/);
  assert.match(viewSource, /historical_source_refs/);
  assert.match(viewSource, /display_source_refs/);
  assert.match(viewSource, /active_place_functions/);
});
