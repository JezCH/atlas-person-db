"use strict";

const { manifestHash, correctionLedgerExists, readLedger } = require("./atlas-correction-manifest-service.js");
const { sha256 } = require("./atlas-correction-v2-manifest-synthesizer.js");

const MANIFEST_V2 = "atlas-correction-manifest/v2";
const MARKER_V2 = "ATLAS_CORRECTION_MANIFEST_V2";
const MAX_OPERATIONS_V2 = 200;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OPERATION_TYPES = new Set(["rewrite_activity", "split_activity", "retire_activity", "assert_polity_relation"]);

const ACTIVITY_FIELDS = Object.freeze([
  "id","person_id","polity_id","relation_type_id","role_id","period_basis_id",
  "activity_start","activity_start_month","activity_start_day","activity_start_granularity","activity_start_certainty","activity_start_calendar",
  "activity_end","activity_end_month","activity_end_day","activity_end_granularity","activity_end_certainty","activity_end_calendar",
  "confidence","chronology_status","legacy_source_key","notes","source_locator","content_hash"
]);
const ACTIVITY_UUID_FIELDS = new Set(["id","person_id","polity_id","relation_type_id","role_id","period_basis_id"]);
const RELATION_FIELDS = Object.freeze([
  "id","subject_polity_id","object_polity_id","relation_type_id",
  "valid_from_year","valid_from_month","valid_from_day","valid_from_granularity","valid_from_certainty","valid_from_calendar",
  "valid_to_year","valid_to_month","valid_to_day","valid_to_granularity","valid_to_certainty","valid_to_calendar",
  "confidence","notes"
]);
const RELATION_UUID_FIELDS = new Set(["id","subject_polity_id","object_polity_id","relation_type_id"]);

function requireUuid(value, code, nullable = false) {
  if (nullable && (value == null || String(value).trim() === "")) return null;
  const id = String(value || "").trim().toLowerCase();
  if (!UUID_RE.test(id)) throw new Error(code);
  return id;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

function exactEqual(left, right) {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

function normalizeActivity(raw, label) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`CORRECTION_V2_${label}_ACTIVITY_REQUIRED`);
  const out = {};
  for (const field of ACTIVITY_FIELDS) {
    let value = raw[field] ?? null;
    if (ACTIVITY_UUID_FIELDS.has(field)) {
      value = requireUuid(value, `CORRECTION_V2_${label}_${field.toUpperCase()}_INVALID`, field === "relation_type_id" || field === "role_id");
    }
    out[field] = value;
  }
  if (!Number.isInteger(out.activity_start) || !Number.isInteger(out.activity_end) || out.activity_start === 0 || out.activity_end === 0 || out.activity_end < out.activity_start) {
    throw new Error(`CORRECTION_V2_${label}_ACTIVITY_INTERVAL_INVALID`);
  }
  if (out.legacy_source_key != null && String(out.legacy_source_key).trim() === "") throw new Error(`CORRECTION_V2_${label}_LEGACY_SOURCE_KEY_BLANK`);
  return out;
}

function normalizeActivitySourceLink(raw, expectedActivityId, label) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`CORRECTION_V2_${label}_SOURCE_LINK_REQUIRED`);
  const activityId = requireUuid(raw.person_politics_id, `CORRECTION_V2_${label}_SOURCE_ACTIVITY_ID_INVALID`);
  if (activityId !== expectedActivityId) throw new Error(`CORRECTION_V2_${label}_SOURCE_ACTIVITY_ID_MISMATCH`);
  const locator = String(raw.source_locator_key || "").trim();
  if (!locator) throw new Error(`CORRECTION_V2_${label}_SOURCE_LOCATOR_REQUIRED`);
  return {
    person_politics_id: activityId,
    source_id: requireUuid(raw.source_id, `CORRECTION_V2_${label}_SOURCE_ID_INVALID`),
    source_locator_key: locator
  };
}

function normalizeChronologyClaim(raw, expectedActivityId, label) {
  const id = requireUuid(raw?.id, `CORRECTION_V2_${label}_CLAIM_ID_INVALID`);
  const activityId = requireUuid(raw?.person_politics_id, `CORRECTION_V2_${label}_CLAIM_ACTIVITY_ID_INVALID`);
  if (activityId !== expectedActivityId) throw new Error(`CORRECTION_V2_${label}_CLAIM_ACTIVITY_ID_MISMATCH`);
  return {
    id,
    person_politics_id: activityId,
    claim_type: String(raw.claim_type || ""),
    start_year: raw.start_year ?? null,
    end_year: raw.end_year ?? null
  };
}

