"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const MANIFEST_SCHEMA = "atlas-stage2-p5-reviewed-identity-source-authoring/v1";
const MANIFEST_PATH = path.resolve(__dirname, "../stage2/execution/p5-reviewed-identity-source-authoring.v1.json");
const LOCK_KEY = "atlas-stage2:p5-reviewed-identity-source-authoring:v1";

function readReviewedEntityAuthoringManifest(manifestPath = MANIFEST_PATH) {
  const bytes = fs.readFileSync(manifestPath);
  const manifest = JSON.parse(bytes.toString("utf8"));
  if (manifest?.schema !== MANIFEST_SCHEMA) throw new Error("P5_ENTITY_AUTHORING_MANIFEST_SCHEMA_INVALID");
  if (manifest?.status !== "REVIEWED_EXACT_ROWS_BRANCH_ONLY_NO_PRODUCTION_MUTATION") throw new Error("P5_ENTITY_AUTHORING_MANIFEST_STATUS_INVALID");
  if (manifest?.rules?.literal_uuid_insert_only !== true
    || manifest?.rules?.name_or_url_identity_resolution_forbidden !== true
    || manifest?.rules?.activity_mutation_forbidden !== true
    || manifest?.rules?.territory_geometry_mutation_forbidden !== true
    || manifest?.rules?.production_mutation_authorized !== false) {
    throw new Error("P5_ENTITY_AUTHORING_MANIFEST_SAFETY_INVALID");
  }
  if (!Array.isArray(manifest.polities) || manifest.polities.length !== 17) throw new Error("P5_ENTITY_AUTHORING_POLITY_COUNT_INVALID");
  const declaredSourceCount = Number(manifest?.result?.new_source_rows);
  if (!Number.isInteger(declaredSourceCount) || declaredSourceCount < 9 || !Array.isArray(manifest.sources) || manifest.sources.length !== declaredSourceCount) {
    throw new Error("P5_ENTITY_AUTHORING_SOURCE_COUNT_INVALID");
  }
  const sourceIds = new Set();
  const sourceKeys = new Set();
  for (const item of manifest.sources) {
    const id = String(item?.row?.id || "").toLowerCase();
    const key = String(item?.candidate_key || "");
    if (sourceIds.has(id)) throw new Error("P5_ENTITY_AUTHORING_SOURCE_UUID_REUSED");
    if (sourceKeys.has(key)) throw new Error("P5_ENTITY_AUTHORING_SOURCE_KEY_REUSED");
    sourceIds.add(id);
    sourceKeys.add(key);
  }
  return Object.freeze({
    manifest,
    manifest_sha256: crypto.createHash("sha256").update(bytes).digest("hex")
  });
}

function sameValue(left, right) {
  if (left === null || right === null) return left === right;
  if (typeof left === "boolean" || typeof right === "boolean") return left === right;
  return String(left) === String(right);
}

function requireExactRow(actual, expected, fields, code) {
  if (!actual) throw new Error(`${code}:MISSING`);
  for (const field of fields) {
    if (!sameValue(actual[field], expected[field])) throw new Error(`${code}:${field}`);
  }
}

async function requireP5Schema(client) {
  const result = await client.query(`
    select
      to_regclass('atlas_v2.person_polity_relation_types') as relation_catalog,
      to_regclass('atlas_v2.polity_relations') as polity_relations,
      exists(
        select 1 from information_schema.columns
         where table_schema='atlas_v2' and table_name='polity_names' and column_name='semantic_name_kind'
      ) as semantic_name_kind,
      exists(
        select 1 from information_schema.columns
         where table_schema='atlas_v2' and table_name='sources' and column_name='canonical_url'
      ) as source_url
  `);
  const row = result.rows[0];
  if (!row?.relation_catalog || !row?.polity_relations || !row?.semantic_name_kind || !row?.source_url) {
    throw new Error("P5_ADDITIVE_SCHEMA_REQUIRED");
  }
}

async function activityFingerprint(client) {
  const result = await client.query(`
    select count(*)::int as row_count,
           md5(coalesce(string_agg(row_to_json(x)::text, '|' order by x.id::text), '')) as fingerprint
      from (
        select id,person_id,polity_id,role_id,period_basis_id,activity_start,activity_end,
               confidence,chronology_status,legacy_source_key,notes,source_locator,content_hash
          from atlas_v2.person_politics_v2
      ) x
  `);
  return Object.freeze(result.rows[0]);
}

