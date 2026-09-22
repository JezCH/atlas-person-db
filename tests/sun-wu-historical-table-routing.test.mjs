import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const request = JSON.parse(fs.readFileSync(new URL("../corrections/requests/sun-wu-historicity-historical-20260827.v1.json", import.meta.url), "utf8"));
const main = fs.readFileSync(new URL("../atlas-person-main.js", import.meta.url), "utf8");

test("Sun Wu historical correction artifact preserves the reviewed classification change without Activity mutation", () => {
  assert.equal(request.schema, "atlas-correction-manifest/v1.4");
  assert.equal(request.operations.length, 1);
  assert.equal(request.operations[0].type, "update_person_historicity");
  assert.equal(request.operations[0].person_id, "d5c962df-ae2c-4e82-bafb-550989ed44b2");
  assert.equal(request.operations[0].expected_before.historicity, "disputed");
  assert.equal(request.operations[0].expected_after.historicity, "historical");
  assert.equal(request.operations.some((operation) => "relationship_id" in operation || "activity_id" in operation), false);
});

test("ordinary Person Main has one chronology UI and no separate Other / Uncertain section", () => {
  assert.match(main, /\.\.\.groups\.historical/);
  assert.match(main, /\.\.\.groups\.other_or_uncertain/);
  assert.match(main, /\.\.\.visibleUnknownRegistryPersons\(\)/);
  assert.doesNotMatch(main, /OTHER \/ UNCERTAIN HISTORICITY|person-group-other/);
});