function normalizeDescription(raw, expectedActivityId, label) {
  const id = requireUuid(raw?.id, `CORRECTION_V2_${label}_DESCRIPTION_ID_INVALID`);
  const activityId = requireUuid(raw?.person_politics_id, `CORRECTION_V2_${label}_DESCRIPTION_ACTIVITY_ID_INVALID`);
  if (activityId !== expectedActivityId) throw new Error(`CORRECTION_V2_${label}_DESCRIPTION_ACTIVITY_ID_MISMATCH`);
  const locale = String(raw.locale || "").trim();
  const content = String(raw.content || "");
  if (!locale || !content) throw new Error(`CORRECTION_V2_${label}_DESCRIPTION_INVALID`);
  return { id, person_politics_id: activityId, locale, content };
}

function normalizeActivityBundle(raw, label) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`CORRECTION_V2_${label}_BUNDLE_REQUIRED`);
  const activity = normalizeActivity(raw.activity, label);
  const sourceLinks = (raw.normalized_source_links || []).map((row, index) => normalizeActivitySourceLink(row, activity.id, `${label}_SOURCE_${index + 1}`));
  const claims = (raw.chronology_claims || []).map((row, index) => normalizeChronologyClaim(row, activity.id, `${label}_CLAIM_${index + 1}`));
  const descriptions = (raw.relationship_descriptions || []).map((row, index) => normalizeDescription(row, activity.id, `${label}_DESCRIPTION_${index + 1}`));
  return {
    activity,
    normalized_source_links: sourceLinks,
    chronology_claims: claims,
    relationship_descriptions: descriptions
  };
}

function normalizeRelation(raw, label) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`CORRECTION_V2_${label}_RELATION_REQUIRED`);
  const out = {};
  for (const field of RELATION_FIELDS) {
    let value = raw[field] ?? null;
    if (RELATION_UUID_FIELDS.has(field)) value = requireUuid(value, `CORRECTION_V2_${label}_${field.toUpperCase()}_INVALID`);
    out[field] = value;
  }
  if (out.subject_polity_id === out.object_polity_id) throw new Error(`CORRECTION_V2_${label}_SELF_RELATION_FORBIDDEN`);
  for (const field of ["valid_from_year", "valid_to_year"]) {
    if (out[field] === 0) throw new Error(`CORRECTION_V2_${label}_${field.toUpperCase()}_ZERO_FORBIDDEN`);
  }
  if (out.valid_from_year != null && out.valid_to_year != null && out.valid_to_year < out.valid_from_year) {
    throw new Error(`CORRECTION_V2_${label}_INTERVAL_INVALID`);
  }
  return out;
}

function normalizeRelationSourceLink(raw, relationId, label) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`CORRECTION_V2_${label}_SOURCE_LINK_REQUIRED`);
  if (raw.id != null) throw new Error(`CORRECTION_V2_${label}_SYNTHETIC_LINK_UUID_FORBIDDEN`);
  const declaredRelationId = raw.polity_relation_id == null
    ? relationId
    : requireUuid(raw.polity_relation_id, `CORRECTION_V2_${label}_RELATION_ID_INVALID`);
  if (declaredRelationId !== relationId) throw new Error(`CORRECTION_V2_${label}_RELATION_ID_MISMATCH`);
  const locator = String(raw.source_locator_key || "").trim();
  if (!locator) throw new Error(`CORRECTION_V2_${label}_LOCATOR_REQUIRED`);
  return {
    polity_relation_id: relationId,
    source_id: requireUuid(raw.source_id, `CORRECTION_V2_${label}_SOURCE_ID_INVALID`),
    source_locator_key: locator
  };
}

function sourceSemanticSet(bundle) {
  return bundle.normalized_source_links
    .map((row) => `${row.source_id}|${row.source_locator_key}`)
    .sort();
}

function manifestCore(raw) {
  const { manifest_sha256, production_executable, ...core } = raw;
  return core;
}

