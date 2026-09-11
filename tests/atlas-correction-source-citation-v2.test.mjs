import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const {
  OPERATION_TYPE,
  requireOperation,
  requireManifest
} = require("../server/atlas-correction-source-citation-v2-service.js");
const {
  POLITY_RETIRE_OPERATION_TYPE,
  createCorrectionManifestV2DispatchService
} = require("../server/atlas-correction-manifest-v2-dispatch-service.js");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE_ID = "c29edee2-9cf6-4b00-b8b6-57079ccf286c";
const SOURCE_URL = "https://emeritus.snu.ac.kr/wp-content/uploads/sites/208/migrated/%EB%AA%85%EC%98%88%EA%B5%90%EC%88%98%ED%9A%8C%EB%B3%B4%202017%2C%20%EC%A0%9C13%ED%98%B8.pdf";
const OLD_CITATION = "허승일, 서울대학교 명예교수회보 2017 제13호. The study identifies Gaius Gracchus as plebeian tribune in 123–122 BCE and examines the reform program of the Gracchi brothers.";
const NEW_CITATION = "허승일, 서울대학교 명예교수회보 2017 제13호. 로마 공화정기 그라쿠스 형제의 개혁을 다룬 연구.";

function validOperation(overrides = {}) {
  return {
    type: OPERATION_TYPE,
    case_id: "gracchi-shared-source-neutral-citation",
    source_id: SOURCE_ID,
    expected_canonical_url: SOURCE_URL,
    expected_citation_text: OLD_CITATION,
    replacement_citation_text: NEW_CITATION,
    ...overrides
  };
}

test("source citation operation accepts an exact guarded rewrite", () => {
  const operation = requireOperation(validOperation(), 1);
  assert.equal(operation.type, OPERATION_TYPE);
  assert.equal(operation.source_id, SOURCE_ID);
  assert.equal(operation.expected_canonical_url, SOURCE_URL);
  assert.equal(operation.expected_citation_text, OLD_CITATION);
  assert.equal(operation.replacement_citation_text, NEW_CITATION);
});

test("source citation operation rejects unsafe URL and no-op rewrites", () => {
  assert.throws(
    () => requireOperation(validOperation({ expected_canonical_url: "http://example.com/source" }), 1),
    /CORRECTION_SOURCE_CITATION_OP1_EXPECTED_URL_INVALID/
  );
  assert.throws(
    () => requireOperation(validOperation({ replacement_citation_text: OLD_CITATION }), 1),
    /CORRECTION_SOURCE_CITATION_OP1_NO_CHANGE/
  );
});

test("source citation manifest rejects multiple rewrites of the same Source", () => {
  assert.throws(
    () => requireManifest({
      schema: "atlas-correction-manifest/v2",
      review_status: "approved",
      request_id: "test:duplicate-source",
      operations: [validOperation(), validOperation({ case_id: "duplicate" })]
    }),
    /CORRECTION_SOURCE_CITATION_SOURCE_REUSED/
  );
});

test("checked-in Gracchi manifest parses as one exact Source-only rewrite", () => {
  const manifestPath = path.join(__dirname, "..", "corrections", "requests", "gracchi-shared-source-citation-20260912.v2.json");
  const raw = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const manifest = requireManifest(raw);
  assert.equal(manifest.requestId, "source-citation:gracchi-shared-source:2026-09-12:v1");
  assert.equal(manifest.operations.length, 1);
  assert.deepEqual(manifest.operations[0], validOperation());
});

test("v2 dispatcher forbids mixing Source citation rewrite with another operation family", () => {
  const client = { query: async () => { throw new Error("query must not be reached"); } };
  const service = createCorrectionManifestV2DispatchService({ client });
  assert.throws(
    () => service.execute({ operations: [validOperation(), { type: POLITY_RETIRE_OPERATION_TYPE }] }, { dryRun: true }),
    /CORRECTION_V2_SOURCE_CITATION_MIXED_OPERATION_FAMILY_FORBIDDEN/
  );
});
