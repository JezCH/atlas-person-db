"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const RELEASE_PATH = path.join(ROOT, "stage2/releases/p5-additive-schema-release.v1.json");
const LOCK_KEY = "atlas-stage2-p5-additive-schema-release";

function computeGitBlobSha(content) {
  const body = Buffer.from(String(content), "utf8");
  return crypto.createHash("sha1").update(Buffer.from(`blob ${body.length}\0`, "utf8")).update(body).digest("hex");
}

function stripTransactionEnvelope(sql) {
  let body = String(sql);
  const begins = body.match(/^\s*BEGIN;\s*$/gim) || [];
  const commits = body.match(/^\s*COMMIT;\s*$/gim) || [];
  if (begins.length !== 1 || commits.length !== 1) throw new Error("STAGE2_SCHEMA_COMPONENT_TRANSACTION_ENVELOPE_INVALID");
  body = body.replace(/^\s*BEGIN;\s*$/im, "").replace(/^\s*COMMIT;\s*$/im, "");
  if (/^\s*(BEGIN|COMMIT|ROLLBACK);\s*$/im.test(body)) throw new Error("STAGE2_SCHEMA_COMPONENT_NESTED_TRANSACTION_FORBIDDEN");
  return body.trim();
}

function readStage2SchemaRelease({ readFile = fs.readFileSync } = {}) {
  const release = JSON.parse(readFile(RELEASE_PATH, "utf8"));
  if (release?.schema !== "atlas-stage2-p5-additive-schema-release/v1") throw new Error("STAGE2_SCHEMA_RELEASE_SCHEMA_INVALID");
  if (release?.status !== "RELEASE_CANDIDATE_BRANCH_ONLY_NO_PRODUCTION_MUTATION") throw new Error("STAGE2_SCHEMA_RELEASE_STATUS_INVALID");
  if (release?.safety?.production_apply_authorized !== false) throw new Error("STAGE2_SCHEMA_RELEASE_PRODUCTION_AUTHORIZATION_INVALID");
  const components = Array.isArray(release.components) ? release.components : [];
  if (components.length !== 6) throw new Error("STAGE2_SCHEMA_RELEASE_COMPONENT_COUNT_INVALID");
  const seen = new Set();
  const materialized = components.map((component, index) => {
    if (component.sequence !== index + 1 || !component.id || seen.has(component.id)) throw new Error("STAGE2_SCHEMA_RELEASE_COMPONENT_ORDER_INVALID");
    seen.add(component.id);
    const componentPath = path.resolve(ROOT, component.path);
    if (!componentPath.startsWith(`${ROOT}${path.sep}`)) throw new Error("STAGE2_SCHEMA_RELEASE_PATH_ESCAPE");
    const sql = readFile(componentPath, "utf8");
    const actualSha = computeGitBlobSha(sql);
    if (actualSha !== component.git_blob_sha) throw new Error(`STAGE2_SCHEMA_RELEASE_COMPONENT_SHA_DRIFT:${component.id}`);
    return Object.freeze({ ...component, path: componentPath, sql, body: stripTransactionEnvelope(sql) });
  });
  return Object.freeze({ release: Object.freeze(release), components: Object.freeze(materialized) });
}

async function ensureLedger(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS atlas_v2.stage2_schema_release_components (
      release_id text NOT NULL,
      component_id text NOT NULL,
      git_blob_sha text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT stage2_schema_release_components_pkey PRIMARY KEY (release_id, component_id),
      CONSTRAINT stage2_schema_release_components_sha_check CHECK (git_blob_sha ~ '^[0-9a-f]{40}$')
    )`);
}

async function applyStage2SchemaRelease(client, { readFile } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  const { release, components } = readStage2SchemaRelease({ ...(readFile ? { readFile } : {}) });
  const applied = [];
  const skipped = [];
  await client.query("SELECT pg_advisory_lock(hashtext($1))", [LOCK_KEY]);
  try {
    await ensureLedger(client);
    for (const component of components) {
      const prior = await client.query(
        `SELECT git_blob_sha FROM atlas_v2.stage2_schema_release_components WHERE release_id=$1 AND component_id=$2`,
        [release.release_id, component.id]
      );
      if (prior.rows.length) {
        if (prior.rows[0].git_blob_sha !== component.git_blob_sha) throw new Error(`STAGE2_SCHEMA_RELEASE_LEDGER_SHA_DRIFT:${component.id}`);
        skipped.push(component.id);
        continue;
      }
      await client.query("BEGIN");
      try {
        await client.query(component.body);
        await client.query(
          `INSERT INTO atlas_v2.stage2_schema_release_components(release_id,component_id,git_blob_sha) VALUES($1,$2,$3)`,
          [release.release_id, component.id, component.git_blob_sha]
        );
        await client.query("COMMIT");
        applied.push(component.id);
      } catch (error) {
        try { await client.query("ROLLBACK"); } catch {}
        throw error;
      }
    }
  } finally {
    try { await client.query("SELECT pg_advisory_unlock(hashtext($1))", [LOCK_KEY]); } catch {}
  }
  return Object.freeze({ release_id: release.release_id, applied: Object.freeze(applied), skipped: Object.freeze(skipped) });
}

module.exports = Object.freeze({
  RELEASE_PATH,
  LOCK_KEY,
  computeGitBlobSha,
  stripTransactionEnvelope,
  readStage2SchemaRelease,
  applyStage2SchemaRelease
});