function normalizeOperation(raw, index) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("CORRECTION_V2_OPERATION_OBJECT_REQUIRED");
  const type = String(raw.type || "").trim();
  if (!OPERATION_TYPES.has(type)) throw new Error("CORRECTION_V2_OPERATION_UNSUPPORTED");
  const label = `OP${index}`;

  if (type === "assert_polity_relation") {
    const exactAfterRaw = raw.exact_after || {};
    const relationRaw = exactAfterRaw.relation || exactAfterRaw;
    const relation = normalizeRelation(relationRaw, `${label}_RELATION`);
    const absentId = requireUuid(raw?.exact_before?.relation_absent_id, `CORRECTION_V2_${label}_ABSENT_RELATION_ID_INVALID`);
    if (absentId !== relation.id) throw new Error(`CORRECTION_V2_${label}_RELATION_ID_MISMATCH`);
    const rawLinks = exactAfterRaw.source_links || relationRaw.source_links || [];
    const links = rawLinks.map((row, linkIndex) => normalizeRelationSourceLink(row, relation.id, `${label}_RELATION_SOURCE_${linkIndex + 1}`));
    return {
      type,
      decision_id: String(raw.decision_id || ""),
      exact_before: { relation_absent_id: absentId },
      exact_after: { relation, source_links: links }
    };
  }

  const activityId = requireUuid(raw.activity_id, `CORRECTION_V2_${label}_ACTIVITY_ID_INVALID`);
  const exactBefore = normalizeActivityBundle(raw.exact_before, `${label}_BEFORE`);
  if (exactBefore.activity.id !== activityId) throw new Error(`CORRECTION_V2_${label}_ACTIVITY_ID_MISMATCH`);

  if (type === "retire_activity") {
    return { type, case_id: String(raw.case_id || ""), activity_id: activityId, exact_before: exactBefore };
  }

  if (type === "rewrite_activity") {
    const exactAfter = normalizeActivityBundle(raw.exact_after, `${label}_AFTER`);
    if (exactAfter.activity.id !== activityId) throw new Error(`CORRECTION_V2_${label}_REWRITE_ID_CHANGED`);
    if (exactAfter.activity.relation_type_id == null) throw new Error(`CORRECTION_V2_${label}_REWRITE_RELATION_REQUIRED`);
    if (!exactEqual(exactBefore.normalized_source_links, exactAfter.normalized_source_links)) throw new Error(`CORRECTION_V2_${label}_REWRITE_SOURCE_LINK_DRIFT`);
    if (!exactEqual(exactBefore.chronology_claims, exactAfter.chronology_claims)) throw new Error(`CORRECTION_V2_${label}_REWRITE_CLAIM_DRIFT`);
    if (!exactEqual(exactBefore.relationship_descriptions, exactAfter.relationship_descriptions)) throw new Error(`CORRECTION_V2_${label}_REWRITE_DESCRIPTION_DRIFT`);
    return { type, case_id: String(raw.case_id || ""), activity_id: activityId, exact_before: exactBefore, exact_after: exactAfter };
  }

  const survivor = normalizeActivityBundle(raw.survivor_fragment, `${label}_SURVIVOR`);
  if (survivor.activity.id !== activityId) throw new Error(`CORRECTION_V2_${label}_SPLIT_SURVIVOR_ID_CHANGED`);
  if (survivor.activity.relation_type_id == null) throw new Error(`CORRECTION_V2_${label}_SPLIT_SURVIVOR_RELATION_REQUIRED`);
  if (!exactEqual(exactBefore.normalized_source_links, survivor.normalized_source_links)) throw new Error(`CORRECTION_V2_${label}_SPLIT_SURVIVOR_SOURCE_DRIFT`);
  if (exactBefore.chronology_claims.length || exactBefore.relationship_descriptions.length) throw new Error(`CORRECTION_V2_${label}_SPLIT_CHILD_POLICY_REQUIRED`);
  const newFragments = (raw.new_fragments || []).map((fragment, fragmentIndex) => normalizeActivityBundle(fragment, `${label}_NEW_${fragmentIndex + 1}`));
  if (!newFragments.length) throw new Error(`CORRECTION_V2_${label}_SPLIT_NEW_FRAGMENT_REQUIRED`);
  const sourceSet = sourceSemanticSet(exactBefore);
  for (const fragment of newFragments) {
    if (fragment.activity.relation_type_id == null) throw new Error(`CORRECTION_V2_${label}_SPLIT_NEW_RELATION_REQUIRED`);
    if (fragment.activity.legacy_source_key !== null) throw new Error(`CORRECTION_V2_${label}_SPLIT_FAKE_LEGACY_KEY_FORBIDDEN`);
    if (!exactEqual(sourceSet, sourceSemanticSet(fragment))) throw new Error(`CORRECTION_V2_${label}_SPLIT_SOURCE_COPY_DRIFT`);
    if (fragment.chronology_claims.length || fragment.relationship_descriptions.length) throw new Error(`CORRECTION_V2_${label}_SPLIT_NEW_CHILDREN_UNREVIEWED`);
  }
  const gapOverlapPolicy = String(raw.gap_overlap_policy || "").trim();
  if (!gapOverlapPolicy) throw new Error(`CORRECTION_V2_${label}_SPLIT_GAP_OVERLAP_POLICY_REQUIRED`);
  return {
    type,
    case_id: String(raw.case_id || ""),
    activity_id: activityId,
    exact_before: exactBefore,
    survivor_fragment: survivor,
    new_fragments: newFragments,
    gap_overlap_policy: gapOverlapPolicy
  };
}

