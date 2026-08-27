import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { requireManifest } = require("../server/atlas-correction-manifest-v1-4-service.js");
const request = JSON.parse(fs.readFileSync(new URL("../corrections/requests/sun-wu-historicity-historical-20260827.v1.json", import.meta.url), "utf8"));
const main = fs.readFileSync(new URL("../atlas-person-main.js", import.meta.url), "utf8");

test("Sun Wu is promoted to historical Person classification without changing the 506 BCE Activity", () => {
  const parsed = requireManifest(request);
  assert.equal(parsed.operations.length, 1);
  assert.equal(parsed.operations[0].type, "update_person_historicity");
  assert.equal(parsed.operations[0].person_id, "d5c962df-ae2c-4e82-bafb-550989ed44b2");
  assert.equal(parsed.operations[0].expected_before.historicity, "disputed");
  assert.equal(parsed.operations[0].expected_after.historicity, "historical");
});

test("ordinary Person Main has one chronology UI and no separate Other / Uncertain section", () => {
  assert.match(main, /\.\.\.groups\.historical/);
  assert.match(main, /\.\.\.groups\.other_or_uncertain/);
  assert.match(main, /\.\.\.visibleUnknownRegistryPersons\(\)/);
  assert.doesNotMatch(main, /OTHER \/ UNCERTAIN HISTORICITY|person-group-other/);
});
