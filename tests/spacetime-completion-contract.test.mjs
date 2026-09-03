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

function capabilityMap() { return new Map(contract.capabilities.map((item) => [item.id, item])); }

test("completion contract records the readable-scale architecture without claiming final product completion", () => {
  assert.equal(contract.schema, "atlas-spacetime-completion-contract/v2");
  assert.equal(contract.foundation_track.status, "completed");
  assert.equal(contract.foundation_track.sufficient_for_final_completion, false);
  assert.equal(contract.readable_scale.minimum_zoom_percent, 500);
  assert.equal(contract.readable_scale.default_zoom_percent, 500);
  assert.equal(contract.readable_scale.global_extent_compression, 0.748);
  assert.equal(contract.readable_scale.minimum_base_world_width_px, 900);
  assert.equal(contract.readable_scale.maximum_base_world_width_px, 1275);
  assert.equal(contract.readable_scale.viewport_expansion_above_cap_allowed, false);
  assert.equal(contract.readable_scale.axis_width_px, 140);
  assert.equal(contract.readable_scale.camera_header_height_px, 36);
  assert.equal(contract.readable_scale.shared_chrome_compaction, true);
  assert.equal(contract.readable_scale.label_height_px, 18);
  assert.equal(contract.readable_scale.label_horizontal_padding_px, 1);
  assert.equal(contract.readable_scale.label_outer_chrome_px, 4);
  assert.equal(contract.readable_scale.label_min_width_px, 30);
  assert.equal(contract.readable_scale.label_max_width_px, 148);
  assert.equal(contract.readable_scale.label_text_content_min_width_px, 26);
  assert.equal(contract.readable_scale.label_text_content_max_width_px, 144);
  assert.equal(contract.readable_scale.label_text_width_budget_preserved, true);
  assert.equal(contract.readable_scale.local_density_compression_allowed, false);
  assert.match(contractDoc, /500%/);
  assert.match(contractDoc, /uniform/i);
});

test("required product gates remain explicit", () => {
  const capabilities = capabilityMap();
  const requiredIds = [
    "single-production-renderer",
    "uniform-time-projection",
    "stable-macroregion-world-x",
    "unified-global-camera",
    "minimum-readable-scale-floor",
    "uniform-global-extent-compression",
    "bounded-base-world-width",
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
    "minimum-readable-camera-reset",
    "minimap-global-context",
    "viewport-scalability",
    "data-parity",
    "spatial-uncertainty-rendering",
    "spatial-place-semantic-lod",
    "sticky-person-activity-inspector",
    "activity-selection-meanwhile-link",
    "original-plan-visual-acceptance"
  ];
  assert.deepEqual([...capabilities.keys()], requiredIds);
  for (const id of requiredIds) assert.equal(capabilities.get(id)?.required, true);
  const pending = [...capabilities.values()].filter((item) => item.required && item.status !== "locked").map((item) => item.id);
  assert.deepEqual(pending, ["spatial-place-semantic-lod","activity-selection-meanwhile-link","original-plan-visual-acceptance"]);
  assert.equal(capabilities.get("sticky-person-activity-inspector")?.status, "locked");
  assert.equal(contract.sticky_inspector_verification.status, "locked");
  assert.equal(contract.sticky_inspector_verification.right_sticky_panel, true);
  assert.equal(contract.sticky_inspector_verification.stable_reserved_column, true);
  assert.equal(contract.sticky_inspector_verification.selected_activity_id, true);
  assert.equal(contract.sticky_inspector_verification.selected_time_ordinal_from_activity_midpoint, true);
  assert.equal(contract.sticky_inspector_verification.unresolved_activities_preserved, true);
  assert.equal(contract.sticky_inspector_verification.multi_place_slices_preserved, true);
  assert.equal(contract.sticky_inspector_verification.counterparty_visible_but_not_primary, true);
  assert.equal(contract.sticky_inspector_verification.meanwhile_mutation, false);
  assert.equal(capabilities.get("spatial-uncertainty-rendering")?.status, "locked");
  assert.equal(contract.spatial_uncertainty_verification.status, "locked");
  assert.equal(contract.spatial_uncertainty_verification.semantics, "placement_precision_not_activity_extent");
  assert.equal(contract.spatial_uncertainty_verification.culling_includes_x_min_x_max, true);
  assert.equal(contract.original_plan_reconciliation.status, "in_progress");
  assert.equal(contract.final_completion_verification.status, "in_progress");
  assert.equal(contract.final_completion_verification.required_pending_count, 3);
  assert.equal(capabilities.get("data-parity")?.status, "locked");
  assert.equal(contract.data_parity_verification.status, "locked");
  assert.equal(contract.data_parity_verification.mode, "runtime_fail_closed");
  assert.equal(contract.data_parity_verification.person_identity_delta, 0);
  assert.equal(contract.data_parity_verification.activity_identity_delta, 0);
  assert.equal(contract.data_parity_verification.temporal_boundary_delta, 0);
  assert.equal(contract.data_parity_verification.polity_delta, 0);
  assert.equal(contract.data_parity_verification.relation_delta, 0);
  assert.equal(contract.data_parity_verification.role_delta, 0);
  assert.equal(contract.data_parity_verification.unresolved_activity_included, true);
  assert.equal(contract.data_parity_verification.multi_place_segment_deduplication_by_activity_id, true);
  assert.equal(contract.final_completion_verification.status, "in_progress");
  assert.equal(contract.final_completion_verification.required_pending_count, 3);
  assert.equal(capabilities.get("meanwhile-active-activity")?.status, "locked");
  assert.equal(contract.meanwhile_verification.status, "locked");
  assert.equal(contract.meanwhile_verification.selected_historical_moment, true);
  assert.equal(contract.meanwhile_verification.unique_person_counts, true);
  assert.equal(contract.meanwhile_verification.macroregion_distribution, true);
  assert.equal(contract.meanwhile_verification.active_person_highlight, true);
  assert.equal(capabilities.get("person-inspector-evidence")?.status, "locked");
  assert.equal(contract.person_inspector_verification.status, "locked");
  assert.equal(contract.person_inspector_verification.spatial_precision_visible, true);
  assert.equal(contract.person_inspector_verification.place_evidence_visible, true);
  assert.equal(contract.person_inspector_verification.historical_source_refs_visible, true);
  assert.equal(contract.person_inspector_verification.display_source_refs_visible, true);
  assert.equal(capabilities.get("spatial-place-precision")?.status, "locked");
  assert.equal(capabilities.get("spatial-multi-place-preservation")?.status, "locked");
  assert.equal(contract.spatial_place_verification.status, "locked");
  assert.equal(contract.spatial_place_verification.exact_geographic_coordinate_claimed, false);
  assert.equal(capabilities.get("dense-label-zero-overlap")?.status, "locked");
  assert.equal(capabilities.get("dense-label-zero-deferred-at-sufficient-zoom")?.status, "locked");
  assert.equal(contract.dense_label_verification.status, "locked");
  assert.equal(contract.dense_label_verification.sufficient_zoom_percent, 800);
  assert.equal(contract.dense_label_verification.minimum_base_world_width_px, 900);
});