function requireV2Manifest(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("CORRECTION_MANIFEST_OBJECT_REQUIRED");
  if (raw.schema !== MANIFEST_V2) throw new Error("UNSUPPORTED_CORRECTION_MANIFEST_SCHEMA");
  if (String(raw.review_status || "").toLowerCase() !== "approved") throw new Error("CORRECTION_MANIFEST_NOT_APPROVED");
  if (raw.production_executable !== true) throw new Error("CORRECTION_V2_MANIFEST_NOT_EXECUTABLE");
  const requestId = String(raw.request_id || "").trim();
  if (!requestId) throw new Error("CORRECTION_REQUEST_ID_REQUIRED");
  if (!/^sha256:[0-9a-f]{64}$/.test(String(raw.exact_live_snapshot_digest || ""))) throw new Error("CORRECTION_V2_SNAPSHOT_DIGEST_REQUIRED");
  if (!Array.isArray(raw.operations) || raw.operations.length === 0 || raw.operations.length > MAX_OPERATIONS_V2) throw new Error("CORRECTION_V2_OPERATIONS_INVALID");
  const declaredHash = String(raw.manifest_sha256 || "");
  const computedHash = sha256(manifestCore(raw));
  if (declaredHash !== computedHash) throw new Error("CORRECTION_V2_MANIFEST_SELF_HASH_DRIFT");
  const operations = raw.operations.map((operation, index) => normalizeOperation(operation, index + 1));

  const existingActivityTargets = new Set();
  const newActivityIds = new Set();
  const relationIds = new Set();
  const relationSourceKeys = new Set();
  for (const operation of operations) {
    if (operation.type === "assert_polity_relation") {
      if (relationIds.has(operation.exact_after.relation.id)) throw new Error("CORRECTION_V2_RELATION_ID_REUSED");
      relationIds.add(operation.exact_after.relation.id);
      for (const link of operation.exact_after.source_links) {
        const key = `${link.polity_relation_id}|${link.source_id}|${link.source_locator_key}`;
        if (relationSourceKeys.has(key)) throw new Error("CORRECTION_V2_RELATION_SOURCE_LINK_REUSED");
        relationSourceKeys.add(key);
      }
      continue;
    }
    if (existingActivityTargets.has(operation.activity_id)) throw new Error("CORRECTION_V2_ACTIVITY_TARGET_REUSED");
    existingActivityTargets.add(operation.activity_id);
    if (operation.type === "split_activity") {
      for (const fragment of operation.new_fragments) {
        if (existingActivityTargets.has(fragment.activity.id) || newActivityIds.has(fragment.activity.id)) throw new Error("CORRECTION_V2_NEW_ACTIVITY_ID_REUSED");
        newActivityIds.add(fragment.activity.id);
      }
    }
  }
  return { schema: MANIFEST_V2, requestId, declaredHash, operations, raw };
}

function normalizeDbActivity(row) {
  if (!row) return null;
  const out = {};
  for (const field of ACTIVITY_FIELDS) {
    let value = row[field] ?? null;
    if (ACTIVITY_UUID_FIELDS.has(field) && value != null) value = String(value).toLowerCase();
    out[field] = value;
  }
  return out;
}

