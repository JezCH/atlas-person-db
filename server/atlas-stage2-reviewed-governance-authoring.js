"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const {
  activityFingerprint,
  requireExactRow
} = require("./atlas-stage2-reviewed-entity-authoring.js");

const MANIFEST_SCHEMA = "atlas-stage2-p7-reviewed-governance-contexts/v1";
const MANIFEST_PATH = path.resolve(__dirname, "../stage2/authoring/p7-reviewed-governance-contexts.v1.json");
const LOCK_KEY = "atlas-stage2:p7-reviewed-governance-context-authoring:v1";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONTEXT_FIELDS = Object.freeze(["id","canonical_key","governance_type","historicity"]);
const NAME_FIELDS = Object.freeze(["id","governance_context_id","locale","name","name_type","is_preferred"]);
const GOVERNANCE_TYPES = new Set(["government","constitutional_regime","governing_regime"]);

function requireUuid(value, code) {
  const id = String(value || "").trim().toLowerCase();
  if (!UUID_RE.test(id)) throw new Error(code);
  return id;
}

function readReviewedGovernanceAuthoringManifest(manifestPath = MANIFEST_PATH) {
  const bytes = fs.readFileSync(manifestPath);
  const manifest = JSON.parse(bytes.toString("utf8"));
  if (manifest?.schema !== MANIFEST_SCHEMA) throw new Error("P7_GOVERNANCE_AUTHORING_MANIFEST_SCHEMA_INVALID");
  if (manifest?.status !== "REVIEWED_LITERAL_UUID_ROWS_BRANCH_ONLY_NO_PRODUCTION_MUTATION") {
    throw new Error("P7_GOVERNANCE_AUTHORING_MANIFEST_STATUS_INVALID");
  }
  if (manifest?.rules?.literal_uuid_insert_only !== true
    || manifest?.rules?.runtime_name_resolution_forbidden !== true
    || manifest?.rules?.existing_uuid_requires_exact_row_replay !== true
    || manifest?.rules?.canonical_key_collision_with_other_uuid_fails !== true
    || manifest?.rules?.preferred_name_collision_fails !== true
    || manifest?.rules?.activity_mutation_forbidden !== true
    || manifest?.rules?.territory_geometry_mutation_forbidden !== true
    || manifest?.rules?.production_mutation_authorized !== false) {
    throw new Error("P7_GOVERNANCE_AUTHORING_MANIFEST_SAFETY_INVALID");
  }
  const declaredContexts = Number(manifest?.result?.context_count);
  const declaredNames = Number(manifest?.result?.name_count);
  if (!Number.isInteger(declaredContexts) || declaredContexts <= 0
    || !Array.isArray(manifest.contexts) || manifest.contexts.length !== declaredContexts) {
    throw new Error("P7_GOVERNANCE_AUTHORING_CONTEXT_COUNT_INVALID");
  }

  const contextIds = new Set();
  const canonicalKeys = new Set();
  const nameIds = new Set();
  let nameCount = 0;
  for (const item of manifest.contexts) {
    const identityClass = String(item?.identity_class || "").trim();
    const row = item?.row;
    if (!identityClass || !row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error("P7_GOVERNANCE_AUTHORING_CONTEXT_INVALID");
    }
    const contextId = requireUuid(row.id, "P7_GOVERNANCE_AUTHORING_CONTEXT_UUID_INVALID");
    const canonicalKey = String(row.canonical_key || "").trim();
    if (!canonicalKey || !GOVERNANCE_TYPES.has(String(row.governance_type || "")) || !String(row.historicity || "").trim()) {
      throw new Error(`P7_GOVERNANCE_AUTHORING_CONTEXT_FIELDS_INVALID:${identityClass}`);
    }
    if (contextIds.has(contextId)) throw new Error("P7_GOVERNANCE_AUTHORING_CONTEXT_UUID_REUSED");
    if (canonicalKeys.has(canonicalKey)) throw new Error("P7_GOVERNANCE_AUTHORING_CANONICAL_KEY_REUSED");
    contextIds.add(contextId);
    canonicalKeys.add(canonicalKey);

    if (!Array.isArray(item.names) || item.names.length === 0) {
      throw new Error(`P7_GOVERNANCE_AUTHORING_NAMES_REQUIRED:${identityClass}`);
    }
    const preferredLocales = new Set();
    for (const name of item.names) {
      const nameId = requireUuid(name?.id, "P7_GOVERNANCE_AUTHORING_NAME_UUID_INVALID");
      const parentId = requireUuid(name?.governance_context_id, "P7_GOVERNANCE_AUTHORING_NAME_PARENT_UUID_INVALID");
      if (parentId !== contextId) throw new Error(`P7_GOVERNANCE_AUTHORING_NAME_PARENT_MISMATCH:${identityClass}`);
      const locale = String(name?.locale || "").trim();
      const value = String(name?.name || "").trim();
      const nameType = String(name?.name_type || "").trim();
      if (!locale || !value || !nameType || typeof name?.is_preferred !== "boolean") {
        throw new Error(`P7_GOVERNANCE_AUTHORING_NAME_FIELDS_INVALID:${identityClass}`);
      }
      if (nameIds.has(nameId)) throw new Error("P7_GOVERNANCE_AUTHORING_NAME_UUID_REUSED");
      nameIds.add(nameId);
      if (name.is_preferred) {
        if (preferredLocales.has(locale)) throw new Error(`P7_GOVERNANCE_AUTHORING_PREFERRED_LOCALE_REUSED:${identityClass}:${locale}`);
        preferredLocales.add(locale);
      }
      nameCount += 1;
    }
  }
  if (!Number.isInteger(declaredNames) || declaredNames !== nameCount) throw new Error("P7_GOVERNANCE_AUTHORING_NAME_COUNT_INVALID");
  return Object.freeze({
    manifest,
    manifest_sha256: crypto.createHash("sha256").update(bytes).digest("hex")
  });
}

