"use strict";

const fs = require("node:fs");
const path = require("node:path");

const CORRECTION_MIGRATION_PATHS = Object.freeze([
  path.resolve(__dirname, "../db/migrations/20260811_correction_manifest_runs.sql"),
  path.resolve(__dirname, "../db/migrations/20260812_correction_manifest_v1_1.sql"),
  path.resolve(__dirname, "../db/migrations/20260813_correction_manifest_v2.sql"),
  path.resolve(__dirname, "../db/migrations/20260815_correction_manifest_v1_2.sql"),
  path.resolve(__dirname, "../db/migrations/20260821_correction_manifest_v1_3.sql")
]);

const POST_STAGE2_MIGRATION_PATHS = Object.freeze([
  path.resolve(__dirname, "../db/migrations/20260822_person_politics_context_polities.sql"),
  path.resolve(__dirname, "../db/migrations/20260823_person_polity_community_reviewed_corrections.sql"),
  path.resolve(__dirname, "../db/migrations/20260824_person_polity_community_final_corrections.sql")
]);

function readMigrationPaths(migrationPaths, { readFile = fs.readFileSync } = {}) {
  return migrationPaths.map((migrationPath) => ({
    path: migrationPath,
    sql: readFile(migrationPath, "utf8")
  }));
}

function readCorrectionMigrations(options = {}) {
  return readMigrationPaths(CORRECTION_MIGRATION_PATHS, options);
}

function readPostStage2Migrations(options = {}) {
  return readMigrationPaths(POST_STAGE2_MIGRATION_PATHS, options);
}

async function stage2SemanticSchemaReady(client) {
  const result = await client.query(`
    select
      to_regclass('atlas_v2.person_polity_relation_types') is not null as relation_catalog,
      exists(
        select 1
          from information_schema.columns
         where table_schema='atlas_v2'
           and table_name='person_politics_v2'
           and column_name='relation_type_id'
      ) as relation_column
  `);
  return result.rows[0]?.relation_catalog === true && result.rows[0]?.relation_column === true;
}

async function applyMigrationPaths(client, migrationPaths, options = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  const migrations = readMigrationPaths(migrationPaths, options);
  for (const migration of migrations) await client.query(migration.sql);
  return Object.freeze({ applied: migrations.map((migration) => path.basename(migration.path)) });
}

async function applyPostStage2Migrations(client, options = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  if (!(await stage2SemanticSchemaReady(client))) throw new Error("POST_STAGE2_SEMANTIC_SCHEMA_REQUIRED");
  return applyMigrationPaths(client, POST_STAGE2_MIGRATION_PATHS, options);
}

async function applyCorrectionMigrations(client, options = {}) {
  const result = await applyMigrationPaths(client, CORRECTION_MIGRATION_PATHS, options);

  // Production correction execution happens after the reviewed Stage 2 schema
  // release. Apply post-Stage2 structural migrations there without polluting
  // the bounded correction-ledger registry. Fresh pre-Stage2 baseline rebuilds
  // deliberately skip this phase and apply it explicitly after P5.
  if (await stage2SemanticSchemaReady(client)) await applyPostStage2Migrations(client, options);

  return result;
}

module.exports = Object.freeze({
  CORRECTION_MIGRATION_PATHS,
  POST_STAGE2_MIGRATION_PATHS,
  readCorrectionMigrations,
  readPostStage2Migrations,
  stage2SemanticSchemaReady,
  applyCorrectionMigrations,
  applyPostStage2Migrations
});
