import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { requireManifest } = require("../server/atlas-correction-manifest-v1-4-service.js");
const request = JSON.parse(fs.readFileSync(new URL("../corrections/requests/sun-wu-person-historicity-historical-20260827.v1.json", import.meta.url), "utf8"));

test("Sun Wu keeps the reviewed 506 BCE Activity while Person historicity is promoted to historical", () => {
  const parsed = requireManifest(request);
  assert.equal(parsed.operations.length, 2);
  const operation = parsed.operations[0];
  assert.equal(operation.type, "update_person_historicity");
  assert.equal(operation.person_id, "d5c962df-ae2c-4e82-bafb-550989ed44b2");
  assert.equal(operation.expected_before.historicity, "disputed");
  assert.equal(operation.expected_after.historicity, "historical");
  const notes = parsed.operations[1];
  assert.equal(notes.type, "update_activity_notes");
  assert.equal(notes.relationship_id, "2f57ad5b-8f70-4319-9b59-4a548cba2ad8");
  assert.equal(notes.expected_before.activity_start, -506);
  assert.equal(notes.expected_after.activity_end, -506);
  assert.match(notes.expected_after.notes, /historical Person table/);
  assert.match(notes.expected_after.notes, /Activity confidence as disputed/);
});