async function requireGovernanceSchema(client) {
  const result = await client.query(`select
    to_regclass('atlas_v2.governance_contexts') as contexts,
    to_regclass('atlas_v2.governance_context_names') as names,
    to_regclass('atlas_v2.polity_governance_periods') as periods`);
  const row = result.rows[0];
  if (!row?.contexts || !row?.names || !row?.periods) throw new Error("P7_GOVERNANCE_AUTHORING_STAGE2_SCHEMA_REQUIRED");
}

async function upsertExactGovernanceContext(client, item) {
  const expected = {
    id: requireUuid(item.row.id, "P7_GOVERNANCE_AUTHORING_CONTEXT_UUID_INVALID"),
    canonical_key: item.row.canonical_key,
    governance_type: item.row.governance_type,
    historicity: item.row.historicity
  };
  const existing = await client.query(
    `select id::text,canonical_key,governance_type,historicity
       from atlas_v2.governance_contexts where id=$1::uuid for update`,
    [expected.id]
  );
  let contextInserted = false;
  if (existing.rowCount === 1) {
    requireExactRow(existing.rows[0], expected, CONTEXT_FIELDS, `P7_GOVERNANCE_CONTEXT_UUID_DRIFT:${item.identity_class}`);
  } else {
    const collision = await client.query(
      `select id::text from atlas_v2.governance_contexts where canonical_key=$1 limit 1`,
      [expected.canonical_key]
    );
    if (collision.rowCount) throw new Error(`P7_GOVERNANCE_CONTEXT_CANONICAL_KEY_COLLISION:${item.identity_class}`);
    await client.query(
      `insert into atlas_v2.governance_contexts(id,canonical_key,governance_type,historicity)
       values($1::uuid,$2,$3,$4)`,
      [expected.id, expected.canonical_key, expected.governance_type, expected.historicity]
    );
    contextInserted = true;
  }

  let namesInserted = 0;
  for (const rawName of item.names) {
    const expectedName = {
      id: requireUuid(rawName.id, "P7_GOVERNANCE_AUTHORING_NAME_UUID_INVALID"),
      governance_context_id: expected.id,
      locale: rawName.locale,
      name: rawName.name,
      name_type: rawName.name_type,
      is_preferred: rawName.is_preferred
    };
    const existingName = await client.query(
      `select id::text,governance_context_id::text,locale,name,name_type,is_preferred
         from atlas_v2.governance_context_names where id=$1::uuid for update`,
      [expectedName.id]
    );
    if (existingName.rowCount === 1) {
      requireExactRow(existingName.rows[0], expectedName, NAME_FIELDS, `P7_GOVERNANCE_CONTEXT_NAME_UUID_DRIFT:${item.identity_class}`);
      continue;
    }
    if (expectedName.is_preferred) {
      const preferredCollision = await client.query(
        `select id::text from atlas_v2.governance_context_names
          where governance_context_id=$1::uuid and locale=$2 and is_preferred=true limit 1`,
        [expected.id, expectedName.locale]
      );
      if (preferredCollision.rowCount) throw new Error(`P7_GOVERNANCE_CONTEXT_PREFERRED_NAME_COLLISION:${item.identity_class}:${expectedName.locale}`);
    }
    await client.query(
      `insert into atlas_v2.governance_context_names(id,governance_context_id,locale,name,name_type,is_preferred)
       values($1::uuid,$2::uuid,$3,$4,$5,$6)`,
      [expectedName.id, expectedName.governance_context_id, expectedName.locale, expectedName.name, expectedName.name_type, expectedName.is_preferred]
    );
    namesInserted += 1;
  }
  return { contextInserted, namesInserted };
}