async function loadActivityBundle(client, id, { forUpdate = false } = {}) {
  const activityResult = await client.query(`
    select id::text,person_id::text,polity_id::text,relation_type_id::text,role_id::text,period_basis_id::text,
           activity_start,activity_start_month,activity_start_day,activity_start_granularity,activity_start_certainty,activity_start_calendar,
           activity_end,activity_end_month,activity_end_day,activity_end_granularity,activity_end_certainty,activity_end_calendar,
           confidence,chronology_status,legacy_source_key,notes,source_locator,content_hash
      from atlas_v2.person_politics_v2 where id=$1::uuid${forUpdate ? " for update" : ""}`, [id]);
  if (!activityResult.rowCount) return null;
  const [sources, claims, descriptions] = await Promise.all([
    client.query(`select person_politics_id::text,source_id::text,source_locator_key from atlas_v2.person_politics_sources where person_politics_id=$1::uuid order by source_id::text,source_locator_key`, [id]),
    client.query(`select id::text,person_politics_id::text,claim_type,start_year,end_year from atlas_v2.chronology_claims where person_politics_id=$1::uuid order by id::text`, [id]),
    client.query(`select id::text,person_politics_id::text,locale,content from atlas_v2.relationship_descriptions where person_politics_id=$1::uuid order by locale,id::text`, [id])
  ]);
  return {
    activity: normalizeDbActivity(activityResult.rows[0]),
    normalized_source_links: sources.rows.map((row) => ({
      person_politics_id: String(row.person_politics_id).toLowerCase(),
      source_id: String(row.source_id).toLowerCase(),
      source_locator_key: row.source_locator_key
    })),
    chronology_claims: claims.rows.map((row) => ({
      id: String(row.id).toLowerCase(),
      person_politics_id: String(row.person_politics_id).toLowerCase(),
      claim_type: row.claim_type,
      start_year: row.start_year,
      end_year: row.end_year
    })),
    relationship_descriptions: descriptions.rows.map((row) => ({
      id: String(row.id).toLowerCase(),
      person_politics_id: String(row.person_politics_id).toLowerCase(),
      locale: row.locale,
      content: row.content
    }))
  };
}

function assertExactBundle(actual, expected, code) {
  if (!actual || !exactEqual(actual, expected)) throw new Error(code);
}

async function updateActivityRow(client, activity) {
  const values = ACTIVITY_FIELDS.map((field) => activity[field]);
  const updated = await client.query(`
    update atlas_v2.person_politics_v2 set
      person_id=$2::uuid,polity_id=$3::uuid,relation_type_id=$4::uuid,role_id=$5::uuid,period_basis_id=$6::uuid,
      activity_start=$7,activity_start_month=$8,activity_start_day=$9,activity_start_granularity=$10,activity_start_certainty=$11,activity_start_calendar=$12,
      activity_end=$13,activity_end_month=$14,activity_end_day=$15,activity_end_granularity=$16,activity_end_certainty=$17,activity_end_calendar=$18,
      confidence=$19,chronology_status=$20,legacy_source_key=$21,notes=$22,source_locator=$23::jsonb,content_hash=$24
    where id=$1::uuid returning id`, values);
  if (updated.rowCount !== 1) throw new Error("CORRECTION_V2_UPDATE_ACTIVITY_COUNT_DRIFT");
}

async function insertActivityBundle(client, bundle) {
  const activity = bundle.activity;
  const values = ACTIVITY_FIELDS.map((field) => activity[field]);
  await client.query(`
    insert into atlas_v2.person_politics_v2(
      id,person_id,polity_id,relation_type_id,role_id,period_basis_id,
      activity_start,activity_start_month,activity_start_day,activity_start_granularity,activity_start_certainty,activity_start_calendar,
      activity_end,activity_end_month,activity_end_day,activity_end_granularity,activity_end_certainty,activity_end_calendar,
      confidence,chronology_status,legacy_source_key,notes,source_locator,content_hash
    ) values($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6::uuid,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23::jsonb,$24)`, values);
  for (const link of bundle.normalized_source_links) {
    await client.query(`insert into atlas_v2.person_politics_sources(person_politics_id,source_id,source_locator_key) values($1::uuid,$2::uuid,$3)`, [link.person_politics_id, link.source_id, link.source_locator_key]);
  }
  for (const claim of bundle.chronology_claims) {
    await client.query(`insert into atlas_v2.chronology_claims(id,person_politics_id,claim_type,start_year,end_year) values($1::uuid,$2::uuid,$3,$4,$5)`, [claim.id, claim.person_politics_id, claim.claim_type, claim.start_year, claim.end_year]);
  }
  for (const description of bundle.relationship_descriptions) {
    await client.query(`insert into atlas_v2.relationship_descriptions(id,person_politics_id,locale,content) values($1::uuid,$2::uuid,$3,$4)`, [description.id, description.person_politics_id, description.locale, description.content]);
  }
}

