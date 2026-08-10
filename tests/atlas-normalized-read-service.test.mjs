import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { DIRECT_READ_SQL, readPersonPolitics } = require("../server/atlas-normalized-read-service.js");

test("normalized read SQL references only v2 normalized projection tables", () => {
  assert.match(DIRECT_READ_SQL, /atlas_v2\.person_politics_v2/);
  assert.match(DIRECT_READ_SQL, /atlas_v2\.person_names/);
  assert.match(DIRECT_READ_SQL, /atlas_v2\.polity_names/);
  assert.match(DIRECT_READ_SQL, /left join atlas_v2\.roles/);
  assert.match(DIRECT_READ_SQL, /atlas_v2\.period_bases/);
  assert.doesNotMatch(DIRECT_READ_SQL, /public\.person_politics(?:\s|$)/);
  assert.doesNotMatch(DIRECT_READ_SQL, /atlas_person_politics_compat_v1/);
});

test("normalized read service preserves authoritative normalized id and nullable role", async () => {
  const calls = [];
  const client = {
    async query(sql) {
      calls.push(sql);
      return { rows: [{
        id: "11111111-1111-4111-8111-111111111111",
        person_name: "A",
        politic_name: "B",
        activity_start: -10,
        activity_end: -9,
        role: null,
        period_basis: "general_activity",
        notes: null
      }] };
    }
  };
  const rows = await readPersonPolitics({ client });
  assert.equal(calls.length, 1);
  assert.deepEqual(rows, [{
    id: "11111111-1111-4111-8111-111111111111",
    person_name: "A",
    politic_name: "B",
    activity_start: -10,
    activity_end: -9,
    role: null,
    period_basis: "general_activity",
    notes: null
  }]);
});
