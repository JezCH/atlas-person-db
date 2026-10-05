import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  OPERATION_TYPE,
  requireOperation,
  requireManifest,
  expectedDomainCounts
} = require("../server/atlas-correction-person-domain-v2-service.js");
const {
  createCorrectionManifestV2DispatchService
} = require("../server/atlas-correction-manifest-v2-dispatch-service.js");

const ADA_ID = "928045d7-e218-543d-9df8-9b96c8f65781";
const FORD_ID = "c3b35168-17a0-4b4b-9468-b46c368ab257";

function validOperation(overrides = {}) {
  return {
    type: OPERATION_TYPE,
    case_id: "technology-audit-ada-lovelace",
    person_id: ADA_ID,
    expected_domain: "technology",
    replacement_domain: "science",
    ...overrides
  };
}

test("Person domain correction accepts an exact guarded canonical rewrite", () => {
  const operation = requireOperation(validOperation(), 1);
  assert.equal(operation.type, OPERATION_TYPE);
  assert.equal(operation.person_id, ADA_ID);
  assert.equal(operation.expected_domain, "technology");
  assert.equal(operation.replacement_domain, "science");
});

test("Person domain correction rejects invalid and no-op domain rewrites", () => {
  assert.throws(
    () => requireOperation(validOperation({ replacement_domain: "knowledge" }), 1),
    /PERSON_DOMAIN_VALUE_UNSUPPORTED/
  );
  assert.throws(
    () => requireOperation(validOperation({ replacement_domain: "technology" }), 1),
    /CORRECTION_PERSON_DOMAIN_OP1_NO_CHANGE/
  );
});

test("Person domain correction manifest rejects duplicate Person targets", () => {
  assert.throws(
    () => requireManifest({
      schema: "atlas-correction-manifest/v2",
      review_status: "approved",
      request_id: "test:duplicate-person-domain",
      operations: [
        validOperation(),
        validOperation({ case_id: "duplicate", replacement_domain: "commerce" })
      ]
    }),
    /CORRECTION_PERSON_DOMAIN_PERSON_REUSED/
  );
});

test("Person domain correction computes expected count deltas only for reviewed moves", () => {
  const before = {
    governance: 1350,
    military: 208,
    science: 78,
    technology: 38,
    commerce: 28,
    culture: 162,
    religion: 100,
    exploration: 28,
    unclassified: 113
  };
  const after = expectedDomainCounts(before, [
    validOperation(),
    validOperation({
      case_id: "technology-audit-henry-ford",
      person_id: FORD_ID,
      replacement_domain: "commerce"
    })
  ]);
  assert.equal(after.technology, 36);
  assert.equal(after.science, 79);
  assert.equal(after.commerce, 29);
  assert.equal(after.unclassified, 113);
});

test("v2 dispatcher forbids mixing Person domain rewrites with another correction family", () => {
  const client = { query: async () => { throw new Error("query must not be reached"); } };
  const service = createCorrectionManifestV2DispatchService({ client });
  assert.throws(
    () => service.execute({
      operations: [
        validOperation(),
        { type: "rewrite_activity" }
      ]
    }, { dryRun: true }),
    /CORRECTION_V2_PERSON_DOMAIN_MIXED_OPERATION_FAMILY_FORBIDDEN/
  );
});