async function deleteActivity(client, id) {
  const result = await client.query(`delete from atlas_v2.person_politics_v2 where id=$1::uuid returning id`, [id]);
  if (result.rowCount !== 1) throw new Error("CORRECTION_V2_RETIRE_ACTIVITY_COUNT_DRIFT");
}

async function loadPolityRelationBundle(client, id, { forUpdate = false } = {}) {
  const result = await client.query(`
    select id::text,subject_polity_id::text,object_polity_id::text,relation_type_id::text,
           valid_from_year,valid_from_month,valid_from_day,valid_from_granularity,valid_from_certainty,valid_from_calendar,
           valid_to_year,valid_to_month,valid_to_day,valid_to_granularity,valid_to_certainty,valid_to_calendar,confidence,notes
      from atlas_v2.polity_relations where id=$1::uuid${forUpdate ? " for update" : ""}`, [id]);
  if (!result.rowCount) return null;
  const relation = {};
  for (const field of RELATION_FIELDS) {
    let value = result.rows[0][field] ?? null;
    if (RELATION_UUID_FIELDS.has(field) && value != null) value = String(value).toLowerCase();
    relation[field] = value;
  }
  const links = await client.query(`
    select polity_relation_id::text,source_id::text,source_locator_key
      from atlas_v2.polity_relation_sources
     where polity_relation_id=$1::uuid
     order by source_id::text,source_locator_key`, [id]);
  return {
    relation,
    source_links: links.rows.map((row) => ({
      polity_relation_id: String(row.polity_relation_id).toLowerCase(),
      source_id: String(row.source_id).toLowerCase(),
      source_locator_key: row.source_locator_key
    }))
  };
}

async function assertRelationAbsent(client, operation) {
  const relationId = operation.exact_after.relation.id;
  if (await loadPolityRelationBundle(client, relationId, { forUpdate: true })) throw new Error("CORRECTION_V2_RELATION_ID_ALREADY_EXISTS");
  const relation = operation.exact_after.relation;
  const collision = await client.query(`
    select id::text from atlas_v2.polity_relations
     where subject_polity_id=$1::uuid and object_polity_id=$2::uuid and relation_type_id=$3::uuid
       and valid_from_year is not distinct from $4 and valid_from_month is not distinct from $5 and valid_from_day is not distinct from $6
       and valid_from_granularity is not distinct from $7 and valid_from_certainty is not distinct from $8 and valid_from_calendar is not distinct from $9
       and valid_to_year is not distinct from $10 and valid_to_month is not distinct from $11 and valid_to_day is not distinct from $12
       and valid_to_granularity is not distinct from $13 and valid_to_certainty is not distinct from $14 and valid_to_calendar is not distinct from $15
     limit 1 for update`, [
      relation.subject_polity_id, relation.object_polity_id, relation.relation_type_id,
      relation.valid_from_year, relation.valid_from_month, relation.valid_from_day,
      relation.valid_from_granularity, relation.valid_from_certainty, relation.valid_from_calendar,
      relation.valid_to_year, relation.valid_to_month, relation.valid_to_day,
      relation.valid_to_granularity, relation.valid_to_certainty, relation.valid_to_calendar
    ]);
  if (collision.rowCount) throw new Error("CORRECTION_V2_RELATION_SEMANTIC_COLLISION");
}

async function insertPolityRelationBundle(client, bundle) {
  const relation = bundle.relation;
  await client.query(`
    insert into atlas_v2.polity_relations(
      id,subject_polity_id,object_polity_id,relation_type_id,
      valid_from_year,valid_from_month,valid_from_day,valid_from_granularity,valid_from_certainty,valid_from_calendar,
      valid_to_year,valid_to_month,valid_to_day,valid_to_granularity,valid_to_certainty,valid_to_calendar,confidence,notes
    ) values($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`, RELATION_FIELDS.map((field) => relation[field]));
  for (const link of bundle.source_links) {
    await client.query(`
      insert into atlas_v2.polity_relation_sources(polity_relation_id,source_id,source_locator_key)
      values($1::uuid,$2::uuid,$3)`, [link.polity_relation_id, link.source_id, link.source_locator_key]);
  }
}

