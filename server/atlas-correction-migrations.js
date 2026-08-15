"use strict";

const fs = require("node:fs");
const path = require("node:path");

const CORRECTION_MIGRATION_PATHS = Object.freeze([
  path.resolve(__dirname, "../db/migrations/20260811_correction_manifest_runs.sql"),
  path.resolve(__dirname, "../db/migrations/20260812_correction_manifest_v1_1.sql"),
  path.resolve(__dirname, "../db/migrations/20260813_correction_manifest_v2.sql"),
  path.resolve(__dirname, "../db/migrations/20260815_correction_manifest_v1_2.sql")
]);

function readCorrectionMigrations({ readFile = fs.readFileSync } = {}) {
  return CORRECTION_MIGRATION_PATHS.map((migrationPath) => ({
    path: migrationPath,
    sql: readFile(migrationPath, "utf8")
  }));
}

async function applyCorrectionMigrations(client, { readFile } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  const migrations = readCorrectionMigrations({ ...(readFile ? { readFile } : {}) });
  for (const migration of migrations) await client.query(migration.sql);
  return Object.freeze({ applied: migrations.map((migration) => path.basename(migration.path)) });
}

module.exports = Object.freeze({
  CORRECTION_MIGRATION_PATHS,
  readCorrectionMigrations,
  applyCorrectionMigrations
});
