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
  assert.match(DIRECT_READ_SQL, /atlas_v2\.role_names/);
  assert.match(DIRECT_READ_SQL, /atlas_v2\.period_bases/);
  assert.doesNotMatch(DIRECT_READ_SQL, /public\.person_politics(?:\s|$)/);
  assert.doesNotMatch(DIRECT_READ_SQL, /atlas_person_politics_compat_v1/);
});

test("normalized read SQL preserves English canonical values and prefers Korean display aliases", () => {
  assert.match(DIRECT_READ_SQL, /pen\.locale = 'en'/);
  assert.match(DIRECT_READ_SQL, /pko\.locale = 'ko'/);
  assert.match(DIRECT_READ_SQL, /ten\.locale = 'en'/);
  assert.match(DIRECT_READ_SQL, /tko\.locale = 'ko'/);
  assert.match(DIRECT_READ_SQL, /rn\.locale = 'ko'/);
  assert.match(DIRECT_READ_SQL, /coalesce\(pko\.name, pen\.name\).*person_display_name/s);
  assert.match(DIRECT_READ_SQL, /coalesce\(tko\.name, ten\.name\).*politic_display_name/s);
  assert.match(DIRECT_READ_SQL, /coalesce\(rko\.name, r\.source_label\).*role_display_name/s);
});

test("normalized read SQL is chronological first", () => {
  const order = DIRECT_READ_SQL.split(/order by/i).at(-1);
  assert.match(order, /^\s*pp\.activity_start,\s*pp\.activity_end,/s);
});

test("normalized read service preserves authoritative id, canonical aliases and display aliases", async () => {
  const calls = [];
  const client = {
    async query(sql) {
      calls.push(sql);
      return { rows: [{
        id: "11111111-1111-4111-8111-111111111111",
        person_name: "Cyrus the Great",
        person_display_name: "키루스 2세",
        politic_name: "Achaemenid Empire",
        politic_display_name: "아케메네스 제국",
        activity_start: -559,
        activity_end: -530,
        role: "King of Kings",
        role_display_name: "왕중왕",
        period_basis: "reign",
        notes: null
      }] };
    }
  };
  const rows = await readPersonPolitics({ client });
  assert.equal(calls.length, 1);
  assert.deepEqual(rows, [{
    id: "11111111-1111-4111-8111-111111111111",
    person_name: "Cyrus the Great",
    person_display_name: "키루스 2세",
    politic_name: "Achaemenid Empire",
    politic_display_name: "아케메네스 제국",
    activity_start: -559,
    activity_end: -530,
    role: "King of Kings",
    role_display_name: "왕중왕",
    period_basis: "reign",
    notes: null
  }]);
});

test("normalized read service falls back display values to canonical values", async () => {
  const client = {
    async query() {
      return { rows: [{
        id: "22222222-2222-4222-8222-222222222222",
        person_name: "A",
        person_display_name: null,
        politic_name: "B",
        politic_display_name: null,
        activity_start: 1,
        activity_end: 2,
        role: null,
        role_display_name: null,
        period_basis: "general_activity",
        notes: null
      }] };
    }
  };
  const [row] = await readPersonPolitics({ client });
  assert.equal(row.person_display_name, "A");
  assert.equal(row.politic_display_name, "B");
  assert.equal(row.role, null);
  assert.equal(row.role_display_name, null);
});