async function globalV2Counts(client) {
  const result = await client.query(`select
    (select count(*)::int from atlas_v2.person_politics_v2) as activities,
    (select count(*)::int from atlas_v2.person_politics_sources) as activity_sources,
    (select count(*)::int from atlas_v2.chronology_claims) as chronology_claims,
    (select count(*)::int from atlas_v2.relationship_descriptions) as relationship_descriptions,
    (select count(*)::int from atlas_v2.polity_relations) as polity_relations,
    (select count(*)::int from atlas_v2.polity_relation_sources) as polity_relation_sources`);
  return result.rows[0];
}

function expectedCountDeltas(operations) {
  const delta = {
    activities: 0,
    activity_sources: 0,
    chronology_claims: 0,
    relationship_descriptions: 0,
    polity_relations: 0,
    polity_relation_sources: 0
  };
  for (const operation of operations) {
    if (operation.type === "retire_activity") {
      delta.activities -= 1;
      delta.activity_sources -= operation.exact_before.normalized_source_links.length;
      delta.chronology_claims -= operation.exact_before.chronology_claims.length;
      delta.relationship_descriptions -= operation.exact_before.relationship_descriptions.length;
    } else if (operation.type === "split_activity") {
      delta.activities += operation.new_fragments.length;
      for (const fragment of operation.new_fragments) {
        delta.activity_sources += fragment.normalized_source_links.length;
        delta.chronology_claims += fragment.chronology_claims.length;
        delta.relationship_descriptions += fragment.relationship_descriptions.length;
      }
    } else if (operation.type === "assert_polity_relation") {
      delta.polity_relations += 1;
      delta.polity_relation_sources += operation.exact_after.source_links.length;
    }
  }
  return delta;
}

function assertCounts(after, before, delta) {
  for (const key of Object.keys(delta)) {
    if (Number(after[key]) !== Number(before[key]) + delta[key]) throw new Error(`CORRECTION_V2_GLOBAL_COUNT_DRIFT:${key}`);
  }
}

async function verifyAppliedState(client, manifest) {
  for (const operation of manifest.operations) {
    if (operation.type === "rewrite_activity") {
      assertExactBundle(await loadActivityBundle(client, operation.activity_id, { forUpdate: true }), operation.exact_after, `CORRECTION_V2_REPLAY_REWRITE_DRIFT:${operation.case_id}`);
    } else if (operation.type === "retire_activity") {
      if (await loadActivityBundle(client, operation.activity_id, { forUpdate: true })) throw new Error(`CORRECTION_V2_REPLAY_RETIRED_ACTIVITY_REAPPEARED:${operation.case_id}`);
    } else if (operation.type === "split_activity") {
      assertExactBundle(await loadActivityBundle(client, operation.activity_id, { forUpdate: true }), operation.survivor_fragment, `CORRECTION_V2_REPLAY_SURVIVOR_DRIFT:${operation.case_id}`);
      for (const fragment of operation.new_fragments) {
        assertExactBundle(await loadActivityBundle(client, fragment.activity.id, { forUpdate: true }), fragment, `CORRECTION_V2_REPLAY_NEW_FRAGMENT_DRIFT:${operation.case_id}`);
      }
    } else {
      assertExactBundle(await loadPolityRelationBundle(client, operation.exact_after.relation.id, { forUpdate: true }), operation.exact_after, `CORRECTION_V2_REPLAY_RELATION_DRIFT:${operation.decision_id}`);
    }
  }
}

