import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const meanwhile = require("../atlas-person-spacetime-meanwhile.js");

function segment(activityId, region, start, end, relation = "rules") {
  return {
    activity_id: activityId,
    macroregion_code: region,
    start_ordinal: start,
    end_ordinal: end,
    relation_code: relation,
    activity: { id: activityId, polity: { display_name: activityId } }
  };
}

test("Meanwhile uses active primary Activities at the selected historical ordinal", () => {
  const tracks = [
    { person_id: "p1", display_name: "One", primary_segments: [segment("a1", "europe", 10, 20)], counterparty_segments: [segment("enemy", "west-asia", 10, 20, "opposes")] },
    { person_id: "p2", display_name: "Two", primary_segments: [segment("a2", "europe", 15, 25)] },
    { person_id: "p3", display_name: "Three", primary_segments: [segment("a3", "africa", 21, 30)] }
  ];
  const result = meanwhile.summarize(tracks, 18, ["europe", "africa", "west-asia"]);
  assert.equal(result.activity_count, 2);
  assert.equal(result.unique_person_count, 2);
  assert.deepEqual(result.person_ids, ["p1", "p2"]);
  assert.deepEqual(result.entries.map((entry) => entry.activity_id).sort(), ["a1", "a2"]);
  assert.deepEqual(result.region_counts, [
    { code: "europe", unique_person_count: 2 },
    { code: "africa", unique_person_count: 0 },
    { code: "west-asia", unique_person_count: 0 }
  ]);
});

test("Meanwhile preserves simultaneous Activities but counts each Person once per region", () => {
  const tracks = [
    { person_id: "p1", display_name: "One", primary_segments: [
      segment("a1", "europe", 10, 20),
      segment("a2", "europe", 12, 18)
    ] },
    { person_id: "p2", display_name: "Two", primary_segments: [segment("a3", "africa", 10, 20)] }
  ];
  const result = meanwhile.summarize(tracks, 15, ["europe", "africa"]);
  assert.equal(result.activity_count, 3);
  assert.equal(result.unique_person_count, 2);
  assert.deepEqual(result.region_counts, [
    { code: "europe", unique_person_count: 1 },
    { code: "africa", unique_person_count: 1 }
  ]);
});

test("Activity interval boundaries are inclusive", () => {
  const s = segment("a1", "europe", -10, -5);
  assert.equal(meanwhile.activeAtOrdinal(s, -10), true);
  assert.equal(meanwhile.activeAtOrdinal(s, -5), true);
  assert.equal(meanwhile.activeAtOrdinal(s, -4), false);
});

import { readFileSync } from "node:fs";

const viewSource = readFileSync(new URL("../atlas-person-spacetime-view.js", import.meta.url), "utf8");
const viewCss = readFileSync(new URL("../atlas-person-spacetime-view.css", import.meta.url), "utf8");

test("Production renderer exposes selected-moment line, regional summary, Activity list, and active highlighting", () => {
  assert.match(viewSource, /atlas-person-spacetime-meanwhile\.js\?v=20260902-active-activity/);
  assert.match(viewSource, /function setMeanwhileYear\(/);
  assert.match(viewSource, /historicalYearForScreenY/);
  assert.match(viewSource, /function renderMeanwhile\(/);
  assert.match(viewSource, /spacetime-meanwhile-regions/);
  assert.match(viewSource, /data-spacetime-meanwhile-person/);
  assert.match(viewSource, /spacetime-meanwhile-line/);
  assert.match(viewSource, /is-meanwhile-active/);
  assert.match(viewSource, /compiled\.partitioned\.tracks,\s*meanwhileOrdinal/s);
  assert.match(viewCss, /\.spacetime-meanwhile-line/);
  assert.match(viewCss, /\.spacetime-track-label\.is-meanwhile-active/);
  assert.match(viewCss, /\.spacetime-track-rail\.is-meanwhile-active/);
  assert.match(viewCss, /\.spacetime-activity-glyph\.is-meanwhile-active/);
});
