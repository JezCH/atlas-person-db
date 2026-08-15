import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  MANIFEST_V1_2,
  MARKER_V1_2,
  OPERATION_TYPE,
  requireManifest,
  updateTemporalMetadata
} = require("../server/atlas-correction-manifest-v1-2-service.js");

const ACTIVITY = "c8aaf090-cab4-50c8-8abb-b77baddffb30";
const PERSON = "11111111-1111-4111-8111-111111111111";
const POLITY = "22222222-2222-4222-8222-222222222222";
const RELATION = "33333333-3333-4333-8333-333333333333";
const ROLE = "44444444-4444-4444-8444-444444444444";
const BASIS = "55555555-5555-4555-8555-555555555555";

function activity(overrides = {}) {
  return {
    id: ACTIVITY,
    person_id: PERSON,
    polity_id: POLITY,
    relation_type_id: RELATION,
    role_id: ROLE,
    period_basis_id: BASIS,
    activity_start: 1520,
    activity_start_month: null,
    activity_start_day: null,
    activity_start_granularity: "legacy_year",
    activity_start_certainty: "exact",
    activity_start_calendar: "unspecified_historical",
    activity_end: 1566,
    activity_end_month: null,
    activity_end_day: null,
    activity_end_granularity: "year",
    activity_end_certainty: "exact",
    activity_end_calendar: "unspecified_historical",
    confidence: "well_established",
    chronology_status: "reviewed",
    legacy_source_key: "legacy:suleiman-i",
    notes: "Reigned as Ottoman sultan from 1520 until his death in 1566.",
    source_locator: {},
    content_hash: "hash:suleiman-i",
    ...overrides
  };
}

function manifest(before = activity(), after = activity({ activity_start_granularity: "year" })) {
  return {
    schema: MANIFEST_V1_2,
    request_id: "correction:suleiman-i:p10-start-granularity:20260815:v1",
    review_status: "approved",
    operations: [{
      type: OPERATION_TYPE,
      relationship_id: ACTIVITY,
      expected_before: before,
      expected_after: after
    }]
  };
}

test("v1.2 permits an out-of-contract legacy before value but only a valid Stage 2 metadata repair", () => {
  const parsed = requireManifest(manifest());
  assert.equal(parsed.schema, MANIFEST_V1_2);
  assert.equal(parsed.operations.length, 1);
  assert.deepEqual(parsed.operations[0].changed_fields, ["activity_start_granularity"]);
  assert.equal(parsed.operations[0].expected_before.activity_start_granularity, "legacy_year");
  assert.equal(parsed.operations[0].expected_after.activity_start_granularity, "year");
});

test("v1.2 rejects interval or identity drift and rejects invalid repaired metadata", () => {
  assert.throws(
    () => requireManifest(manifest(activity(), activity({ activity_start: 1521, activity_start_granularity: "year" }))),
    /CORRECTION_V12_NON_METADATA_DRIFT/
  );
  assert.throws(
    () => requireManifest(manifest(activity(), activity({ polity_id: "66666666-6666-4666-8666-666666666666", activity_start_granularity: "year" }))),
    /CORRECTION_V12_NON_METADATA_DRIFT/
  );
  assert.throws(
    () => requireManifest(manifest(activity(), activity({ activity_start_granularity: "legacy_year" }))),
    /CORRECTION_V12_NO_CHANGE/
  );
  assert.throws(
    () => requireManifest(manifest(activity(), activity({ activity_start_granularity: "century" }))),
    /ACTIVITY_START_GRANULARITY_INVALID/
  );
});

test("temporal metadata primitive updates only the six bounded metadata columns", async () => {
  let sql = "";
  let params = null;
  const client = {
    async query(text, values) {
      sql = String(text);
      params = values;
      return { rowCount: 1, rows: [{ id: ACTIVITY }] };
    }
  };
  const operation = requireManifest(manifest()).operations[0];
  const result = await updateTemporalMetadata(client, operation);
  assert.equal(result.activity_id, ACTIVITY);
  assert.deepEqual(result.changed_fields, ["activity_start_granularity"]);
  assert.match(sql, /set activity_start_granularity=\$2/);
  assert.match(sql, /activity_end_calendar=\$7/);
  assert.doesNotMatch(sql, /activity_start\s*=|activity_end\s*=|person_id\s*=|polity_id\s*=/);
  assert.deepEqual(params, [
    ACTIVITY,
    "year",
    "exact",
    "unspecified_historical",
    "year",
    "exact",
    "unspecified_historical"
  ]);
});

test("v1.2 marker remains isolated from v1/v1.1 transports", () => {
  assert.equal(MARKER_V1_2, "ATLAS_CORRECTION_MANIFEST_V1_2");
});
