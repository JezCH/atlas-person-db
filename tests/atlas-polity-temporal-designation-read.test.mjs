import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { TEMPORAL_POLITY_DESIGNATION_JOIN_SQL } = require("../server/atlas-polity-temporal-designation-read.js");
const normalizedRead = require("../server/atlas-normalized-read-service.js");
const personRead = require("../server/atlas-person-read-service.js");
const runtimeRead = require("../server/atlas-runtime-person-read-service.js");

test("A/C: exact and boundary-equal Activity intervals are eligible by inclusive full-containment", () => {
  assert.match(TEMPORAL_POLITY_DESIGNATION_JOIN_SQL, /pd\.valid_from_year is null or pd\.valid_from_year <= pp\.activity_start/);
  assert.match(TEMPORAL_POLITY_DESIGNATION_JOIN_SQL, /pd\.valid_to_year is null or pd\.valid_to_year >= pp\.activity_end/);
});

test("B/D/E: outside, partial-overlap, unresolved, or absent designation does not get guessed", () => {
  assert.match(TEMPORAL_POLITY_DESIGNATION_JOIN_SQL, /pp\.activity_start is not null/);
  assert.match(TEMPORAL_POLITY_DESIGNATION_JOIN_SQL, /pp\.activity_end is not null/);
  assert.match(TEMPORAL_POLITY_DESIGNATION_JOIN_SQL, /when count\(\*\) = 1/);
  assert.doesNotMatch(TEMPORAL_POLITY_DESIGNATION_JOIN_SQL, /order by/i);
  assert.doesNotMatch(TEMPORAL_POLITY_DESIGNATION_JOIN_SQL, /limit\s+1/i);
});

test("ambiguous multiple full-containment designations fail closed to stable polity names", () => {
  assert.match(TEMPORAL_POLITY_DESIGNATION_JOIN_SQL, /else null::uuid/);
  assert.match(normalizedRead.DIRECT_READ_SQL, /coalesce\(td_ko\.name, td_en\.name, tko\.name, ten\.name\)::text as politic_display_name/);
});

test("all public Activity read surfaces use the same temporal designation SQL resolver", () => {
  for (const sql of [
    normalizedRead.DIRECT_READ_SQL,
    personRead.ACTIVITY_DETAIL_SQL,
    runtimeRead.ACTIVITY_DETAIL_SQL
  ]) {
    assert.ok(sql.includes(TEMPORAL_POLITY_DESIGNATION_JOIN_SQL));
  }
});

test("Person read projection keeps stable identity fields while temporal designation only affects display", () => {
  const activity = personRead.projectActivity({
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    person_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    polity_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    polity_name_en: "Stable Polity",
    polity_name_ko: "안정 정치체",
    polity_designation_name_en: "Period Name",
    polity_designation_name_ko: "시대 국호",
    relation_type_id: null,
    role_id: null,
    period_basis_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    period_basis_code: "activity",
    period_basis_name_en: "Activity",
    period_basis_name_ko: "활동",
    activity_start: 100,
    activity_end: 120
  });
  assert.equal(activity.polity.id, "cccccccc-cccc-4ccc-8ccc-cccccccccccc");
  assert.equal(activity.polity.canonical_name_en, "Stable Polity");
  assert.equal(activity.polity.preferred_name_ko, "안정 정치체");
  assert.equal(activity.polity.display_name, "시대 국호");
});

test("fallback projection preserves the pre-existing stable preferred polity label", () => {
  const activity = personRead.projectActivity({
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    person_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    polity_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    polity_name_en: "Stable Polity",
    polity_name_ko: "안정 정치체",
    polity_designation_name_en: null,
    polity_designation_name_ko: null,
    relation_type_id: null,
    role_id: null,
    period_basis_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    period_basis_code: "activity",
    period_basis_name_en: "Activity",
    period_basis_name_ko: "활동",
    activity_start: 100,
    activity_end: 120
  });
  assert.equal(activity.polity.display_name, "안정 정치체");
});
