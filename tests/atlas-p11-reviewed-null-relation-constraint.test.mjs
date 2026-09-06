import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync("db/migrations/20260906_p11_reviewed_null_relation_constraint.sql", "utf8");
const correctionMigrations = fs.readFileSync("server/atlas-correction-migrations.js", "utf8");
const humanAuthoring = fs.readFileSync("server/atlas-human-authoring-service.js", "utf8");
const baselineB = fs.readFileSync("server/atlas-baseline-b.js", "utf8");
const reviewedExceptions = JSON.parse(fs.readFileSync("stage2/contracts/p11-reviewed-semantic-v2-exceptions.v1.json", "utf8"));

test("P11 permits reviewed unresolved relation while retaining relation-without-polity protection", () => {
  assert.match(migration, /DROP CONSTRAINT person_politics_v2_primary_polity_relation_pair_check/);
  assert.match(migration, /CHECK \(relation_type_id IS NULL OR polity_id IS NOT NULL\)/);
  assert.match(migration, /ATLAS_P11_RELATION_REQUIRES_POLITY_V1/);
  assert.doesNotMatch(migration, /CHECK \(\(polity_id IS NULL\) = \(relation_type_id IS NULL\)\)/);
});

test("P11 constraint migration is part of the post-Stage2 correction path", () => {
  const oldFinal = correctionMigrations.indexOf("20260824_person_polity_community_final_corrections.sql");
  const p11Fix = correctionMigrations.indexOf("20260906_p11_reviewed_null_relation_constraint.sql");
  assert.ok(oldFinal >= 0);
  assert.ok(p11Fix > oldFinal);
});

test("normal Human Authoring still rejects a one-sided primary polity/relation pair", () => {
  assert.match(humanAuthoring, /\(polity == null\) !== \(relationCode == null\)/);
  assert.match(humanAuthoring, /HUMAN_AUTHORING_PRIMARY_POLITY_RELATION_PAIR_REQUIRED/);
});

test("P11 readiness remains the allowlist gate for unresolved reviewed relations", () => {
  assert.equal(reviewedExceptions.rules.exception_scope, "relation_type_id_only");
  assert.equal(reviewedExceptions.rules.temporal_boundary_metadata_must_be_complete, true);
  assert.equal(reviewedExceptions.rules.unknown_incomplete_activity_outside_this_list_blocks_p11, true);
  assert.match(baselineB, /semantic_v2_blocking_incomplete/);
  assert.match(baselineB, /ACTIVITY_SEMANTIC_V2_BLOCKING_INCOMPLETE/);
});
