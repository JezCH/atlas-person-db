"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { assertReplaySafeCanonicalMigration } = require("./atlas-replay-migration-safety.js");

const AUTHORING_MIGRATION_PATHS = Object.freeze([
  path.resolve(__dirname, "../db/migrations/20260811_authoring_manifest_runs.sql"),
  path.resolve(__dirname, "../db/migrations/20260811_authoring_result_snapshot.sql"),
  path.resolve(__dirname, "../db/migrations/20260814_authoring_ledger_live_reference_lifecycle.sql"),
  path.resolve(__dirname, "../db/migrations/20260815_human_authoring_manifest_schema.sql"),
  path.resolve(__dirname, "../db/migrations/20260821_person_external_references.sql"),
  path.resolve(__dirname, "../db/migrations/20260821_human_authoring_external_reference_sync.sql"),
  path.resolve(__dirname, "../db/migrations/20260902_ongoing_activity_terms.sql"),
  path.resolve(__dirname, "../db/migrations/20260904_person_representative_domains.sql"),
  path.resolve(__dirname, "../db/migrations/20260905_person_representative_domain_standard_v1.sql"),
  path.resolve(__dirname, "../db/migrations/20260906_p13a_temporal_unknown_boundaries.sql"),
  path.resolve(__dirname, "../db/migrations/20260906_p13_source_place_objects.sql"),
  path.resolve(__dirname, "../db/migrations/20260920_person_portraits.sql")
]);

const AUTHORING_APPLY_MIGRATION_PATHS = Object.freeze([
  path.resolve(__dirname, "../db/migrations/20260811_authoring_manifest_runs.sql"),
  path.resolve(__dirname, "../db/migrations/20260811_authoring_result_snapshot.sql"),
  path.resolve(__dirname, "../db/migrations/20260814_authoring_ledger_live_reference_lifecycle.sql"),
  path.resolve(__dirname, "../db/migrations/20260815_human_authoring_manifest_schema.sql"),
  path.resolve(__dirname, "../db/migrations/20260821_person_external_references.sql"),
  path.resolve(__dirname, "../db/migrations/20260821_human_authoring_external_reference_sync.sql"),
  path.resolve(__dirname, "../db/migrations/20260902_ongoing_activity_terms.sql"),
  path.resolve(__dirname, "../db/migrations/20260904_person_representative_domains.sql"),
  path.resolve(__dirname, "../db/migrations/20260919_person_representative_domain_standard_replay_safe.sql"),
  path.resolve(__dirname, "../db/migrations/20260906_p13a_temporal_unknown_boundaries.sql"),
  path.resolve(__dirname, "../db/migrations/20260906_p13_source_place_objects.sql"),
  path.resolve(__dirname, "../db/migrations/20260920_person_portraits.sql")
]);

function readMigrationPaths(migrationPaths, { readFile = fs.readFileSync } = {}) {
  return migrationPaths.map((migrationPath) => ({
    path: migrationPath,
    sql: readFile(migrationPath, "utf8")
  }));
}

function readAuthoringMigrations(options = {}) {
  return readMigrationPaths(AUTHORING_MIGRATION_PATHS, options);
}

function readAuthoringApplyMigrations(options = {}) {
  return readMigrationPaths(AUTHORING_APPLY_MIGRATION_PATHS, options);
}

async function applyAuthoringMigrations(client, { readFile } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  const migrations = readAuthoringApplyMigrations({ ...(readFile ? { readFile } : {}) });
  for (const migration of migrations) {
    assertReplaySafeCanonicalMigration({
      migrationPath: migration.path,
      sql: migration.sql,
      surface: "authoring-apply"
    });
    await client.query(migration.sql);
  }
  return Object.freeze({ applied: migrations.map((migration) => path.basename(migration.path)) });
}

module.exports = Object.freeze({
  AUTHORING_MIGRATION_PATHS,
  AUTHORING_APPLY_MIGRATION_PATHS,
  readAuthoringMigrations,
  readAuthoringApplyMigrations,
  applyAuthoringMigrations
});
