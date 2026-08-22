import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const political = require("../atlas-person-spacetime-political-placement-v2.js");

function segment(id, relation, xMin, xMax, start = 100, end = 110) {
  return Object.freeze({
    stable_id: id,
    activity_id: id,
    relation_code: relation,
    start_ordinal: start,
    end_ordinal: end,
    x_anchor: (xMin + xMax) / 2,
    x_min: xMin,
    x_max: xMax
  });
}

function track(id, segments) {
  return Object.freeze({
    track_id: id,
    person_id: id,
    display_name: id,
    status: "placed",
    segments: Object.freeze(segments)
  });
}

test("relation classification keeps own-side placement and counterparty semantics separate", () => {
  for (const relation of ["rules", "governs", "serves", "active_in", "claims_rule"]) {
    assert.equal(political.classifyRelation(relation), "primary", relation);
  }
  assert.equal(political.classifyRelation("opposes"), "counterparty");
  assert.equal(political.classifyRelation(""), "unclassified");
  assert.equal(political.classifyRelation("future_relation"), "unclassified");
});

test("opponent-only Person gets no primary spatial placement even when opponent has a valid coordinate", () => {
  const source = track("opponent-only", [segment("opp", "opposes", 0.75, 0.80)]);
  const result = political.partitionTrack(source);

  assert.equal(result.primary_spatial_status, "unresolved");
  assert.equal(result.primary_segments.length, 0);
  assert.equal(result.counterparty_segments.length, 1);
  assert.equal(result.primary_space_extent, null);
  assert.equal(result.counterparty_overlay_available, true);
});

test("mixed own-side and opposed Activities derive primary extent only from own-side segments", () => {
  const source = track("mixed", [
    segment("own", "active_in", 0.10, 0.20, 200, 210),
    segment("opp", "opposes", 0.80, 0.90, 200, 210)
  ]);
  const result = political.partitionTrack(source);

  assert.equal(result.primary_spatial_status, "placed");
  assert.deepEqual(result.primary_segments.map((item) => item.activity_id), ["own"]);
  assert.deepEqual(result.counterparty_segments.map((item) => item.activity_id), ["opp"]);
  assert.deepEqual(result.primary_space_extent, { min: 0.1, max: 0.2 });
  assert.deepEqual(result.primary_time_extent, { min: 200, max: 210 });
});

test("claims_rule is own-side primary placement but remains distinguishable by relation metadata", () => {
  const result = political.partitionTrack(track("claimant", [segment("claim", "claims_rule", 0.3, 0.4)]));
  assert.equal(result.primary_segments.length, 1);
  assert.equal(result.primary_segments[0].relation_code, "claims_rule");
  assert.equal(result.primary_segments[0].political_spatial_class, "primary");
});

test("unknown relation is never silently promoted to primary placement", () => {
  const result = political.partitionTrack(track("unknown", [segment("mystery", "custom_relation", 0.4, 0.5)]));
  assert.equal(result.primary_spatial_status, "unresolved");
  assert.equal(result.primary_segments.length, 0);
  assert.equal(result.unclassified_segments.length, 1);
  assert.equal(result.requires_relation_review, true);
});

test("partitionTracks separates primary-renderable tracks from primary-unresolved tracks while retaining source review queues", () => {
  const source = {
    tracks: [
      track("own", [segment("own-a", "serves", 0.1, 0.2)]),
      track("opp", [segment("opp-a", "opposes", 0.7, 0.8)]),
      track("review", [segment("review-a", "unknown_relation", 0.5, 0.6)])
    ],
    unresolved_people: [{ person_id: "source-unresolved" }],
    unresolved_activities: [{ person_id: "own", activity_id: "missing" }]
  };
  const result = political.partitionTracks(source);

  assert.deepEqual(result.tracks.map((item) => item.person_id), ["own"]);
  assert.deepEqual(result.primary_unresolved.map((item) => item.person_id), ["opp", "review"]);
  assert.deepEqual(result.relation_review.map((item) => item.person_id), ["review"]);
  assert.deepEqual(result.source_unresolved_people, source.unresolved_people);
  assert.deepEqual(result.source_unresolved_activities, source.unresolved_activities);
});

test("counterparty segments remain intact for later overlay instead of being deleted", () => {
  const opponent = segment("opposed-polity", "opposes", 0.6, 0.7, 400, 405);
  const result = political.partitionTrack(track("p", [opponent]));
  assert.equal(result.counterparty_segments[0].stable_id, opponent.stable_id);
  assert.equal(result.counterparty_segments[0].x_anchor, opponent.x_anchor);
  assert.equal(result.counterparty_segments[0].start_ordinal, opponent.start_ordinal);
  assert.equal(result.counterparty_segments[0].end_ordinal, opponent.end_ordinal);
});