function createCorrectionManifestV2Service({ client } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");

  async function execute(rawManifest, { dryRun = false } = {}) {
    const manifest = requireV2Manifest(rawManifest);
    const ledgerHash = manifestHash(rawManifest);
    await client.query("begin isolation level serializable");
    try {
      await client.query("select pg_advisory_xact_lock(hashtext($1))", [`atlas-correction-manifest:${manifest.requestId}`]);
      const ledger = await readLedger(client, manifest.requestId);
      if (ledger) {
        if (ledger.manifest_hash !== ledgerHash) throw new Error("CORRECTION_REQUEST_ID_COLLISION");
        if (ledger.manifest_schema !== MANIFEST_V2) throw new Error("CORRECTION_LEDGER_SCHEMA_MISMATCH");
        await verifyAppliedState(client, manifest);
        if (dryRun) await client.query("rollback");
        else await client.query("commit");
        return Object.freeze({
          marker: MARKER_V2,
          request_id: manifest.requestId,
          dry_run: Boolean(dryRun),
          committed: !dryRun,
          replay: true,
          result: ledger.result_snapshot
        });
      }

      for (const operation of manifest.operations) {
        if (operation.type === "assert_polity_relation") {
          await assertRelationAbsent(client, operation);
        } else {
          const actual = await loadActivityBundle(client, operation.activity_id, { forUpdate: true });
          assertExactBundle(actual, operation.exact_before, `CORRECTION_V2_EXACT_BEFORE_DRIFT:${operation.case_id}`);
          if (operation.type === "split_activity") {
            for (const fragment of operation.new_fragments) {
              if (await loadActivityBundle(client, fragment.activity.id, { forUpdate: true })) throw new Error(`CORRECTION_V2_NEW_FRAGMENT_ALREADY_EXISTS:${operation.case_id}`);
            }
          }
        }
      }

      const beforeCounts = await globalV2Counts(client);
      const delta = expectedCountDeltas(manifest.operations);
      for (const operation of manifest.operations) {
        if (operation.type === "rewrite_activity") {
          await updateActivityRow(client, operation.exact_after.activity);
        } else if (operation.type === "retire_activity") {
          await deleteActivity(client, operation.activity_id);
        } else if (operation.type === "split_activity") {
          await updateActivityRow(client, operation.survivor_fragment.activity);
          for (const fragment of operation.new_fragments) await insertActivityBundle(client, fragment);
        } else {
          await insertPolityRelationBundle(client, operation.exact_after);
        }
      }

      const afterCounts = await globalV2Counts(client);
      assertCounts(afterCounts, beforeCounts, delta);
      await verifyAppliedState(client, manifest);

      const resultSnapshot = {
        version: 2,
        schema: MANIFEST_V2,
        marker: MARKER_V2,
        request_id: manifest.requestId,
        exact_live_snapshot_digest: rawManifest.exact_live_snapshot_digest,
        manifest_sha256: rawManifest.manifest_sha256,
        before_counts: beforeCounts,
        expected_count_delta: delta,
        after_counts: afterCounts,
        operations: manifest.operations
      };

      if (dryRun) {
        await client.query("rollback");
        return Object.freeze({
          marker: MARKER_V2,
          request_id: manifest.requestId,
          dry_run: true,
          committed: false,
          replay: false,
          result: resultSnapshot
        });
      }

      if (!await correctionLedgerExists(client)) throw new Error("CORRECTION_LEDGER_SCHEMA_REQUIRED");
      await client.query(`
        insert into atlas_v2.correction_manifest_runs(request_id,manifest_hash,manifest_schema,result_snapshot)
        values($1,$2,$3,$4::jsonb)`, [manifest.requestId, ledgerHash, MANIFEST_V2, JSON.stringify(resultSnapshot)]);
      await client.query("commit");
      return Object.freeze({
        marker: MARKER_V2,
        request_id: manifest.requestId,
        dry_run: false,
        committed: true,
        replay: false,
        result: resultSnapshot
      });
    } catch (error) {
      try { await client.query("rollback"); } catch {}
      throw error;
    }
  }

  return Object.freeze({ execute });
}

module.exports = Object.freeze({
  MANIFEST_V2,
  MARKER_V2,
  MAX_OPERATIONS_V2,
  OPERATION_TYPES,
  ACTIVITY_FIELDS,
  RELATION_FIELDS,
  requireUuid,
  canonicalize,
  exactEqual,
  normalizeActivity,
  normalizeActivityBundle,
  normalizeRelation,
  normalizeRelationSourceLink,
  normalizeOperation,
  manifestCore,
  requireV2Manifest,
  loadActivityBundle,
  assertExactBundle,
  updateActivityRow,
  insertActivityBundle,
  deleteActivity,
  loadPolityRelationBundle,
  assertRelationAbsent,
  insertPolityRelationBundle,
  globalV2Counts,
  expectedCountDeltas,
  assertCounts,
  verifyAppliedState,
  createCorrectionManifestV2Service
});
