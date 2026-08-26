import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const spaceAxis = require("../atlas-person-spacetime-space-axis.js");
const timeProjection = require("../atlas-person-spacetime-time-projection.js");

const contract = JSON.parse(readFileSync(new URL("./fixtures/spacetime-completion-contract.json", import.meta.url), "utf8"));
const fixtures = JSON.parse(readFileSync(new URL("./fixtures/spacetime-acceptance-fixtures.json", import.meta.url), "utf8"));
const contractDoc = readFileSync(new URL("../docs/spacetime-completion-contract.md", import.meta.url), "utf8");

function capabilityMap() {
  return new Map(contract.capabilities.map((item) => [item.id, item]));
}

test("P1-P14 foundation completion cannot be mistaken for final product completion", () => {
  assert.equal(contract.schema, "atlas-spacetime-completion-contract/v1");
  assert.equal(contract.foundation_track.name, "P1-P14");
  assert.equal(contract.foundation_track.status, "completed");
  assert.equal(contract.foundation_track.sufficient_for_final_completion, false);
  assert.equal(contract.final_completion_rule.required_capability_status, "locked");
  assert.equal(contract.final_completion_rule.allow_pending_required_capabilities, false);
  assert.match(contractDoc, /Finishing P1–P14 does not mean/);
});

test("completion contract preserves every required final capability instead of silently weakening scope", () => {
  const capabilities = capabilityMap();
  const requiredIds = [
    "single-production-renderer",
    "semantic-time-projection",
    "stable-macroregion-world-x",
    "continuous-space-camera",
    "spatial-subregion-precision",
    "spatial-place-precision",
    "spatial-multi-place-preservation",
    "precision-not-greater-than-evidence",
    "search-coordinate-invariance",
    "zoom-coordinate-invariance",
    "opposes-counterparty-only",
    "label-historical-y-invariance",
    "dense-label-zero-overlap",
    "dense-label-zero-deferred-at-sufficient-zoom",
    "person-inspector-evidence",
    "meanwhile-active-activity",
    "fit-world-camera",
    "minimap-global-context",
    "viewport-scalability",
    "data-parity"
  ];
  assert.deepEqual([...capabilities.keys()], requiredIds);
  for (const id of requiredIds) assert.equal(capabilities.get(id)?.required, true, `${id} must remain required`);

  const pending = [...capabilities.values()].filter((item) => item.required && item.status !== "locked").map((item) => item.id);
  assert.ok(pending.length > 0, "final completion must remain false while required capabilities are pending");
  for (const id of ["continuous-space-camera", "spatial-place-precision", "dense-label-zero-overlap", "person-inspector-evidence", "meanwhile-active-activity", "data-parity"]) {
    assert.ok(pending.includes(id), `${id} must remain an explicit pending completion gate`);
  }
});

test("permanent dense acceptance windows are Europe 1800-1950 and East Asia 500-1900", () => {
  assert.equal(fixtures.schema, "atlas-spacetime-acceptance-fixtures/v1");
  assert.deepEqual(
    fixtures.dense_label_windows.map(({ id, macroregion_code, start_year, end_year }) => ({ id, macroregion_code, start_year, end_year })),
    [
      { id: "europe-ad-1800-1950", macroregion_code: "europe", start_year: 1800, end_year: 1950 },
      { id: "east-asia-ad-500-1900", macroregion_code: "east-asia", start_year: 500, end_year: 1900 }
    ]
  );
  for (const fixture of fixtures.dense_label_windows) {
    assert.deepEqual(fixture.at_sufficient_zoom, {
      label_overlap_count: 0,
      historical_y_deviation_px: 0,
      deferred_visible_labels: 0
    });
  }
});

test("data parity and normalized coordinate invariance remain explicit final gates", () => {
  assert.deepEqual(fixtures.coordinate_invariance.normalized_world_coordinate_must_match_under, [
    "search-off",
    "search-on",
    "selection-change",
    "time-zoom",
    "space-zoom",
    "minimap-navigation"
  ]);
  assert.deepEqual(fixtures.data_parity, {
    unintended_person_identity_delta: 0,
    unintended_activity_identity_delta: 0,
    unintended_temporal_boundary_delta: 0,
    unintended_polity_delta: 0,
    unintended_relation_delta: 0,
    unintended_role_delta: 0
  });
});

test("current locked foundation facts remain true while Completion Track starts", () => {
  const continuum = spaceAxis.createSpatialContinuum();
  assert.equal(continuum.macroregions.length, 9);
  assert.ok(continuum.subregions.length > continuum.macroregions.length);

  assert.equal(timeProjection.semanticBlendWeight(1), 0);
  assert.equal(timeProjection.semanticBlendWeight(4), 1);
});