async function upsertExactPolity(client, item) {
  const expected = item.polity;
  const existing = await client.query(
    `select id::text,canonical_key,polity_type,historicity from atlas_v2.polities where id=$1::uuid for update`,
    [expected.id]
  );
  let inserted = false;
  if (existing.rowCount === 1) {
    requireExactRow(existing.rows[0], expected, ["id","canonical_key","polity_type","historicity"], `P5_POLITY_UUID_DRIFT:${item.identity_class}`);
  } else {
    const collision = await client.query(`select id::text from atlas_v2.polities where canonical_key=$1 limit 1`, [expected.canonical_key]);
    if (collision.rowCount) throw new Error(`P5_POLITY_CANONICAL_KEY_COLLISION:${item.identity_class}`);
    await client.query(
      `insert into atlas_v2.polities(id,canonical_key,polity_type,historicity) values($1::uuid,$2,$3,$4)`,
      [expected.id, expected.canonical_key, expected.polity_type, expected.historicity]
    );
    inserted = true;
  }

  const name = item.preferred_name;
  const existingName = await client.query(
    `select id::text,polity_id::text,locale,name,name_type,is_preferred,semantic_name_kind
       from atlas_v2.polity_names where id=$1::uuid for update`,
    [name.id]
  );
  let nameInserted = false;
  if (existingName.rowCount === 1) {
    requireExactRow(existingName.rows[0], name,
      ["id","polity_id","locale","name","name_type","is_preferred","semantic_name_kind"],
      `P5_POLITY_NAME_UUID_DRIFT:${item.identity_class}`);
  } else {
    const preferredCollision = await client.query(
      `select id::text from atlas_v2.polity_names where polity_id=$1::uuid and locale=$2 and is_preferred=true limit 1`,
      [name.polity_id, name.locale]
    );
    if (preferredCollision.rowCount) throw new Error(`P5_POLITY_PREFERRED_NAME_COLLISION:${item.identity_class}`);
    await client.query(
      `insert into atlas_v2.polity_names(id,polity_id,locale,name,name_type,is_preferred,semantic_name_kind)
       values($1::uuid,$2::uuid,$3,$4,$5,$6,$7)`,
      [name.id, name.polity_id, name.locale, name.name, name.name_type, name.is_preferred, name.semantic_name_kind]
    );
    nameInserted = true;
  }
  return { polity_inserted: inserted, name_inserted: nameInserted };
}

async function upsertExactSource(client, item) {
  const expected = item.row;
  const existing = await client.query(
    `select id::text,source_key,source_type,title,sha256,bytes,canonical_url,citation_text
       from atlas_v2.sources where id=$1::uuid for update`,
    [expected.id]
  );
  if (existing.rowCount === 1) {
    requireExactRow(existing.rows[0], expected,
      ["id","source_key","source_type","title","sha256","bytes","canonical_url","citation_text"],
      `P5_SOURCE_UUID_DRIFT:${item.candidate_key}`);
    return { source_inserted: false };
  }
  const collision = await client.query(`select id::text from atlas_v2.sources where source_key=$1 limit 1`, [expected.source_key]);
  if (collision.rowCount) throw new Error(`P5_SOURCE_KEY_COLLISION:${item.candidate_key}`);
  await client.query(
    `insert into atlas_v2.sources(id,source_key,source_type,title,sha256,bytes,canonical_url,citation_text)
     values($1::uuid,$2,$3,$4,$5,$6,$7,$8)`,
    [expected.id, expected.source_key, expected.source_type, expected.title, expected.sha256, expected.bytes, expected.canonical_url, expected.citation_text]
  );
  return { source_inserted: true };
}

async function verifyExactPostconditions(client, manifest) {
  for (const item of manifest.polities) {
    const p = await client.query(
      `select id::text,canonical_key,polity_type,historicity from atlas_v2.polities where id=$1::uuid`,
      [item.polity.id]
    );
    requireExactRow(p.rows[0], item.polity, ["id","canonical_key","polity_type","historicity"], `P5_POLITY_POSTCONDITION:${item.identity_class}`);
    const n = await client.query(
      `select id::text,polity_id::text,locale,name,name_type,is_preferred,semantic_name_kind
         from atlas_v2.polity_names where id=$1::uuid`,
      [item.preferred_name.id]
    );
    requireExactRow(n.rows[0], item.preferred_name,
      ["id","polity_id","locale","name","name_type","is_preferred","semantic_name_kind"],
      `P5_POLITY_NAME_POSTCONDITION:${item.identity_class}`);
  }
  for (const item of manifest.sources) {
    const s = await client.query(
      `select id::text,source_key,source_type,title,sha256,bytes,canonical_url,citation_text
         from atlas_v2.sources where id=$1::uuid`,
      [item.row.id]
    );
    requireExactRow(s.rows[0], item.row,
      ["id","source_key","source_type","title","sha256","bytes","canonical_url","citation_text"],
      `P5_SOURCE_POSTCONDITION:${item.candidate_key}`);
  }
}

async function applyReviewedEntityAuthoring(client, { dryRun = false, manifestPath = MANIFEST_PATH } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  const bundle = readReviewedEntityAuthoringManifest(manifestPath);
  const { manifest } = bundle;
  await client.query("begin isolation level serializable");
  try {
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [LOCK_KEY]);
    await requireP5Schema(client);
    const before = await activityFingerprint(client);
    let polityInserted = 0;
    let nameInserted = 0;
    let sourceInserted = 0;
    for (const item of manifest.polities) {
      const result = await upsertExactPolity(client, item);
      polityInserted += Number(result.polity_inserted);
      nameInserted += Number(result.name_inserted);
    }
    for (const item of manifest.sources) {
      const result = await upsertExactSource(client, item);
      sourceInserted += Number(result.source_inserted);
    }
    await verifyExactPostconditions(client, manifest);
    const after = await activityFingerprint(client);
    if (before.row_count !== after.row_count || before.fingerprint !== after.fingerprint) {
      throw new Error("P5_ENTITY_AUTHORING_ACTIVITY_MUTATION_DETECTED");
    }
    const replay = polityInserted === 0 && nameInserted === 0 && sourceInserted === 0;
    const outcome = Object.freeze({
      marker: "ATLAS_STAGE2_P5_REVIEWED_ENTITY_AUTHORING_V1",
      manifest_sha256: bundle.manifest_sha256,
      dry_run: Boolean(dryRun),
      committed: !dryRun,
      replay,
      inserted: Object.freeze({
        polities: polityInserted,
        polity_names: nameInserted,
        sources: sourceInserted
      }),
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
  readReviewedEntityAuthoringManifest,
  applyReviewedEntityAuthoring,
  activityFingerprint,
  requireP5Schema,
  requireExactRow
});
