import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const model = require("../atlas-person-spacetime-model.js");

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
  assert.equal(ticks.some((tick) => tick.label === "AD 101"), false);
});

test("empty reviewed capital index is valid and never guesses a placement", () => {
  const index = { schema: model.CAPITAL_INDEX_SCHEMA, records: [] };
  assert.equal(model.validateCapitalIndex(index).valid, true);
  const lookup = model.createCapitalLookup(index);
  const activity = {
    id: "activity-a",
    polity: { id: "polity-a" },
    start: { year: 100 },
    end: { year: 120 }
  };
  const placement = model.resolveActivityPlacement(activity, lookup);
  assert.equal(placement.status, "capital_unresolved");
  assert.deepEqual(placement.segments, []);
});

test("partial activity chronology never becomes a fake point-duration segment", () => {
  const index = {
    schema: model.CAPITAL_INDEX_SCHEMA,
    records: [{
      polity_id: "polity-a",
      capital_periods: [{
        start_year: 100,
        end_year: 140,
        capital_name: "Capital",
        capital_place_id: null,
        region_code: "east-asia",
        confidence: "well_established",
        source_refs: ["source:capital"]
      }]
    }]
  };
  const lookup = model.createCapitalLookup(index);
  const startOnly = model.resolveActivityPlacement({
    id: "activity-start-only",
    polity: { id: "polity-a" },
    start: { year: 110 },
    end: { year: null }
  }, lookup);
  const endOnly = model.resolveActivityPlacement({
    id: "activity-end-only",
    polity: { id: "polity-a" },
    start: { year: null },
    end: { year: 120 }
  }, lookup);

  for (const placement of [startOnly, endOnly]) {
    assert.equal(placement.status, "chronology_unresolved");
    assert.equal(placement.chronology_reason, "incomplete_boundary");
    assert.deepEqual(placement.segments, []);
  }
});

test("reversed activity chronology is review-required rather than silently plotted", () => {
  const lookup = model.createCapitalLookup({
    schema: model.CAPITAL_INDEX_SCHEMA,
    records: [{
      polity_id: "polity-a",
      capital_periods: [{
        start_year: 100,
        end_year: 140,
        capital_name: "Capital",
        region_code: "east-asia",
        confidence: "well_established",
        source_refs: ["source:capital"]
      }]
    }]
  });
  const placement = model.resolveActivityPlacement({
    id: "activity-reversed",
    polity: { id: "polity-a" },
    start: { year: 130 },
    end: { year: 110 }
  }, lookup);
  assert.equal(placement.status, "chronology_unresolved");
  assert.equal(placement.chronology_reason, "reversed_boundaries");
  assert.deepEqual(placement.segments, []);
});

test("a capital move splits only visual placement segments", () => {
  const index = {
    schema: model.CAPITAL_INDEX_SCHEMA,
    records: [{
      polity_id: "polity-a",
      capital_periods: [
        {
          start_year: 100,
          end_year: 109,
          capital_name: "Old Capital",
          capital_place_id: null,
          region_code: "west-asia",
          confidence: "well_established",
          source_refs: ["source:old"]
        },
        {
          start_year: 110,
          end_year: 130,
          capital_name: "New Capital",
          capital_place_id: null,
          region_code: "east-asia",
          confidence: "well_established",
          source_refs: ["source:new"]
        }
      ]
    }]
  };
  const lookup = model.createCapitalLookup(index);
  const activity = {
    id: "activity-a",
    polity: { id: "polity-a" },
    start: { year: 105 },
    end: { year: 115 }
  };
  const placement = model.resolveActivityPlacement(activity, lookup);
  assert.equal(placement.status, "placed");
  assert.equal(placement.segments.length, 2);
  assert.deepEqual(placement.segments.map((segment) => [segment.capital_name, segment.start_year, segment.end_year, segment.region_code]), [
    ["Old Capital", 105, 109, "west-asia"],
    ["New Capital", 110, 115, "east-asia"]
  ]);
  assert.equal(activity.start.year, 105);
  assert.equal(activity.end.year, 115);
});

test("capital records require reviewed source references", () => {
  const invalid = {
    schema: model.CAPITAL_INDEX_SCHEMA,
    records: [{
      polity_id: "polity-a",
      capital_periods: [{
        start_year: 100,
        end_year: 120,
        capital_name: "Unsourced Capital",
        region_code: "east-asia",
        confidence: "well_established",
        source_refs: []
      }]
    }]
  };
  const result = model.validateCapitalIndex(invalid);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((message) => message.includes("source_refs")));
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