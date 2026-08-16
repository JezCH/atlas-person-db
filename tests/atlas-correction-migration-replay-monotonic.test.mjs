import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const historicalV11 = fs.readFileSync(new URL("../db/migrations/20260812_correction_manifest_v1_1.sql", import.meta.url), "utf8");
const currentV2 = fs.readFileSync(new URL("../db/migrations/20260813_correction_manifest_v2.sql", import.meta.url), "utf8");
const currentV12 = fs.readFileSync(new URL("../db/migrations/20260815_correction_manifest_v1_2.sql", import.meta.url), "utf8");

const SUPPORTED = [
  "atlas-correction-manifest/v1",
  "atlas-correction-manifest/v1.1",
  "atlas-correction-manifest/v1.2",
  "atlas-correction-manifest/v2"
];

function assertSupersetConstraint(sql, label) {
  assert.match(sql, /DROP CONSTRAINT IF EXISTS correction_manifest_runs_manifest_schema_check/i, `${label} must replace the discriminator explicitly`);
  assert.match(sql, /ADD CONSTRAINT correction_manifest_runs_manifest_schema_check/i, `${label} must restore the discriminator`);
  for (const schema of SUPPORTED) {
    assert.ok(sql.includes(`'${schema}'`), `${label} must preserve already-written ${schema} ledger rows during replay`);
  }
}

test("historical v1.1 correction migration cannot narrow a ledger that already contains v1.2 or v2 rows", () => {
  assertSupersetConstraint(historicalV11, "20260812 v1.1 migration");
});

test("all constraint-replacing current correction migrations accept the same supported manifest-schema superset", () => {
  assertSupersetConstraint(currentV2, "20260813 v2 migration");
  assertSupersetConstraint(currentV12, "20260815 v1.2 migration");
});

test("replay-monotonic migration fix is bounded to ledger schema discrimination, not Activity mutation", () => {
  for (const sql of [historicalV11, currentV2, currentV12]) {
    assert.doesNotMatch(sql, /UPDATE\s+atlas_v2\.person_politics_v2|DELETE\s+FROM\s+atlas_v2\.person_politics_v2|INSERT\s+INTO\s+atlas_v2\.person_politics_v2/i);
  }
});
