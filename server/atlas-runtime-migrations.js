"use strict";

const fs = require("node:fs");
const path = require("node:path");

const RUNTIME_MIGRATION_PATHS = Object.freeze([
  path.resolve(__dirname, "../db/migrations/20260906_runtime_person_politics_projection_v1.sql")
]);

function readRuntimeMigrations({ readFile=fs.readFileSync } = {}) {
  return RUNTIME_MIGRATION_PATHS.map((migrationPath) => ({
    path:migrationPath,
    sql:readFile(migrationPath, "utf8")
  }));
}

async function applyRuntimeMigrations(client, { readFile } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  const migrations = readRuntimeMigrations({ ...(readFile ? { readFile } : {}) });
  for (const migration of migrations) await client.query(migration.sql);
  return Object.freeze({ applied:migrations.map((migration) => path.basename(migration.path)) });
}

module.exports = Object.freeze({ RUNTIME_MIGRATION_PATHS, readRuntimeMigrations, applyRuntimeMigrations });
