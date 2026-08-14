"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const {
  activityFingerprint,
  requireP5Schema,
  requireExactRow
} = require("./atlas-stage2-reviewed-entity-authoring.js");

const MANIFEST_SCHEMA = "atlas-stage2-p7-reviewed-relation-sources/v1";
const MANIFEST_PATH = path.resolve(__dirname, "../stage2/authoring/p7-reviewed-relation-sources.v1.json");
const LOCK_KEY = "atlas-stage2:p7-reviewed-source-authoring:v1";
const SOURCE_FIELDS = Object.freeze(["id","source_key","source_type","title","sha256","bytes","canonical_url","citation_text"]);

function readReviewedSourceAuthoringManifest(manifestPath = MANIFEST_PATH) {
  const bytes = fs.readFileSync(manifestPath);
  const manifest = JSON.parse(bytes.toString("utf8"));
  if (manifest?.schema !== MANIFEST_SCHEMA) throw new Error("P7_SOURCE_AUTHORING_MANIFEST_SCHEMA_INVALID");
  if (manifest?.status !== "REVIEWED_LITERAL_UUID_ROWS_BRANCH_ONLY_NO_PRODUCTION_MUTATION") throw new Error("P7_SOURCE_AUTHORING_MANIFEST_STATUS_INVALID");
  if (manifest?.rules?.literal_uuid_insert_only !== true
    || manifest?.rules?.runtime_title_or_url_resolution_forbidden !== true
    || manifest?.rules?.bibliographic_hash_and_bytes_must_be_null !== true
    || manifest?.rules?.source_locator_required_when_linked_to_activity_fragment !== true
    || manifest?.rules?.production_mutation_authorized !== false) {
    throw new Error("P7_SOURCE_AUTHORING_MANIFEST_SAFETY_INVALID");
  }
  const declared = Number(manifest?.result?.source_count);
  if (!Number.isInteger(declared) || declared <= 0 || !Array.isArray(manifest.sources) || manifest.sources.length !== declared) {
    throw new Error("P7_SOURCE_AUTHORING_SOURCE_COUNT_INVALID");
  }
  const ids = new Set();
  const keys = new Set();
  for (const item of manifest.sources) {
    const id = String(item?.row?.id || "").trim().toLowerCase();
    const sourceKey = String(item?.row?.source_key || "").trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)) throw new Error("P7_SOURCE_AUTHORING_UUID_INVALID");
    if (!sourceKey || item.candidate_key !== sourceKey) throw new Error("P7_SOURCE_AUTHORING_SOURCE_KEY_INVALID");
    if (ids.has(id)) throw new Error("P7_SOURCE_AUTHORING_UUID_REUSED");
    if (keys.has(sourceKey)) throw new Error("P7_SOURCE_AUTHORING_SOURCE_KEY_REUSED");
    if (item.row.sha256 !== null || item.row.bytes !== null) throw new Error("P7_SOURCE_AUTHORING_FAKE_MATERIALIZATION_FORBIDDEN");
    if (!String(item.row.canonical_url || "").startsWith("https://") || !String(item.row.citation_text || "").trim()) {
      throw new Error("P7_SOURCE_AUTHORING_BIBLIOGRAPHIC_EVIDENCE_REQUIRED");
    }
    ids.add(id);
    keys.add(sourceKey);
  }
  return Object.freeze({ manifest, manifest_sha256: crypto.createHash("sha256").update(bytes).digest("hex") });
}

async function upsertExactSource(client, item) {
  const expected = item.row;
  const existing = await client.query(
    `select id::text,source_key,source_type,title,sha256,bytes,canonical_url,citation_text
       from atlas_v2.sources where id=$1::uuid for update`,
    [expected.id]
  );
  if (existing.rowCount === 1) {
    requireExactRow(existing.rows[0], expected, SOURCE_FIELDS, `P7_SOURCE_UUID_DRIFT:${item.candidate_key}`);
    return false;
  }
  const collision = await client.query(`select id::text from atlas_v2.sources where source_key=$1 limit 1`, [expected.source_key]);
  if (collision.rowCount) throw new Error(`P7_SOURCE_KEY_COLLISION:${item.candidate_key}`);
  await client.query(
    `insert into atlas_v2.sources(id,source_key,source_type,title,sha256,bytes,canonical_url,citation_text)
     values($1::uuid,$2,$3,$4,$5,$6,$7,$8)`,
    [expected.id, expected.source_key, expected.source_type, expected.title, expected.sha256, expected.bytes, expected.canonical_url, expected.citation_text]
  );
  return true;
}

async function verifyExactPostconditions(client, manifest) {
  for (const item of manifest.sources) {
    const row = await client.query(
      `select id::text,source_key,source_type,title,sha256,bytes,canonical_url,citation_text
         from atlas_v2.sources where id=$1::uuid`,
      [item.row.id]
    );
    requireExactRow(row.rows[0], item.row, SOURCE_FIELDS, `P7_SOURCE_POSTCONDITION:${item.candidate_key}`);
  }
}

async function applyReviewedSourceAuthoring(client, { dryRun = false, manifestPath = MANIFEST_PATH } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  const bundle = readReviewedSourceAuthoringManifest(manifestPath);
  const { manifest } = bundle;
  await client.query("begin isolation level serializable");
  try {
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [LOCK_KEY]);
    await requireP5Schema(client);
    const before = await activityFingerprint(client);
    let inserted = 0;
    for (const item of manifest.sources) inserted += Number(await upsertExactSource(client, item));
    await verifyExactPostconditions(client, manifest);
    const after = await activityFingerprint(client);
    if (before.row_count !== after.row_count || before.fingerprint !== after.fingerprint) {
      throw new Error("P7_SOURCE_AUTHORING_ACTIVITY_MUTATION_DETECTED");
    }
    const outcome = Object.freeze({
      marker: "ATLAS_STAGE2_P7_REVIEWED_SOURCE_AUTHORING_V1",
      manifest_sha256: bundle.manifest_sha256,
      dry_run: Boolean(dryRun),
      committed: !dryRun,
      replay: inserted === 0,
      inserted_sources: inserted,
      activity_fingerprint_before: before,
      activity_fingerprint_after: after
    });
    if (dryRun) await client.query("rollback");
    else await client.query("commit");
    return outcome;
  } catch (error) {
    try { await client.query("rollback"); } catch {}
    throw error;
  }
}

module.exports = Object.freeze({
  MANIFEST_SCHEMA,
  MANIFEST_PATH,
  LOCK_KEY,
  SOURCE_FIELDS,
  readReviewedSourceAuthoringManifest,
  applyReviewedSourceAuthoring,
  upsertExactSource,
  verifyExactPostconditions
});
