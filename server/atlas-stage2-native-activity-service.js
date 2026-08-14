"use strict";

const crypto = require("node:crypto");
const {
  requiredUuid,
  optionalUuid,
  normalizeBoundary,
  semanticKey,
  semanticHash
} = require("./atlas-activity-semantic-key-v2.js");

const ACTIVITY_FIELDS = Object.freeze([
  "person_id","polity_id","relation_type_id","role_id","period_basis_id",
  "activity_start","activity_start_month","activity_start_day","activity_start_granularity","activity_start_certainty","activity_start_calendar",
  "activity_end","activity_end_month","activity_end_day","activity_end_granularity","activity_end_certainty","activity_end_calendar",
  "confidence","chronology_status","notes"
]);
const FORBIDDEN_NAME_BINDINGS = Object.freeze(["person_name","politic_name","polity_name","role","period_basis","relation_type"]);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function hashPayload(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function requiredText(value, code) {
  const text = String(value ?? "").normalize("NFC").trim().replace(/\s+/g, " ");
  if (!text) throw new Error(code);
  return text;
}

function optionalText(value) {
  const text = String(value ?? "").normalize("NFC").trim().replace(/\s+/g, " ");
  return text || null;
}

function normalizeSourceLinks(raw) {
  if (raw == null) return [];
  if (!Array.isArray(raw)) throw new Error("STAGE2_ACTIVITY_SOURCE_LINKS_MUST_BE_ARRAY");
  const seenSources = new Set();
  return raw.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error(`STAGE2_ACTIVITY_SOURCE_LINK_INVALID:${index + 1}`);
    if (item.id != null) throw new Error("STAGE2_ACTIVITY_SYNTHETIC_SOURCE_LINK_UUID_FORBIDDEN");
    const sourceId = requiredUuid(item.source_id, `source_links[${index}].source_id`);
    if (seenSources.has(sourceId)) throw new Error("STAGE2_ACTIVITY_SOURCE_ID_REUSED");
    seenSources.add(sourceId);
    return Object.freeze({
      source_id: sourceId,
      source_locator_key: requiredText(item.source_locator_key, `STAGE2_ACTIVITY_SOURCE_LOCATOR_REQUIRED:${index + 1}`)
    });
  });
}

function normalizeStage2NativeActivity(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("STAGE2_ACTIVITY_OBJECT_REQUIRED");
  for (const field of FORBIDDEN_NAME_BINDINGS) {
    if (raw[field] != null) throw new Error(`STAGE2_ACTIVITY_NAME_BINDING_FORBIDDEN:${field}`);
  }
  if (raw.legacy_source_key != null) throw new Error("STAGE2_ACTIVITY_LEGACY_SOURCE_KEY_FORBIDDEN");

  const start = normalizeBoundary(raw, "activity_start", { requireCertainty: true });
  const end = normalizeBoundary(raw, "activity_end", { requireCertainty: true });
  // semanticKey performs full known-order validation with the exact same identity implementation.
  const normalized = {
    person_id: requiredUuid(raw.person_id, "person_id"),
    polity_id: requiredUuid(raw.polity_id, "polity_id"),
    relation_type_id: requiredUuid(raw.relation_type_id, "relation_type_id"),
    role_id: optionalUuid(raw.role_id, "role_id"),
    period_basis_id: requiredUuid(raw.period_basis_id, "period_basis_id"),
    activity_start: start.year,
    activity_start_month: start.month,
    activity_start_day: start.day,
    activity_start_granularity: start.granularity,
    activity_start_certainty: start.certainty,
    activity_start_calendar: start.calendar,
    activity_end: end.year,
    activity_end_month: end.month,
    activity_end_day: end.day,
    activity_end_granularity: end.granularity,
    activity_end_certainty: end.certainty,
    activity_end_calendar: end.calendar,
    confidence: requiredText(raw.confidence, "STAGE2_ACTIVITY_CONFIDENCE_REQUIRED"),
    chronology_status: requiredText(raw.chronology_status, "STAGE2_ACTIVITY_CHRONOLOGY_STATUS_REQUIRED"),
    notes: optionalText(raw.notes),
    source_links: normalizeSourceLinks(raw.source_links)
  };
  semanticKey(normalized);
  return Object.freeze(normalized);
}

async function requireSingleReference(client, sql, params, code) {
  const result = await client.query(sql, params);
  if (result.rows.length !== 1) throw new Error(code);
}

