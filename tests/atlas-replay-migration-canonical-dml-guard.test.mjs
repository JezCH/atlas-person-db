import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const safety = require("../server/atlas-replay-migration-safety.js");
const authoring = require("../server/atlas-authoring-migrations.js");
const correction = require("../server/atlas-correction-migrations.js");
const runtime = require("../server/atlas-runtime-migrations.js");

function basenameList(paths) {
  return paths.map((entry) => path.basename(entry));
}

function assertRegistryReplaySafe(label, paths) {
  for (const migrationPath of paths) {
    const sql = fs.readFileSync(migrationPath, "utf8");
    assert.doesNotThrow(
      () => safety.assertReplaySafeCanonicalMigration({
        migrationPath,
        sql,
        surface: label
      }),
      `${label} must reject canonical DML before execution: ${path.basename(migrationPath)}`
    );
  }
}

test("common replay guard rejects canonical identity/activity DML", () => {
  for (const sql of [
    "UPDATE atlas_v2.persons SET representative_domain='governance';",
    "INSERT INTO atlas_v2.person_politics_v2(id) VALUES ('00000000-0000-0000-0000-000000000000');",
    "DELETE FROM atlas_v2.polities WHERE false;",
    "MERGE INTO atlas_v2.person_names p USING x ON false WHEN NOT MATCHED THEN INSERT DEFAULT VALUES;",
    "TRUNCATE TABLE atlas_v2.place_names;"
  ]) {
    assert.throws(
      () => safety.assertReplaySafeCanonicalMigration({
        migrationPath: "synthetic.sql",
        sql,
        surface: "test"
      }),
      (error) => error?.code === "REPLAY_MIGRATION_CANONICAL_DML_FORBIDDEN"
    );
  }
});

test("common replay guard permits schema work and non-core replay read-model maintenance", () => {
  assert.doesNotThrow(() => safety.assertReplaySafeCanonicalMigration({
    migrationPath: "safe.sql",
    surface: "test",
    sql: `
      ALTER TABLE atlas_v2.persons ADD COLUMN IF NOT EXISTS example text;
      INSERT INTO atlas_v2.person_external_references(person_id, provider, status, checked_at)
      SELECT id, 'example', 'not_found', CURRENT_DATE FROM atlas_v2.persons WHERE false
      ON CONFLICT (person_id, provider) DO NOTHING;
    `
  }));
});

test("all live replay registries are canonical-DML-free", () => {
  assertRegistryReplaySafe("authoring-apply", authoring.AUTHORING_APPLY_MIGRATION_PATHS);
  assertRegistryReplaySafe("correction-apply", correction.CORRECTION_MIGRATION_PATHS);
  assertRegistryReplaySafe("correction-post-stage2", correction.CORRECTION_APPLY_POST_STAGE2_MIGRATION_PATHS);
  assertRegistryReplaySafe("runtime-compile", runtime.RUNTIME_MIGRATION_PATHS);
});

test("historical one-time data migrations stay outside live replay registries", () => {
  const authoringFull = basenameList(authoring.AUTHORING_MIGRATION_PATHS);
  const authoringLive = basenameList(authoring.AUTHORING_APPLY_MIGRATION_PATHS);
  assert.ok(authoringFull.includes("20260905_person_representative_domain_standard_v1.sql"));
  assert.ok(!authoringLive.includes("20260905_person_representative_domain_standard_v1.sql"));
  assert.ok(authoringLive.includes("20260919_person_representative_domain_standard_replay_safe.sql"));

  const correctionFull = basenameList(correction.POST_STAGE2_MIGRATION_PATHS);
  const correctionLive = basenameList(correction.CORRECTION_APPLY_POST_STAGE2_MIGRATION_PATHS);
  assert.ok(correctionFull.includes("20260823_person_polity_community_reviewed_corrections.sql"));
  assert.ok(correctionFull.includes("20260824_person_polity_community_final_corrections.sql"));
  assert.ok(!correctionLive.includes("20260823_person_polity_community_reviewed_corrections.sql"));
  assert.ok(!correctionLive.includes("20260824_person_polity_community_final_corrections.sql"));
});

test("known historical canonical rewrites are detected by the common guard", () => {
  const unsafePaths = [
    authoring.AUTHORING_MIGRATION_PATHS.find((entry) => entry.endsWith("20260905_person_representative_domain_standard_v1.sql")),
    correction.POST_STAGE2_MIGRATION_PATHS.find((entry) => entry.endsWith("20260823_person_polity_community_reviewed_corrections.sql")),
    correction.POST_STAGE2_MIGRATION_PATHS.find((entry) => entry.endsWith("20260824_person_polity_community_final_corrections.sql"))
  ];

  for (const migrationPath of unsafePaths) {
    const sql = fs.readFileSync(migrationPath, "utf8");
    assert.throws(
      () => safety.assertReplaySafeCanonicalMigration({
        migrationPath,
        sql,
        surface: "historical-one-time"
      }),
      (error) => error?.code === "REPLAY_MIGRATION_CANONICAL_DML_FORBIDDEN",
      `historical canonical rewrite must remain classified as one-time: ${path.basename(migrationPath)}`
    );
  }
});
