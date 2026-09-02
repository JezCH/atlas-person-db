import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const parity = require("../atlas-person-spacetime-data-parity.js");

function activity(overrides = {}) {
  return {
    id: "activity-1",
    polity: { id: "polity-1", display_name: "Polity" },
    relation: { id: "relation-1", code: "rules", display_name: "통치" },
    role: { id: "role-1", code: "king", display_name: "King" },
    start: { year: 100, month: 1, day: 2, granularity: "day", certainty: "exact", calendar: "julian" },
    end: { year: 120, month: 3, day: 4, granularity: "day", certainty: "exact", calendar: "julian" },
    ...overrides
  };
}

function person(activityValue = activity()) {
  return { id: "person-1", display_name: "One", activity_summaries: [activityValue] };
}

function compiled(activityValue = activity()) {
  return {
    tracks: [{
      person_id: "person-1",
      segments: [{ activity_id: activityValue.id, activity: activityValue }],
      unresolved_activities: []
    }],
    unresolved_people: []
  };
}

test("data parity passes when Person and Activity historical semantics are preserved", () => {
  const report = parity.verify([person()], compiled());
  assert.equal(report.ok, true);
  assert.equal(report.source_person_count, 1);
  assert.equal(report.compiled_person_count, 1);
  assert.equal(report.source_activity_count, 1);
  assert.equal(report.compiled_activity_count, 1);
  assert.deepEqual(report.temporal_boundary_delta, []);
  assert.deepEqual(report.polity_delta, []);
  assert.deepEqual(report.relation_delta, []);
  assert.deepEqual(report.role_delta, []);
});

test("unresolved chronology or placement still participates in parity", () => {
  const sourceActivity = activity();
  const report = parity.verify([person(sourceActivity)], {
    tracks: [],
    unresolved_people: [{
      person_id: "person-1",
      segments: [],
      unresolved_activities: [{ activity_id: sourceActivity.id, reason: "chronology_unresolved", activity: sourceActivity }]
    }]
  });
  assert.equal(report.ok, true);
});

test("full temporal boundary changes fail parity", () => {
  const sourceActivity = activity();
  const changed = activity({ start: { ...sourceActivity.start, day: 3 } });
  const report = parity.verify([person(sourceActivity)], compiled(changed));
  assert.equal(report.ok, false);
  assert.deepEqual(report.temporal_boundary_delta, ["activity-1"]);
});

test("Polity, relation, and role identity changes are reported independently", () => {
  const sourceActivity = activity();
  const changed = activity({
    polity: { id: "polity-2" },
    relation: { id: "relation-2", code: "governs" },
    role: { id: "role-2", code: "president" }
  });
  const report = parity.verify([person(sourceActivity)], compiled(changed));
  assert.equal(report.ok, false);
  assert.deepEqual(report.polity_delta, ["activity-1"]);
  assert.deepEqual(report.relation_delta, ["activity-1"]);
  assert.deepEqual(report.role_delta, ["activity-1"]);
});

test("missing Person and Activity identities fail closed", () => {
  const report = parity.verify([person()], { tracks: [], unresolved_people: [] });
  assert.equal(report.ok, false);
  assert.deepEqual(report.person_identity.missing, ["person-1"]);
  assert.deepEqual(report.activity_identity.missing, ["activity-1"]);
});

test("conflicting duplicate compiled Activity references fail closed", () => {
  const sourceActivity = activity();
  const changed = activity({ role: { id: "role-2", code: "president" } });
  const report = parity.verify([person(sourceActivity)], {
    tracks: [{
      person_id: "person-1",
      segments: [
        { activity_id: sourceActivity.id, activity: sourceActivity },
        { activity_id: changed.id, activity: changed }
      ],
      unresolved_activities: []
    }],
    unresolved_people: []
  });
  assert.equal(report.ok, false);
  assert.deepEqual(report.structural_errors.compiled_conflicting_activity_ids, ["activity-1"]);
});

const viewSource = readFileSync(new URL("../atlas-person-spacetime-view.js", import.meta.url), "utf8");

test("Production compile path enforces fail-closed data parity before political partitioning", () => {
  assert.match(viewSource, /atlas-person-spacetime-data-parity\.js\?v=20260902-final-parity/);
  assert.match(viewSource, /dataParity\.verify\(persons, compiledTracks\)/);
  assert.match(viewSource, /SPACETIME_DATA_PARITY_FAILED/);
  const parityIndex = viewSource.indexOf("dataParity.verify(persons, compiledTracks)");
  const partitionIndex = viewSource.indexOf("politicalPlacement.partitionTracks(compiledTracks)");
  assert.ok(parityIndex >= 0 && partitionIndex > parityIndex, "parity must run before political placement partitioning");
});
