import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { sha256 } = require("../server/atlas-correction-v2-manifest-synthesizer.js");
const {
  synthesizeUnifiedCorrectionV2Manifest
} = require("../server/atlas-correction-v2-unified-plan-synthesizer.js");

const U = Object.freeze({
  polityA: "11111111-1111-4111-8111-111111111111",
  polityB: "22222222-2222-4222-8222-222222222222",
  source: "33333333-3333-4333-8333-333333333333",
  context: "44444444-4444-4444-8444-444444444444",
  governance: "55555555-5555-4555-8555-555555555555",
  designation: "66666666-6666-4666-8666-666666666666",
  designationName: "77777777-7777-4777-8777-777777777777",
  identityType: "88888888-8888-4888-8888-888888888888",
  identityRelation: "99999999-9999-4999-8999-999999999999"
});

const boundary = (from, to) => ({
  valid_from_year: from,
  valid_from_month: null,
  valid_from_day: null,
  valid_from_granularity: "year",
  valid_from_certainty: "exact",
  valid_from_calendar: "unspecified_historical",
  valid_to_year: to,
  valid_to_month: null,
  valid_to_day: null,
  valid_to_granularity: "year",
  valid_to_certainty: "exact",
  valid_to_calendar: "unspecified_historical"
});

function plan() {
  return {
    schema: "atlas-stage2-correction-v2-execution-plan/v1",
    batch_id: "unit-unified-stage2-assertions",
    baseline: { deployment_sha: "unit", baseline_digest: `sha256:${"0".repeat(64)}` },
    execution_rules: { production_executable: false, production_mutation_authorized: false },
    operations: [],
    stage2_assertions: [
      {
        type: "assert_governance_period",
        decision_id: "g",
        exact_before: { period_absent_id: U.governance },
        exact_after: {
          period: {
            id: U.governance, polity_id: U.polityA, governance_context_id: U.context,
            ...boundary(100, 110), confidence: "reviewed", notes: "unit"
          },
          source_links: [{ polity_governance_period_id: U.governance, source_id: U.source, source_locator_key: "unit:g" }]
        }
      },
      {
        type: "assert_polity_designation",
        decision_id: "d",
        exact_before: { designation_absent_id: U.designation },
        exact_after: {
          designation: {
            id: U.designation, polity_id: U.polityA, designation_type: "official_name",
            ...boundary(100, 110), confidence: "reviewed", notes: "unit"
          },
          names: [{ id: U.designationName, polity_designation_id: U.designation, locale: "en", name: "Unit", is_preferred: true }],
          source_links: [{ polity_designation_id: U.designation, source_id: U.source, source_locator_key: "unit:d" }]
        }
      },
      {
        type: "assert_polity_identity_relation",
        decision_id: "i",
        exact_before: { relation_absent_id: U.identityRelation },
        exact_after: {
          relation: {
            id: U.identityRelation,
            predecessor_polity_id: U.polityA,
            successor_polity_id: U.polityB,
            relation_type_id: U.identityType,
            transition_year: 111,
            transition_month: null,
            transition_day: null,
            transition_granularity: "year",
            transition_certainty: "exact",
            transition_calendar: "unspecified_historical",
            confidence: "reviewed",
            notes: "unit"
          },
          source_links: [{ polity_identity_relation_id: U.identityRelation, source_id: U.source, source_locator_key: "unit:i" }]
        }
      }
    ]
  };
}

const snapshot = {
  schema: "atlas-correction-v2-target-snapshot/v1",
  snapshot_digest: `sha256:${"1".repeat(64)}`,
  activity_ids: [],
  activities: [],
  normalized_activity_source_links: [],
  chronology_claims: [],
  relationship_descriptions: []
};

test("unified plan synthesizer appends all three literal Stage 2 assertion families and rehashes", () => {
  const manifest = synthesizeUnifiedCorrectionV2Manifest(plan(), snapshot);
  assert.deepEqual(manifest.operations.map((op) => op.type), [
    "assert_governance_period",
    "assert_polity_designation",
    "assert_polity_identity_relation"
  ]);
  const { manifest_sha256, production_executable, ...core } = manifest;
  assert.equal(production_executable, true);
  assert.equal(manifest_sha256, sha256(core));
});

test("unified plan synthesizer rejects unsupported assertion operations", () => {
  const invalid = plan();
  invalid.stage2_assertions = [{ type: "assert_unknown" }];
  assert.throws(
    () => synthesizeUnifiedCorrectionV2Manifest(invalid, snapshot),
    /CORRECTION_V2_STAGE2_ASSERTION_OPERATION_UNSUPPORTED/
  );
});
