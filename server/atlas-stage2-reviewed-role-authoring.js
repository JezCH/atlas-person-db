"use strict";

const fs = require("node:fs");
const path = require("node:path");

const MANIFEST_PATH = path.resolve(__dirname, "../stage2/execution/p6-reviewed-role-prerequisites.v1.json");
const SCHEMA = "atlas-stage2-p6-reviewed-role-prerequisites/v1";
const LOCK_KEY = "atlas-stage2:p6-reviewed-role-prerequisites:v1";

function readManifest(manifestPath = MANIFEST_PATH) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (manifest?.schema !== SCHEMA || manifest?.status !== "REVIEWED_EXACT_ROWS_BRANCH_ONLY_NO_PRODUCTION_MUTATION") throw new Error("P6_ROLE_PREREQUISITE_MANIFEST_INVALID");
  if (manifest?.rules?.literal_uuid_insert_only !== true || manifest?.rules?.name_resolution_forbidden !== true || manifest?.rules?.activity_mutation_forbidden !== true || manifest?.rules?.production_mutation_authorized !== false) throw new Error("P6_ROLE_PREREQUISITE_SAFETY_INVALID");
  if (!Array.isArray(manifest.roles) || manifest.roles.length !== 1) throw new Error("P6_ROLE_PREREQUISITE_COUNT_INVALID");
  return manifest;
}

async function activityFingerprint(client) {
  const result = await client.query(`select count(*)::int as row_count, md5(coalesce(string_agg(row_to_json(x)::text,'|' order by x.id::text),'')) as fingerprint from (select * from atlas_v2.person_politics_v2) x`);
  return result.rows[0];
}

function exact(actual, expected, fields, code) {
  if (!actual) throw new Error(`${code}:MISSING`);
  for (const field of fields) if (String(actual[field]) !== String(expected[field])) throw new Error(`${code}:${field}`);
}

async function applyReviewedRolePrerequisites(client, { dryRun = false, manifestPath = MANIFEST_PATH } = {}) {
  const manifest = readManifest(manifestPath);
  await client.query("begin isolation level serializable");
  try {
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [LOCK_KEY]);
    const before = await activityFingerprint(client);
    let roles = 0, names = 0;
    for (const item of manifest.roles) {
      const role = item.role;
      const existing = await client.query(`select id::text,code,category,source_label,is_active from atlas_v2.roles where id=$1::uuid for update`, [role.id]);
      if (existing.rowCount) exact(existing.rows[0], role, ["id","code","category","source_label","is_active"], `P6_ROLE_UUID_DRIFT:${item.identity_class}`);
      else {
        const collision = await client.query(`select id::text from atlas_v2.roles where code=$1 limit 1`, [role.code]);
        if (collision.rowCount) throw new Error(`P6_ROLE_CODE_COLLISION:${item.identity_class}`);
        await client.query(`insert into atlas_v2.roles(id,code,category,source_label,is_active) values($1::uuid,$2,$3,$4,$5)`, [role.id,role.code,role.category,role.source_label,role.is_active]);
        roles += 1;
      }
      for (const name of item.preferred_names || []) {
        const existingName = await client.query(`select id::text,role_id::text,locale,name,is_preferred from atlas_v2.role_names where id=$1::uuid for update`, [name.id]);
        if (existingName.rowCount) exact(existingName.rows[0], name, ["id","role_id","locale","name","is_preferred"], `P6_ROLE_NAME_UUID_DRIFT:${item.identity_class}`);
        else {
          const collision = await client.query(`select id::text from atlas_v2.role_names where role_id=$1::uuid and locale=$2 and is_preferred=true limit 1`, [name.role_id,name.locale]);
          if (collision.rowCount) throw new Error(`P6_ROLE_NAME_COLLISION:${item.identity_class}:${name.locale}`);
          await client.query(`insert into atlas_v2.role_names(id,role_id,locale,name,is_preferred) values($1::uuid,$2::uuid,$3,$4,$5)`, [name.id,name.role_id,name.locale,name.name,name.is_preferred]);
          names += 1;
        }
      }
    }
    const after = await activityFingerprint(client);
    if (before.row_count !== after.row_count || before.fingerprint !== after.fingerprint) throw new Error("P6_ROLE_PREREQUISITE_ACTIVITY_MUTATION_DETECTED");
    const result = Object.freeze({ marker:"ATLAS_STAGE2_P6_REVIEWED_ROLE_PREREQUISITES_V1", dry_run:Boolean(dryRun), committed:!dryRun, replay:roles===0&&names===0, inserted:Object.freeze({roles,role_names:names}), activity_fingerprint_before:before, activity_fingerprint_after:after });
    if (dryRun) await client.query("rollback"); else await client.query("commit");
    return result;
  } catch (error) { try { await client.query("rollback"); } catch {} throw error; }
}

module.exports = Object.freeze({ MANIFEST_PATH, SCHEMA, LOCK_KEY, readManifest, applyReviewedRolePrerequisites });
