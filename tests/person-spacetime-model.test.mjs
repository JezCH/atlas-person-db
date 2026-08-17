import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const model = require("../atlas-person-spacetime-model.js");

function geographyIndex(region = "east-asia") {
  return {
    schema: model.SPATIAL_INDEX_SCHEMA,
    polity_geography: { "polity-a": region },
    capital_records: [],
    review_queue: []
  };
}

function capitalIndex() {
  return {
    schema: model.SPATIAL_INDEX_SCHEMA,
    polity_geography: {},
    capital_records: [{
      polity_id: "polity-a",
      capital_periods: [
        { start_year: 100, end_year: 109, capital_name: "Old Capital", region_code: "west-asia", confidence: "well_established", source_refs: ["source:old"] },
        { start_year: 110, end_year: 130, capital_name: "New Capital", region_code: "east-asia", confidence: "well_established", source_refs: ["source:new"] }
      ]
    }],
    review_queue: []
  };
}

test("historical timeline has no year zero", () => {
  assert.equal(model.historicalYearToOrdinal(-1), -1);
  assert.equal(model.historicalYearToOrdinal(1), 0);
  assert.equal(model.historicalYearToOrdinal(0), null);
  assert.equal(model.ordinalToHistoricalYear(-1), -1);
  assert.equal(model.ordinalToHistoricalYear(0), 1);
  assert.equal(model.yearLabel(-1), "BC 1");
  assert.equal(model.yearLabel(1), "AD 1");
});

test("century ticks use calendar centuries across BC and AD", () => {
  const ticks = model.buildCenturyTicks(-250, 250);
  assert.deepEqual(ticks.filter((tick) => !tick.terminal).map((tick) => tick.year), [-200, -100, 1, 100, 200]);
  assert.equal(ticks.at(-1).year, 250);
  assert.equal(ticks.at(-1).terminal, true);
  assert.equal(ticks.some((tick) => tick.year === 0), false);
});

test("reviewed polity geography places an activity without capital data", () => {
  const lookup = model.createSpatialLookup(geographyIndex("east-asia"));
  const placement = model.resolveActivityPlacement({ id: "activity-a", polity: { id: "polity-a" }, start: { year: 100 }, end: { year: 120 } }, lookup);
  assert.equal(placement.status, "placed");
  assert.equal(placement.segments.length, 1);
  assert.equal(placement.segments[0].region_code, "east-asia");
  assert.equal(placement.segments[0].placement_basis, "polity_geography");
  assert.equal(placement.segments[0].start_year, 100);
  assert.equal(placement.segments[0].end_year, 120);
});

test("missing reviewed spatial record never guesses a placement", () => {
  const lookup = model.createSpatialLookup({ schema: model.SPATIAL_INDEX_SCHEMA, polity_geography: {}, capital_records: [], review_queue: [] });
  const placement = model.resolveActivityPlacement({ id: "activity-a", polity: { id: "polity-a" }, start: { year: 100 }, end: { year: 120 } }, lookup);
  assert.equal(placement.status, "spatial_unresolved");
  assert.deepEqual(placement.segments, []);
});

test("partial and reversed chronology remain review-required", () => {
  const lookup = model.createSpatialLookup(geographyIndex());
  const partial = model.resolveActivityPlacement({ id: "partial", polity: { id: "polity-a" }, start: { year: 110 }, end: { year: null } }, lookup);
  const reversed = model.resolveActivityPlacement({ id: "reversed", polity: { id: "polity-a" }, start: { year: 130 }, end: { year: 110 } }, lookup);
  assert.equal(partial.status, "chronology_unresolved");
  assert.equal(partial.chronology_reason, "incomplete_boundary");
  assert.equal(reversed.status, "chronology_unresolved");
  assert.equal(reversed.chronology_reason, "reversed_boundaries");
});

test("a reviewed capital move splits only visual placement segments", () => {
  const lookup = model.createSpatialLookup(capitalIndex());
  const activity = { id: "activity-a", polity: { id: "polity-a" }, start: { year: 105 }, end: { year: 115 } };
  const placement = model.resolveActivityPlacement(activity, lookup);
  assert.equal(placement.status, "placed");
  assert.deepEqual(placement.segments.map((segment) => [segment.capital_name, segment.start_year, segment.end_year, segment.region_code]), [
    ["Old Capital", 105, 109, "west-asia"],
    ["New Capital", 110, 115, "east-asia"]
  ]);
  assert.equal(activity.start.year, 105);
  assert.equal(activity.end.year, 115);
});

test("capital records require reviewed source references", () => {
  const invalid = capitalIndex();
  invalid.capital_records[0].capital_periods[0].source_refs = [];
  const result = model.validateSpatialIndex(invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((message) => message.includes("source_refs")));
});

test("direct geography records reject unknown region codes", () => {
  const result = model.validateSpatialIndex(geographyIndex("middle-earth"));
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((message) => message.includes("invalid region_code")));
});

test("review queue cannot duplicate a resolved polity", () => {
  const invalid = geographyIndex();
  invalid.review_queue = [{ polity_id: "polity-a", canonical_key: "Polity A", reason: "review" }];
  const result = model.validateSpatialIndex(invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((message) => message.includes("already resolved")));
});

test("committed spatial index satisfies the reviewed placement contract", () => {
  const index = JSON.parse(readFileSync(new URL("../atlas-polity-spatial-index.json", import.meta.url), "utf8"));
  const result = model.validateSpatialIndex(index);
  assert.equal(result.valid, true, result.errors.join(" | "));
  assert.ok(Object.keys(index.polity_geography).length > 0);
  assert.ok(index.capital_records.length > 0);
});

test("collision lane assignment is deterministic and keeps overlapping cards apart", () => {
  const items = [
    { stable_id: "b", visual_top: 10, visual_bottom: 60 },
    { stable_id: "a", visual_top: 10, visual_bottom: 60 },
    { stable_id: "c", visual_top: 70, visual_bottom: 110 }
  ];
  const first = model.assignLanes(items, 6);
  const second = model.assignLanes(items.slice().reverse(), 6);
  assert.deepEqual(first.map(({ stable_id, lane }) => [stable_id, lane]), second.map(({ stable_id, lane }) => [stable_id, lane]));
  assert.equal(first.find((item) => item.stable_id === "a").lane, 0);
  assert.equal(first.find((item) => item.stable_id === "b").lane, 1);
  assert.equal(first.find((item) => item.stable_id === "c").lane, 0);
});