async function verifyReferences(client, row) {
  await requireSingleReference(client, `select id from atlas_v2.persons where id=$1::uuid`, [row.person_id], "STAGE2_ACTIVITY_PERSON_ID_UNRESOLVED");
  await requireSingleReference(client, `select id from atlas_v2.polities where id=$1::uuid`, [row.polity_id], "STAGE2_ACTIVITY_POLITY_ID_UNRESOLVED");
  await requireSingleReference(client, `select id from atlas_v2.person_polity_relation_types where id=$1::uuid and is_active=true`, [row.relation_type_id], "STAGE2_ACTIVITY_RELATION_TYPE_ID_UNRESOLVED");
  if (row.role_id != null) await requireSingleReference(client, `select id from atlas_v2.roles where id=$1::uuid and is_active=true`, [row.role_id], "STAGE2_ACTIVITY_ROLE_ID_UNRESOLVED");
  await requireSingleReference(client, `select id from atlas_v2.period_bases where id=$1::uuid and is_active=true`, [row.period_basis_id], "STAGE2_ACTIVITY_PERIOD_BASIS_ID_UNRESOLVED");
  for (const link of row.source_links) {
    await requireSingleReference(client, `select id from atlas_v2.sources where id=$1::uuid`, [link.source_id], "STAGE2_ACTIVITY_SOURCE_ID_UNRESOLVED");
  }
}

async function lockSemantic(client, row) {
  await client.query("select pg_advisory_xact_lock(hashtext($1))", [`atlas-stage2-activity:${semanticHash(row)}`]);
}

async function semanticCollisions(client, row, excludeId = null) {
  const result = await client.query(`
    select id::text
      from atlas_v2.person_politics_v2
     where person_id=$1::uuid
       and polity_id=$2::uuid
       and relation_type_id=$3::uuid
       and role_id is not distinct from $4::uuid
       and period_basis_id=$5::uuid
       and activity_start=$6
       and activity_start_month is not distinct from $7::smallint
       and activity_start_day is not distinct from $8::smallint
       and activity_start_granularity=$9
       and activity_start_calendar=$10
       and activity_end=$11
       and activity_end_month is not distinct from $12::smallint
       and activity_end_day is not distinct from $13::smallint
       and activity_end_granularity=$14
       and activity_end_calendar=$15
       and ($16::uuid is null or id<>$16::uuid)
     order by id
     limit 2`, [
    row.person_id,row.polity_id,row.relation_type_id,row.role_id,row.period_basis_id,
    row.activity_start,row.activity_start_month,row.activity_start_day,row.activity_start_granularity,row.activity_start_calendar,
    row.activity_end,row.activity_end_month,row.activity_end_day,row.activity_end_granularity,row.activity_end_calendar,
    excludeId
  ]);
  return result.rows.map((item) => String(item.id).toLowerCase());
}

async function loadStage2NativeActivity(client, id, { forUpdate = false } = {}) {
  const activityId = requiredUuid(id, "activity_id");
  const row = await client.query(`
    select id::text,person_id::text,polity_id::text,relation_type_id::text,role_id::text,period_basis_id::text,
           activity_start,activity_start_month,activity_start_day,activity_start_granularity,activity_start_certainty,activity_start_calendar,
           activity_end,activity_end_month,activity_end_day,activity_end_granularity,activity_end_certainty,activity_end_calendar,
           confidence,chronology_status,legacy_source_key,notes,source_locator,content_hash
      from atlas_v2.person_politics_v2
     where id=$1::uuid${forUpdate ? " for update" : ""}`, [activityId]);
  if (!row.rowCount) return null;
  const links = await client.query(`select source_id::text,source_locator_key from atlas_v2.person_politics_sources where person_politics_id=$1::uuid order by source_id::text`, [activityId]);
  return Object.freeze({
    ...row.rows[0],
    id: String(row.rows[0].id).toLowerCase(),
    person_id: String(row.rows[0].person_id).toLowerCase(),
    polity_id: String(row.rows[0].polity_id).toLowerCase(),
    relation_type_id: row.rows[0].relation_type_id == null ? null : String(row.rows[0].relation_type_id).toLowerCase(),
    role_id: row.rows[0].role_id == null ? null : String(row.rows[0].role_id).toLowerCase(),
    period_basis_id: String(row.rows[0].period_basis_id).toLowerCase(),
    source_links: links.rows.map((item) => Object.freeze({ source_id:String(item.source_id).toLowerCase(), source_locator_key:item.source_locator_key }))
  });
}

async function replaceSourceLinks(client, activityId, links) {
  await client.query(`delete from atlas_v2.person_politics_sources where person_politics_id=$1::uuid`, [activityId]);
  for (const link of links) {
    await client.query(`insert into atlas_v2.person_politics_sources(person_politics_id,source_id,source_locator_key) values($1::uuid,$2::uuid,$3)`, [activityId, link.source_id, link.source_locator_key]);
  }
}

function activityInsertValues(row, requestId, operation) {
  const locator = Object.freeze({ kind:"stage2_native_authoring", request_id:String(requestId || ""), operation });
  return {
    locator,
    content_hash: hashPayload({ ...row, source_locator: locator })
  };
}

