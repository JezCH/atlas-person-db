import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { requireManifest } = require("../server/atlas-correction-manifest-v1-4-service.js");
const request = JSON.parse(fs.readFileSync(new URL("../corrections/requests/sun-wu-person-historicity-historical-20260827.v1.json", import.meta.url), "utf8"));

test("Sun Wu keeps the reviewed 506 BCE Activity while Person historicity is promoted to historical", () => {
  const parsed = requireManifest(request);
  assert.equal(parsed.operations.length, 1);
  const operation = parsed.operations[0];
  assert.equal(operation.type, "update_person_historicity");
  assert.equal(operation.person_id, "d5c962df-ae2c-4e82-bafb-550989ed44b2");
  assert.equal(operation.expected_before.historicity, "disputed");
  assert.equal(operation.expected_after.historicity, "historical");
});
