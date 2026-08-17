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

test("century ticks use conventional BC and AD labels without year zero or AD 101 drift", () => {
  const ticks = model.buildCenturyTicks(-200, 201);
  assert.deepEqual(ticks.map((tick) => tick.year), [-200, -100, 1, 100, 200, 201]);
  assert.deepEqual(ticks.map((tick) => tick.label), ["BC 200", "BC 100", "AD 1", "AD 100", "AD 200", "AD 201"]);
  assert.equal(ticks.some((tick) => tick.year === 0), false);
  assert.equal(ticks.some((tick) => tick.year === 101), false);
});

test("century ticks preserve non-century endpoints while keeping interior labels conventional", () => {
  assert.deepEqual(model.buildCenturyTicks(-250, -50).map((tick) => tick.year), [-250, -200, -100, -50]);
  assert.deepEqual(model.buildCenturyTicks(101, 250).map((tick) => tick.year), [101, 200, 250]);
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
