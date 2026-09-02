"use strict";

const fs = require("node:fs");
const path = require("node:path");

const AUTHORING_MIGRATION_PATHS = Object.freeze([
  path.resolve(__dirname, "../db/migrations/20260811_authoring_manifest_runs.sql"),
  path.resolve(__dirname, "../db/migrations/20260811_authoring_result_snapshot.sql"),
  path.resolve(__dirname, "../db/migrations/20260814_authoring_ledger_live_reference_lifecycle.sql"),
  path.resolve(__dirname, "../db/migrations/20260815_human_authoring_manifest_schema.sql"),
  path.resolve(__dirname, "../db/migrations/20260821_person_external_references.sql"),
  path.resolve(__dirname, "../db/migrations/20260821_human_authoring_external_reference_sync.sql"),
  path.resolve(__dirname, "../db/migrations/20260902_ongoing_activity_terms.sql")
]);

function readAuthoringMigrations({ readFile = fs.readFileSync } = {}) {
  return AUTHORING_MIGRATION_PATHS.map((migrationPath) => ({
    path: migrationPath,
    sql: readFile(migrationPath, "utf8")
  }));
}

async function applyAuthoringMigrations(client, { readFile } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  const migrations = readAuthoringMigrations({ ...(readFile ? { readFile } : {}) });
  for (const migration of migrations) {
    await client.query(migration.sql);
  }
  return Object.freeze({ applied: migrations.map((migration) => path.basename(migration.path)) });
}

module.exports = Object.freeze({
  AUTHORING_MIGRATION_PATHS,
  readAuthoringMigrations,
  applyAuthoringMigrations
});
