"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

// Historical P5 schema-release evidence reader.
// Current clean-db reconstruction may materialize these reviewed SQL bodies,
// but this module intentionally exposes no release/apply mutation primitive.
const ROOT = path.resolve(__dirname, "..");
const RELEASE_PATH = path.join(ROOT, "stage2/releases/p5-additive-schema-release.v1.json");

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
  if (release?.safety?.non_destructive_schema_only !== true) throw new Error("STAGE2_SCHEMA_RELEASE_NON_DESTRUCTIVE_CONTRACT_INVALID");
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

module.exports = Object.freeze({
  RELEASE_PATH,
  computeGitBlobSha,
  stripTransactionEnvelope,
  readStage2SchemaRelease
});
