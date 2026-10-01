"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { applyAuthoringMigrations } = require("./atlas-authoring-migrations.js");
const { applyCorrectionMigrations } = require("./atlas-correction-migrations.js");
const { readStage2SchemaRelease } = require("./atlas-stage2-schema-release.js");
const { applyP9Cutover } = require("./atlas-stage2-p9-db-cutover.js");

const ROOT = path.resolve(__dirname, "..");
const BASELINE_PATH = path.join(ROOT, "db/schema/atlas_v2.current.sql");
const CURRENT_SCHEMA_PHASES = Object.freeze([
  "baseline",
  "correction",
  "stage2",
  "p9",
  "authoring"
]);

function readCurrentBaseline({ readFile = fs.readFileSync } = {}) {
  const sql = String(readFile(BASELINE_PATH, "utf8"));
  const executable = sql.replace(/^\s*--.*$/gm, "");
  if (/public\.person_politics|atlas_person_politics_compat_v1/i.test(executable)) {
    throw new Error("CURRENT_SCHEMA_BASELINE_LEGACY_OBJECT_FORBIDDEN");
  }
  return sql;
}

async function applyCurrentBaseline(client, options = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  await client.query(readCurrentBaseline(options));
  return Object.freeze({ phase:"baseline", path:BASELINE_PATH });
}

async function applyCurrentCorrectionSchema(client) {
  const result = await applyCorrectionMigrations(client);
  return Object.freeze({ phase:"correction", ...result });
}

function stage2ComponentIsSafe(component) {
  const normalized = String(component?.body || "").replace(/^\s*--.*$/gm, "");
  if (/\b(?:delete|update)\s+atlas_v2\.person_politics_v2\b/i.test(normalized)) return false;
  if (/\btruncate\b/i.test(normalized) || /\bdrop\s+(?:table|schema)\b/i.test(normalized)) return false;
  if (/territor|geometry/i.test(normalized)) return false;
  return true;
}

async function applyReviewedStage2SchemaBodies(client, options = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  const stage2 = readStage2SchemaRelease(options);
  const componentIds = [];
  for (const component of stage2.components) {
    if (!stage2ComponentIsSafe(component)) throw new Error(`CURRENT_SCHEMA_STAGE2_COMPONENT_UNSAFE:${component.id}`);
    await client.query(component.body);
    componentIds.push(component.id);
  }
  return Object.freeze({
    phase:"stage2",
    release_id:stage2.release.release_id,
    components:Object.freeze(componentIds)
  });
}

async function applyCurrentP9Cutover(client) {
  const result = await applyP9Cutover(client);
  return Object.freeze({ phase:"p9", ...result });
}

async function applyCurrentAuthoringSchema(client) {
  const result = await applyAuthoringMigrations(client);
  return Object.freeze({ phase:"authoring", ...result });
}

async function reconstructCurrentSchema(client, options = {}) {
  const baseline = await applyCurrentBaseline(client, options);
  const correction = await applyCurrentCorrectionSchema(client);
  const stage2 = await applyReviewedStage2SchemaBodies(client, options);
  const p9 = await applyCurrentP9Cutover(client);
  const authoring = await applyCurrentAuthoringSchema(client);
  return Object.freeze({
    schema:"atlas-current-schema-reconstruction/v1",
    phases:CURRENT_SCHEMA_PHASES,
    baseline,
    correction,
    stage2,
    p9,
    authoring
  });
}

module.exports = Object.freeze({
  BASELINE_PATH,
  CURRENT_SCHEMA_PHASES,
  readCurrentBaseline,
  applyCurrentBaseline,
  applyCurrentCorrectionSchema,
  applyReviewedStage2SchemaBodies,
  applyCurrentP9Cutover,
  applyCurrentAuthoringSchema,
  reconstructCurrentSchema
});
