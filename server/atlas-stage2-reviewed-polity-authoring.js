"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const {
  activityFingerprint,
  requireExactRow
} = require("./atlas-stage2-reviewed-entity-authoring.js");

const MANIFEST_SCHEMA = "atlas-stage2-p7-reviewed-polities/v1";
const LOCK_KEY = "atlas-stage2:p7-reviewed-polity-authoring:v1";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const POLITY_FIELDS = Object.freeze(["id","canonical_key","polity_type","historicity"]);
const NAME_FIELDS = Object.freeze(["id","polity_id","locale","name","name_type","is_preferred","semantic_name_kind"]);

function requireUuid(value, code) {
  const id = String(value || "").trim().toLowerCase();
  if (!UUID_RE.test(id)) throw new Error(code);
  return id;
}

function readReviewedPolityAuthoringManifest(manifestPath) {
  if (!manifestPath) throw new Error("P7_POLITY_AUTHORING_MANIFEST_PATH_REQUIRED");
  const bytes = fs.readFileSync(path.resolve(manifestPath));
  const manifest = JSON.parse(bytes.toString("utf8"));
  if (manifest?.schema !== MANIFEST_SCHEMA) throw new Error("P7_POLITY_AUTHORING_MANIFEST_SCHEMA_INVALID");
  if (manifest?.status !== "REVIEWED_LITERAL_UUID_ROWS_BRANCH_ONLY_NO_PRODUCTION_MUTATION") throw new Error("P7_POLITY_AUTHORING_MANIFEST_STATUS_INVALID");
  if (manifest?.rules?.literal_uuid_insert_only !== true
    || manifest?.rules?.runtime_name_resolution_forbidden !== true
    || manifest?.rules?.existing_uuid_requires_exact_row_replay !== true
    || manifest?.rules?.canonical_key_collision_with_other_uuid_fails !== true
    || manifest?.rules?.preferred_name_collision_fails !== true
    || manifest?.rules?.activity_mutation_forbidden !== true
    || manifest?.rules?.territory_geometry_mutation_forbidden !== true
    || manifest?.rules?.production_mutation_authorized !== false) {
    throw new Error("P7_POLITY_AUTHORING_MANIFEST_SAFETY_INVALID");
  }
  if (!Array.isArray(manifest.polities) || manifest.polities.length === 0) throw new Error("P7_POLITY_AUTHORING_POLITIES_REQUIRED");
  const ids = new Set(), keys = new Set(), nameIds = new Set();
  let nameCount = 0;
  for (const item of manifest.polities) {
    const identityClass = String(item?.identity_class || "").trim();
    const row = item?.row;
    if (!identityClass || !row || typeof row !== "object" || Array.isArray(row)) throw new Error("P7_POLITY_AUTHORING_ROW_INVALID");
    const id = requireUuid(row.id, "P7_POLITY_AUTHORING_UUID_INVALID");
    const key = String(row.canonical_key || "").trim();
    if (!key || !String(row.polity_type || "").trim() || !String(row.historicity || "").trim()) throw new Error(`P7_POLITY_AUTHORING_FIELDS_INVALID:${identityClass}`);
    if (ids.has(id)) throw new Error("P7_POLITY_AUTHORING_UUID_REUSED");
    if (keys.has(key)) throw new Error("P7_POLITY_AUTHORING_CANONICAL_KEY_REUSED");
    ids.add(id); keys.add(key);
    if (!Array.isArray(item.names) || item.names.length === 0) throw new Error(`P7_POLITY_AUTHORING_NAMES_REQUIRED:${identityClass}`);
    const preferredLocales = new Set();
    for (const name of item.names) {
      const nameId = requireUuid(name?.id, "P7_POLITY_AUTHORING_NAME_UUID_INVALID");
      const parent = requireUuid(name?.polity_id, "P7_POLITY_AUTHORING_NAME_PARENT_INVALID");
      if (parent !== id) throw new Error(`P7_POLITY_AUTHORING_NAME_PARENT_MISMATCH:${identityClass}`);
      if (!String(name?.locale || "").trim() || !String(name?.name || "").trim() || !String(name?.name_type || "").trim() || !String(name?.semantic_name_kind || "").trim() || typeof name?.is_preferred !== "boolean") throw new Error(`P7_POLITY_AUTHORING_NAME_FIELDS_INVALID:${identityClass}`);
      if (nameIds.has(nameId)) throw new Error("P7_POLITY_AUTHORING_NAME_UUID_REUSED");
      nameIds.add(nameId);
      if (name.is_preferred) {
        if (preferredLocales.has(name.locale)) throw new Error(`P7_POLITY_AUTHORING_PREFERRED_LOCALE_REUSED:${identityClass}:${name.locale}`);
        preferredLocales.add(name.locale);
      }
      nameCount += 1;
    }
  }
  if (Number(manifest?.result?.polity_count) !== manifest.polities.length || Number(manifest?.result?.name_count) !== nameCount) throw new Error("P7_POLITY_AUTHORING_RESULT_COUNT_INVALID");
  return Object.freeze({ manifest, manifest_sha256: crypto.createHash("sha256").update(bytes).digest("hex") });
}

