import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const model = require("../atlas-person-spacetime-model.js");
const index = JSON.parse(readFileSync(new URL("../atlas-polity-spatial-index.json", import.meta.url), "utf8"));

const IDS = Object.freeze({
  byzantine: "074510f4-f2e7-5795-8cfb-2a4206fa7254",
  ottoman: "6d1520e2-0aff-5063-b2b7-95eb86daf372",
  kushan: "7ccd9ba0-28fb-55d7-8ae8-60de77c38603",
  hun: "9354d5c8-9a01-5021-af36-053adc967dba",
  daxi: "c40d4e85-38a3-59ab-b3f4-a618ffbde2e5",
  macedonian: "2f6e890f-1704-5c76-aa94-f18d7f905e06",
  omani: "68c83ef6-0023-5af9-a6e8-26ccf5b8e116",
  seleucid: "a1c6b0b4-ca71-420d-8d9f-502dc7914dd7",
  mongol: "d54c540c-f3fb-5d05-9dc0-26af4ee9815a"
});

function activity(polityId, startYear, endYear, id = "activity-test") {
  return { id, polity: { id: polityId }, start: { year: startYear }, end: { year: endYear } };
}

function contiguous(segments, startYear, endYear) {
  assert.ok(segments.length > 0);
  assert.equal(segments[0].start_year, startYear);
  assert.equal(segments.at(-1).end_year, endYear);
  for (let i = 1; i < segments.length; i += 1) {
    const previousEnd = model.historicalYearToOrdinal(segments[i - 1].end_year);
    const currentStart = model.historicalYearToOrdinal(segments[i].start_year);
    assert.equal(currentStart, previousEnd + 1, `gap/overlap between segment ${i - 1} and ${i}`);
  }
}

test("reviewed live spatial index snapshot validates and has expected coverage classes", () => {
  const validation = model.validateSpatialIndex(index);
  assert.equal(validation.valid, true, validation.errors.join(" | "));
  assert.equal(Object.keys(index.polity_geography).length, 325);
  assert.equal(index.capital_records.length, 8);
  assert.equal(index.review_queue.length, 5);
});

test("capital evidence contains no internal ATLAS reviewed placeholder references", () => {
  const refs = index.capital_records.flatMap((record) => record.capital_periods.flatMap((period) => period.source_refs || []));
  assert.equal(refs.some((ref) => String(ref).startsWith("ATLAS reviewed")), false);
  assert.equal(refs.every((ref) => String(ref).trim().length > 0), true);
});

test("Ottoman activity coverage is contiguous across reviewed capital transitions", () => {
  const lookup = model.createSpatialLookup(index);
  const osman = model.resolveActivityPlacement(activity(IDS.ottoman, 1299, 1324, "osman"), lookup);
  assert.equal(osman.status, "placed");
  assert.deepEqual(osman.segments.map((segment) => [segment.capital_name, segment.region_code, segment.start_year, segment.end_year]), [
    ["Söğüt", "west-asia", 1299, 1324]
  ]);
  contiguous(osman.segments, 1299, 1324);

  const mehmed = model.resolveActivityPlacement(activity(IDS.ottoman, 1451, 1481, "mehmed"), lookup);
  assert.equal(mehmed.status, "placed");
  assert.deepEqual(mehmed.segments.map((segment) => [segment.capital_name, segment.region_code, segment.start_year, segment.end_year]), [
    ["Edirne", "europe", 1451, 1452],
    ["Constantinople", "europe", 1453, 1481]
  ]);
  contiguous(mehmed.segments, 1451, 1481);
});

test("Byzantine transition has no duplicate or missing historical year", () => {
  const lookup = model.createSpatialLookup(index);
  const placement = model.resolveActivityPlacement(activity(IDS.byzantine, 1203, 1262, "byzantine-transition"), lookup);
  assert.equal(placement.status, "placed");
  assert.deepEqual(placement.segments.map((segment) => [segment.capital_name, segment.region_code, segment.start_year, segment.end_year]), [
    ["Constantinople", "europe", 1203, 1203],
    ["Nicaea", "west-asia", 1204, 1260],
    ["Constantinople", "europe", 1261, 1262]
  ]);
  contiguous(placement.segments, 1203, 1262);
});

test("formerly unresolved coarse polities now use reviewed broad placement", () => {
  const lookup = model.createSpatialLookup(index);
  const cases = [
    [IDS.kushan, "south-asia"],
    [IDS.hun, "europe"],
    [IDS.daxi, "east-asia"]
  ];
  for (const [polityId, region] of cases) {
    const placement = model.resolveActivityPlacement(activity(polityId, 100, 101, polityId), lookup);
    assert.equal(placement.status, "placed");
    assert.equal(placement.segments[0].placement_basis, "polity_geography");
    assert.equal(placement.segments[0].region_code, region);
  }
});

test("genuinely transregional live polities remain unresolved instead of being guessed", () => {
  const lookup = model.createSpatialLookup(index);
  for (const polityId of [IDS.macedonian, IDS.omani, IDS.seleucid, IDS.mongol]) {
    assert.equal(lookup.has(polityId), false);
    const placement = model.resolveActivityPlacement(activity(polityId, 100, 101, polityId), lookup);
    assert.equal(placement.status, "spatial_unresolved");
  }
});
