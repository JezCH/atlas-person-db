import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  V1,
  V1_1,
  V2,
  extractManifestSchemas
} = require("../server/atlas-stage2-correction-ledger-compat.js");

test("correction ledger compatibility recognizes every reviewed predecessor constraint", () => {
  assert.deepEqual(extractManifestSchemas(`CHECK (manifest_schema IN ('${V1}'))`), [V1]);
  assert.deepEqual(extractManifestSchemas(`CHECK (manifest_schema IN ('${V1}', '${V1_1}'))`), [V1, V1_1].sort());
  assert.deepEqual(extractManifestSchemas(`CHECK (manifest_schema IN ('${V1}', '${V1_1}', '${V2}'))`), [V1, V1_1, V2].sort());
});

test("correction ledger compatibility does not infer unreviewed schema versions", () => {
  assert.deepEqual(extractManifestSchemas("CHECK (manifest_schema IN ('atlas-correction-manifest/v3'))"), []);
});
