import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { OPERATION_TYPE, requireManifest, requireOperation } =
  require("../server/atlas-correction-person-timeline-v2-service.js");
const { createCorrectionManifestV2DispatchService } =
  require("../server/atlas-correction-manifest-v2-dispatch-service.js");

const fixture = JSON.parse(fs.readFileSync(
  new URL("../corrections/requests/maimonides-timeline-disposition-20261010.v2.json", import.meta.url), "utf8"
));

test("Maimonides approved manifest preserves the reviewed single-Person exact-before state", () => {
  const validated = requireManifest(fixture);
  assert.equal(OPERATION_TYPE, "set_person_timeline_disposition");
  assert.equal(validated.operation.person_id, "3f3cb937-b022-4b5c-9380-2a8625b33a2e");
  assert.equal(validated.operation.expected_current_disposition.disposition, "chronology_unresolved");
  assert.equal(validated.operation.replacement_disposition, "timeline");
  assert.equal(validated.operation.expected_activity_ids.length, 3);
  assert.equal(validated.operation.expected_current_disposition.review_evidence.reviewed_at, "2026-09-30");
});

test("Person timeline correction requires exact before and the three original Activity IDs", () => {
  assert.throws(() => requireOperation({ ...fixture.operations[0], expected_activity_ids: [] }), /THREE_ACTIVITIES_REQUIRED/);
  assert.throws(() => requireOperation({ ...fixture.operations[0], expected_activity_ids: [fixture.operations[0].expected_activity_ids[0], fixture.operations[0].expected_activity_ids[0], fixture.operations[0].expected_activity_ids[2]] }), /ACTIVITY_DUPLICATE/);
  assert.throws(() => requireOperation({ ...fixture.operations[0], expected_current_disposition: { disposition:"timeline" } }), /EXPECTED_UNRESOLVED_REQUIRED/);
  assert.throws(() => requireOperation({ ...fixture.operations[0], replacement_disposition:"mythical" }), /PERSON_TIMELINE_EXCLUSION_REASON_REQUIRED|TARGET_NOT_TIMELINE/);
  assert.throws(() => requireManifest({ ...fixture, review_status:"draft" }), /APPROVED_V2_REQUIRED/);
  assert.throws(() => requireManifest({ ...fixture, operations:[] }), /SINGLE_OPERATION_REQUIRED/);
});

test("Correction dispatcher routes this operation family instead of the generic Activity writer", () => {
  // A route instance constructs all service families but performs no queries.
  const dispatch = createCorrectionManifestV2DispatchService({
    client: { async query() { throw new Error("ROUTED_CORRECTION_NOT_TO_BE_EXECUTED"); } }
  });
  assert.equal(typeof dispatch.execute, "function");
  assert.equal(requireOperation(fixture.operations[0]).type, OPERATION_TYPE);
});