function createStage2NativeActivityTx(client) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");

  async function create(raw, { requestId } = {}) {
    const row = normalizeStage2NativeActivity(raw);
    await verifyReferences(client, row);
    await lockSemantic(client, row);
    if ((await semanticCollisions(client, row)).length) throw new Error("STAGE2_ACTIVITY_SEMANTIC_DUPLICATE");
    const meta = activityInsertValues(row, requestId, "create");
    const inserted = await client.query(`
      insert into atlas_v2.person_politics_v2(
        id,person_id,polity_id,relation_type_id,role_id,period_basis_id,
        activity_start,activity_start_month,activity_start_day,activity_start_granularity,activity_start_certainty,activity_start_calendar,
        activity_end,activity_end_month,activity_end_day,activity_end_granularity,activity_end_certainty,activity_end_calendar,
        confidence,chronology_status,legacy_source_key,notes,source_locator,content_hash
      ) values(
        gen_random_uuid(),$1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,
        $6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
        $18,$19,null,$20,$21::jsonb,$22
      ) returning id::text`, [
      row.person_id,row.polity_id,row.relation_type_id,row.role_id,row.period_basis_id,
      row.activity_start,row.activity_start_month,row.activity_start_day,row.activity_start_granularity,row.activity_start_certainty,row.activity_start_calendar,
      row.activity_end,row.activity_end_month,row.activity_end_day,row.activity_end_granularity,row.activity_end_certainty,row.activity_end_calendar,
      row.confidence,row.chronology_status,row.notes,JSON.stringify(meta.locator),meta.content_hash
    ]);
    const id = String(inserted.rows[0]?.id || "").toLowerCase();
    if (!id) throw new Error("STAGE2_ACTIVITY_CREATE_FAILED");
    await replaceSourceLinks(client, id, row.source_links);
    return Object.freeze({ id, semantic_key: semanticKey(row), semantic_hash: semanticHash(row), row });
  }

  async function update(id, raw, { requestId } = {}) {
    const activityId = requiredUuid(id, "activity_id");
    const before = await loadStage2NativeActivity(client, activityId, { forUpdate:true });
    if (!before) throw new Error("STAGE2_ACTIVITY_UPDATE_TARGET_NOT_FOUND");
    if (before.legacy_source_key != null) throw new Error("STAGE2_ACTIVITY_UPDATE_LEGACY_TARGET_FORBIDDEN");
    const row = normalizeStage2NativeActivity(raw);
    await verifyReferences(client, row);
    await lockSemantic(client, row);
    if ((await semanticCollisions(client, row, activityId)).length) throw new Error("STAGE2_ACTIVITY_SEMANTIC_DUPLICATE");
    const meta = activityInsertValues(row, requestId, "update");
    const updated = await client.query(`
      update atlas_v2.person_politics_v2 set
        person_id=$1::uuid,polity_id=$2::uuid,relation_type_id=$3::uuid,role_id=$4::uuid,period_basis_id=$5::uuid,
        activity_start=$6,activity_start_month=$7,activity_start_day=$8,activity_start_granularity=$9,activity_start_certainty=$10,activity_start_calendar=$11,
        activity_end=$12,activity_end_month=$13,activity_end_day=$14,activity_end_granularity=$15,activity_end_certainty=$16,activity_end_calendar=$17,
        confidence=$18,chronology_status=$19,notes=$20,source_locator=$21::jsonb,content_hash=$22
       where id=$23::uuid returning id::text`, [
      row.person_id,row.polity_id,row.relation_type_id,row.role_id,row.period_basis_id,
      row.activity_start,row.activity_start_month,row.activity_start_day,row.activity_start_granularity,row.activity_start_certainty,row.activity_start_calendar,
      row.activity_end,row.activity_end_month,row.activity_end_day,row.activity_end_granularity,row.activity_end_certainty,row.activity_end_calendar,
      row.confidence,row.chronology_status,row.notes,JSON.stringify(meta.locator),meta.content_hash,activityId
    ]);
    if (updated.rowCount !== 1) throw new Error("STAGE2_ACTIVITY_UPDATE_FAILED");
    await replaceSourceLinks(client, activityId, row.source_links);
    return Object.freeze({ id:activityId, semantic_key:semanticKey(row), semantic_hash:semanticHash(row), row });
  }

  async function remove(id) {
    const activityId = requiredUuid(id, "activity_id");
    const before = await loadStage2NativeActivity(client, activityId, { forUpdate:true });
    if (!before) throw new Error("STAGE2_ACTIVITY_DELETE_TARGET_NOT_FOUND");
    if (before.legacy_source_key != null) throw new Error("STAGE2_ACTIVITY_DELETE_LEGACY_TARGET_FORBIDDEN");
    const deleted = await client.query(`delete from atlas_v2.person_politics_v2 where id=$1::uuid returning id::text`, [activityId]);
    if (deleted.rowCount !== 1) throw new Error("STAGE2_ACTIVITY_DELETE_FAILED");
    return Object.freeze({ id:activityId });
  }

  return Object.freeze({ create, update, remove, load: (id) => loadStage2NativeActivity(client, id) });
}

module.exports = Object.freeze({
  ACTIVITY_FIELDS,
  FORBIDDEN_NAME_BINDINGS,
  normalizeSourceLinks,
  normalizeStage2NativeActivity,
  verifyReferences,
  semanticCollisions,
  loadStage2NativeActivity,
  createStage2NativeActivityTx
});