test("permanent dense acceptance windows remain unchanged", () => {
  assert.equal(fixtures.schema, "atlas-spacetime-acceptance-fixtures/v2");
  assert.deepEqual(fixtures.dense_label_windows.map(({id,macroregion_code,start_year,end_year})=>({id,macroregion_code,start_year,end_year})), [
    { id: "europe-ad-1800-1950", macroregion_code: "europe", start_year: 1800, end_year: 1950 },
    { id: "east-asia-ad-500-1900", macroregion_code: "east-asia", start_year: 500, end_year: 1900 }
  ]);
});

test("coordinate invariance uses one global camera zoom", () => {
  assert.deepEqual(fixtures.coordinate_invariance.normalized_world_coordinate_must_match_under, [
    "search-off","search-on","selection-change","global-camera-zoom","minimap-navigation"
  ]);
  assert.equal(fixtures.readable_scale.minimum_zoom_percent, 500);
  assert.equal(fixtures.readable_scale.global_extent_compression, 0.748);
  assert.equal(fixtures.readable_scale.minimum_base_world_width_px, 900);
  assert.equal(fixtures.readable_scale.maximum_base_world_width_px, 1275);
  assert.equal(fixtures.readable_scale.viewport_expansion_above_cap_allowed, false);
  assert.equal(fixtures.readable_scale.label_height_px, 18);
  assert.equal(fixtures.readable_scale.label_horizontal_padding_px, 1);
  assert.equal(fixtures.readable_scale.label_outer_chrome_px, 4);
  assert.equal(fixtures.readable_scale.label_text_width_budget_preserved, true);
  assert.equal(fixtures.readable_scale.local_density_compression_allowed, false);
});

test("current locked geometry facts remain true", () => {
  const continuum = spaceAxis.createSpatialContinuum();
  assert.equal(continuum.macroregions.length, 9);
  assert.ok(continuum.subregions.length > continuum.macroregions.length);
  assert.equal(timeProjection.MIN_SUPPORTED_ZOOM, 5);
  assert.equal(timeProjection.createUniformTimeProjection(-3000, 2026, 1000, 5).mode, "linear_time");
});