async function verifyExactPostconditions(client, manifest) {
  for (const item of manifest.contexts) {
    const context = await client.query(
      `select id::text,canonical_key,governance_type,historicity
         from atlas_v2.governance_contexts where id=$1::uuid`,
      [item.row.id]
    );
    requireExactRow(context.rows[0], item.row, CONTEXT_FIELDS, `P7_GOVERNANCE_CONTEXT_POSTCONDITION:${item.identity_class}`);
    for (const name of item.names) {
      const row = await client.query(
        `select id::text,governance_context_id::text,locale,name,name_type,is_preferred
           from atlas_v2.governance_context_names where id=$1::uuid`,
        [name.id]
      );
      requireExactRow(row.rows[0], name, NAME_FIELDS, `P7_GOVERNANCE_CONTEXT_NAME_POSTCONDITION:${item.identity_class}`);
    }
  }
}

async function applyReviewedGovernanceAuthoring(client, { dryRun = false, manifestPath = MANIFEST_PATH } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  const bundle = readReviewedGovernanceAuthoringManifest(manifestPath);
  const { manifest } = bundle;
  await client.query("begin isolation level serializable");
  try {
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [LOCK_KEY]);
    await requireGovernanceSchema(client);
    const before = await activityFingerprint(client);
    let contextsInserted = 0;
    let namesInserted = 0;
    for (const item of manifest.contexts) {
      const result = await upsertExactGovernanceContext(client, item);
      contextsInserted += Number(result.contextInserted);
      namesInserted += result.namesInserted;
    }
    await verifyExactPostconditions(client, manifest);
    const after = await activityFingerprint(client);
    if (before.row_count !== after.row_count || before.fingerprint !== after.fingerprint) {
      throw new Error("P7_GOVERNANCE_AUTHORING_ACTIVITY_MUTATION_DETECTED");
    }
    const replay = contextsInserted === 0 && namesInserted === 0;
    const outcome = Object.freeze({
      marker: "ATLAS_STAGE2_P7_REVIEWED_GOVERNANCE_AUTHORING_V1",
      manifest_sha256: bundle.manifest_sha256,
      dry_run: Boolean(dryRun),
      committed: !dryRun,
      replay,
      inserted: Object.freeze({ governance_contexts: contextsInserted, governance_context_names: namesInserted }),
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
  CONTEXT_FIELDS,
  NAME_FIELDS,
  readReviewedGovernanceAuthoringManifest,
  requireGovernanceSchema,
  upsertExactGovernanceContext,
  verifyExactPostconditions,
  applyReviewedGovernanceAuthoring
});