async function requirePolitySchema(client) {
  const result = await client.query(`select
    to_regclass('atlas_v2.polities') as polities,
    to_regclass('atlas_v2.polity_names') as names,
    exists(select 1 from information_schema.columns where table_schema='atlas_v2' and table_name='polity_names' and column_name='semantic_name_kind') as semantic_name_kind`);
  const row = result.rows[0];
  if (!row?.polities || !row?.names || !row?.semantic_name_kind) throw new Error("P7_POLITY_AUTHORING_STAGE2_SCHEMA_REQUIRED");
}

async function upsertExactPolity(client, item) {
  const expected = { ...item.row, id: requireUuid(item.row.id, "P7_POLITY_AUTHORING_UUID_INVALID") };
  const existing = await client.query(`select id::text,canonical_key,polity_type,historicity from atlas_v2.polities where id=$1::uuid for update`, [expected.id]);
  let polityInserted = false;
  if (existing.rowCount) requireExactRow(existing.rows[0], expected, POLITY_FIELDS, `P7_POLITY_UUID_DRIFT:${item.identity_class}`);
  else {
    const collision = await client.query(`select id::text from atlas_v2.polities where canonical_key=$1 limit 1`, [expected.canonical_key]);
    if (collision.rowCount) throw new Error(`P7_POLITY_CANONICAL_KEY_COLLISION:${item.identity_class}`);
    await client.query(`insert into atlas_v2.polities(id,canonical_key,polity_type,historicity) values($1::uuid,$2,$3,$4)`, [expected.id,expected.canonical_key,expected.polity_type,expected.historicity]);
    polityInserted = true;
  }
  let namesInserted = 0;
  for (const rawName of item.names) {
    const name = { ...rawName, id: requireUuid(rawName.id, "P7_POLITY_AUTHORING_NAME_UUID_INVALID"), polity_id: expected.id };
    const existingName = await client.query(`select id::text,polity_id::text,locale,name,name_type,is_preferred,semantic_name_kind from atlas_v2.polity_names where id=$1::uuid for update`, [name.id]);
    if (existingName.rowCount) {
      requireExactRow(existingName.rows[0], name, NAME_FIELDS, `P7_POLITY_NAME_UUID_DRIFT:${item.identity_class}`);
      continue;
    }
    if (name.is_preferred) {
      const preferred = await client.query(`select id::text from atlas_v2.polity_names where polity_id=$1::uuid and locale=$2 and is_preferred=true limit 1`, [expected.id,name.locale]);
      if (preferred.rowCount) throw new Error(`P7_POLITY_PREFERRED_NAME_COLLISION:${item.identity_class}:${name.locale}`);
    }
    await client.query(`insert into atlas_v2.polity_names(id,polity_id,locale,name,name_type,is_preferred,semantic_name_kind) values($1::uuid,$2::uuid,$3,$4,$5,$6,$7)`, [name.id,name.polity_id,name.locale,name.name,name.name_type,name.is_preferred,name.semantic_name_kind]);
    namesInserted += 1;
  }
  return { polityInserted, namesInserted };
}

async function verifyPostconditions(client, manifest) {
  for (const item of manifest.polities) {
    const p = await client.query(`select id::text,canonical_key,polity_type,historicity from atlas_v2.polities where id=$1::uuid`, [item.row.id]);
    requireExactRow(p.rows[0], item.row, POLITY_FIELDS, `P7_POLITY_POSTCONDITION:${item.identity_class}`);
    for (const name of item.names) {
      const n = await client.query(`select id::text,polity_id::text,locale,name,name_type,is_preferred,semantic_name_kind from atlas_v2.polity_names where id=$1::uuid`, [name.id]);
      requireExactRow(n.rows[0], name, NAME_FIELDS, `P7_POLITY_NAME_POSTCONDITION:${item.identity_class}`);
    }
  }
}

async function applyReviewedPolityAuthoring(client, { dryRun = false, manifestPath } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  const bundle = readReviewedPolityAuthoringManifest(manifestPath);
  await client.query("begin isolation level serializable");
  try {
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [LOCK_KEY]);
    await requirePolitySchema(client);
    const before = await activityFingerprint(client);
    let polities = 0, names = 0;
    for (const item of bundle.manifest.polities) {
      const result = await upsertExactPolity(client, item);
      polities += Number(result.polityInserted); names += result.namesInserted;
    }
    await verifyPostconditions(client, bundle.manifest);
    const after = await activityFingerprint(client);
    if (before.row_count !== after.row_count || before.fingerprint !== after.fingerprint) throw new Error("P7_POLITY_AUTHORING_ACTIVITY_MUTATION_DETECTED");
    const replay = polities === 0 && names === 0;
    const outcome = Object.freeze({ marker:"ATLAS_STAGE2_P7_REVIEWED_POLITY_AUTHORING_V1", manifest_sha256:bundle.manifest_sha256, dry_run:Boolean(dryRun), committed:!dryRun, replay, inserted:Object.freeze({polities,polity_names:names}), activity_fingerprint_before:before, activity_fingerprint_after:after });
    if (dryRun) await client.query("rollback"); else await client.query("commit");
    return outcome;
  } catch (error) {
    try { await client.query("rollback"); } catch {}
    throw error;
  }
}

module.exports = Object.freeze({ MANIFEST_SCHEMA, LOCK_KEY, POLITY_FIELDS, NAME_FIELDS, readReviewedPolityAuthoringManifest, applyReviewedPolityAuthoring });
