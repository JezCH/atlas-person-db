"use strict";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STAGE2_ASSERTION_TYPES = new Set([
  "assert_governance_period",
  "assert_polity_designation",
  "assert_polity_identity_relation"
]);

const GOVERNANCE_FIELDS = Object.freeze([
  "id","polity_id","governance_context_id",
  "valid_from_year","valid_from_month","valid_from_day","valid_from_granularity","valid_from_certainty","valid_from_calendar",
  "valid_to_year","valid_to_month","valid_to_day","valid_to_granularity","valid_to_certainty","valid_to_calendar",
  "confidence","notes"
]);
const GOVERNANCE_UUID_FIELDS = new Set(["id","polity_id","governance_context_id"]);
const DESIGNATION_FIELDS = Object.freeze([
  "id","polity_id","designation_type",
  "valid_from_year","valid_from_month","valid_from_day","valid_from_granularity","valid_from_certainty","valid_from_calendar",
  "valid_to_year","valid_to_month","valid_to_day","valid_to_granularity","valid_to_certainty","valid_to_calendar",
  "confidence","notes"
]);
const DESIGNATION_UUID_FIELDS = new Set(["id","polity_id"]);
const IDENTITY_RELATION_FIELDS = Object.freeze([
  "id","predecessor_polity_id","successor_polity_id","relation_type_id",
  "transition_year","transition_month","transition_day","transition_granularity","transition_certainty","transition_calendar",
  "confidence","notes"
]);
const IDENTITY_RELATION_UUID_FIELDS = new Set(["id","predecessor_polity_id","successor_polity_id","relation_type_id"]);

function requireUuid(value, code) {
  const id = String(value || "").trim().toLowerCase();
  if (!UUID_RE.test(id)) throw new Error(code);
  return id;
}

function normalizeRow(raw, fields, uuidFields, label) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`CORRECTION_V2_${label}_ROW_REQUIRED`);
  const out = {};
  for (const field of fields) {
    let value = raw[field] ?? null;
    if (uuidFields.has(field)) value = requireUuid(value, `CORRECTION_V2_${label}_${field.toUpperCase()}_INVALID`);
    out[field] = value;
  }
  return out;
}

function validateInterval(row, prefix, label) {
  const from = row[`${prefix}_from_year`];
  const to = row[`${prefix}_to_year`];
  if (from === 0 || to === 0) throw new Error(`CORRECTION_V2_${label}_ZERO_YEAR_FORBIDDEN`);
  if (from != null && !Number.isInteger(from)) throw new Error(`CORRECTION_V2_${label}_FROM_YEAR_INVALID`);
  if (to != null && !Number.isInteger(to)) throw new Error(`CORRECTION_V2_${label}_TO_YEAR_INVALID`);
  if (from != null && to != null && to < from) throw new Error(`CORRECTION_V2_${label}_INTERVAL_INVALID`);
}

function normalizeTripleSourceLink(raw, parentField, parentId, label) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`CORRECTION_V2_${label}_SOURCE_LINK_REQUIRED`);
  if (raw.id != null) throw new Error(`CORRECTION_V2_${label}_SYNTHETIC_LINK_UUID_FORBIDDEN`);
  const declared = raw[parentField] == null ? parentId : requireUuid(raw[parentField], `CORRECTION_V2_${label}_PARENT_ID_INVALID`);
  if (declared !== parentId) throw new Error(`CORRECTION_V2_${label}_PARENT_ID_MISMATCH`);
  const locator = String(raw.source_locator_key || "").trim();
  if (!locator) throw new Error(`CORRECTION_V2_${label}_LOCATOR_REQUIRED`);
  return {
    [parentField]: parentId,
    source_id: requireUuid(raw.source_id, `CORRECTION_V2_${label}_SOURCE_ID_INVALID`),
    source_locator_key: locator
  };
}

function normalizeTripleSourceLinks(rawLinks, parentField, parentId, label) {
  const links = (rawLinks || []).map((item, index) => normalizeTripleSourceLink(item, parentField, parentId, `${label}_${index + 1}`));
  if (!links.length) throw new Error(`CORRECTION_V2_${label}_REQUIRED`);
  const seen = new Set();
  for (const link of links) {
    const key = `${link.source_id}|${link.source_locator_key}`;
    if (seen.has(key)) throw new Error(`CORRECTION_V2_${label}_LINK_REUSED`);
    seen.add(key);
  }
  links.sort((a, b) => a.source_id.localeCompare(b.source_id) || a.source_locator_key.localeCompare(b.source_locator_key));
  return links;
}

function normalizeGovernanceBundle(raw, label) {
  const row = normalizeRow(raw?.period, GOVERNANCE_FIELDS, GOVERNANCE_UUID_FIELDS, `${label}_PERIOD`);
  validateInterval(row, "valid", `${label}_PERIOD`);
  const links = normalizeTripleSourceLinks(raw?.source_links, "polity_governance_period_id", row.id, `${label}_SOURCE`);
  return { period: row, source_links: links };
}

function normalizeDesignationName(raw, designationId, label) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`CORRECTION_V2_${label}_NAME_REQUIRED`);
  const id = requireUuid(raw.id, `CORRECTION_V2_${label}_NAME_ID_INVALID`);
  const parent = requireUuid(raw.polity_designation_id, `CORRECTION_V2_${label}_NAME_PARENT_INVALID`);
  if (parent !== designationId) throw new Error(`CORRECTION_V2_${label}_NAME_PARENT_MISMATCH`);
  const locale = String(raw.locale || "").trim();
  const name = String(raw.name || "").trim();
  if (!locale || !name || typeof raw.is_preferred !== "boolean") throw new Error(`CORRECTION_V2_${label}_NAME_INVALID`);
  return { id, polity_designation_id: designationId, locale, name, is_preferred: raw.is_preferred };
}

function normalizeDesignationBundle(raw, label) {
  const row = normalizeRow(raw?.designation, DESIGNATION_FIELDS, DESIGNATION_UUID_FIELDS, `${label}_DESIGNATION`);
  validateInterval(row, "valid", `${label}_DESIGNATION`);
  const names = (raw?.names || []).map((item, index) => normalizeDesignationName(item, row.id, `${label}_${index + 1}`));
  if (!names.length) throw new Error(`CORRECTION_V2_${label}_NAME_REQUIRED`);
  const seenNameIds = new Set();
  const preferredLocales = new Set();
  for (const name of names) {
    if (seenNameIds.has(name.id)) throw new Error(`CORRECTION_V2_${label}_NAME_ID_REUSED`);
    seenNameIds.add(name.id);
    if (name.is_preferred) {
      if (preferredLocales.has(name.locale)) throw new Error(`CORRECTION_V2_${label}_PREFERRED_LOCALE_REUSED`);
      preferredLocales.add(name.locale);
    }
  }
  names.sort((a, b) => a.locale.localeCompare(b.locale) || a.id.localeCompare(b.id));
  const links = normalizeTripleSourceLinks(raw?.source_links, "polity_designation_id", row.id, `${label}_SOURCE`);
  return { designation: row, names, source_links: links };
}

function normalizeIdentityRelationBundle(raw, label) {
  const row = normalizeRow(raw?.relation, IDENTITY_RELATION_FIELDS, IDENTITY_RELATION_UUID_FIELDS, `${label}_RELATION`);
  if (row.predecessor_polity_id === row.successor_polity_id) throw new Error(`CORRECTION_V2_${label}_SELF_RELATION_FORBIDDEN`);
  if (row.transition_year === 0 || (row.transition_year != null && !Number.isInteger(row.transition_year))) throw new Error(`CORRECTION_V2_${label}_TRANSITION_YEAR_INVALID`);
  const links = normalizeTripleSourceLinks(raw?.source_links, "polity_identity_relation_id", row.id, `${label}_SOURCE`);
  return { relation: row, source_links: links };
}

function normalizeStage2AssertionOperation(raw, index) {
  const type = String(raw?.type || "").trim();
  if (!STAGE2_ASSERTION_TYPES.has(type)) throw new Error("CORRECTION_V2_STAGE2_ASSERTION_OPERATION_UNSUPPORTED");
  const label = `OP${index}`;
  if (type === "assert_governance_period") {
    const bundle = normalizeGovernanceBundle(raw.exact_after, `${label}_GOVERNANCE`);
    const absent = requireUuid(raw?.exact_before?.period_absent_id, `CORRECTION_V2_${label}_PERIOD_ABSENT_ID_INVALID`);
    if (absent !== bundle.period.id) throw new Error(`CORRECTION_V2_${label}_PERIOD_ID_MISMATCH`);
    return { type, decision_id: String(raw.decision_id || ""), exact_before: { period_absent_id: absent }, exact_after: bundle };
  }
  if (type === "assert_polity_designation") {
    const bundle = normalizeDesignationBundle(raw.exact_after, `${label}_DESIGNATION`);
    const absent = requireUuid(raw?.exact_before?.designation_absent_id, `CORRECTION_V2_${label}_DESIGNATION_ABSENT_ID_INVALID`);
    if (absent !== bundle.designation.id) throw new Error(`CORRECTION_V2_${label}_DESIGNATION_ID_MISMATCH`);
    return { type, decision_id: String(raw.decision_id || ""), exact_before: { designation_absent_id: absent }, exact_after: bundle };
  }
  const bundle = normalizeIdentityRelationBundle(raw.exact_after, `${label}_IDENTITY`);
  const absent = requireUuid(raw?.exact_before?.relation_absent_id, `CORRECTION_V2_${label}_IDENTITY_RELATION_ABSENT_ID_INVALID`);
  if (absent !== bundle.relation.id) throw new Error(`CORRECTION_V2_${label}_IDENTITY_RELATION_ID_MISMATCH`);
  return { type, decision_id: String(raw.decision_id || ""), exact_before: { relation_absent_id: absent }, exact_after: bundle };
}

async function loadGovernanceBundle(client, id, { forUpdate = false } = {}) {
  const row = await client.query(`select id::text,polity_id::text,governance_context_id::text,
    valid_from_year,valid_from_month,valid_from_day,valid_from_granularity,valid_from_certainty,valid_from_calendar,
    valid_to_year,valid_to_month,valid_to_day,valid_to_granularity,valid_to_certainty,valid_to_calendar,confidence,notes
    from atlas_v2.polity_governance_periods where id=$1::uuid${forUpdate ? " for update" : ""}`, [id]);
  if (!row.rowCount) return null;
  const period = normalizeRow(row.rows[0], GOVERNANCE_FIELDS, GOVERNANCE_UUID_FIELDS, "DB_GOVERNANCE");
  const links = await client.query(`select polity_governance_period_id::text,source_id::text,source_locator_key from atlas_v2.polity_governance_period_sources where polity_governance_period_id=$1::uuid order by source_id::text,source_locator_key`, [id]);
  return { period, source_links: links.rows.map((item) => ({ polity_governance_period_id:String(item.polity_governance_period_id).toLowerCase(), source_id:String(item.source_id).toLowerCase(), source_locator_key:item.source_locator_key })) };
}

async function loadDesignationBundle(client, id, { forUpdate = false } = {}) {
  const row = await client.query(`select id::text,polity_id::text,designation_type,
    valid_from_year,valid_from_month,valid_from_day,valid_from_granularity,valid_from_certainty,valid_from_calendar,
    valid_to_year,valid_to_month,valid_to_day,valid_to_granularity,valid_to_certainty,valid_to_calendar,confidence,notes
    from atlas_v2.polity_designations where id=$1::uuid${forUpdate ? " for update" : ""}`, [id]);
  if (!row.rowCount) return null;
  const designation = normalizeRow(row.rows[0], DESIGNATION_FIELDS, DESIGNATION_UUID_FIELDS, "DB_DESIGNATION");
  const [names, links] = await Promise.all([
    client.query(`select id::text,polity_designation_id::text,locale,name,is_preferred from atlas_v2.polity_designation_names where polity_designation_id=$1::uuid order by locale,id::text`, [id]),
    client.query(`select polity_designation_id::text,source_id::text,source_locator_key from atlas_v2.polity_designation_sources where polity_designation_id=$1::uuid order by source_id::text,source_locator_key`, [id])
  ]);
  return {
    designation,
    names: names.rows.map((item) => ({ id:String(item.id).toLowerCase(), polity_designation_id:String(item.polity_designation_id).toLowerCase(), locale:item.locale, name:item.name, is_preferred:item.is_preferred })),
    source_links: links.rows.map((item) => ({ polity_designation_id:String(item.polity_designation_id).toLowerCase(), source_id:String(item.source_id).toLowerCase(), source_locator_key:item.source_locator_key }))
  };
}

async function loadIdentityRelationBundle(client, id, { forUpdate = false } = {}) {
  const row = await client.query(`select id::text,predecessor_polity_id::text,successor_polity_id::text,relation_type_id::text,
    transition_year,transition_month,transition_day,transition_granularity,transition_certainty,transition_calendar,confidence,notes
    from atlas_v2.polity_identity_relations where id=$1::uuid${forUpdate ? " for update" : ""}`, [id]);
  if (!row.rowCount) return null;
  const relation = normalizeRow(row.rows[0], IDENTITY_RELATION_FIELDS, IDENTITY_RELATION_UUID_FIELDS, "DB_IDENTITY_RELATION");
  const links = await client.query(`select polity_identity_relation_id::text,source_id::text,source_locator_key from atlas_v2.polity_identity_relation_sources where polity_identity_relation_id=$1::uuid order by source_id::text,source_locator_key`, [id]);
  return { relation, source_links: links.rows.map((item) => ({ polity_identity_relation_id:String(item.polity_identity_relation_id).toLowerCase(), source_id:String(item.source_id).toLowerCase(), source_locator_key:item.source_locator_key })) };
}

function exactEqual(left, right) {
  const canonical = (value) => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])])) : value;
  return JSON.stringify(canonical(left)) === JSON.stringify(canonical(right));
}

async function assertStage2AssertionAbsent(client, operation) {
  let existing;
  if (operation.type === "assert_governance_period") existing = await loadGovernanceBundle(client, operation.exact_after.period.id, { forUpdate:true });
  else if (operation.type === "assert_polity_designation") existing = await loadDesignationBundle(client, operation.exact_after.designation.id, { forUpdate:true });
  else existing = await loadIdentityRelationBundle(client, operation.exact_after.relation.id, { forUpdate:true });
  if (existing) throw new Error(`CORRECTION_V2_ASSERTION_ID_ALREADY_EXISTS:${operation.decision_id}`);
}

async function insertStage2AssertionBundle(client, operation) {
  if (operation.type === "assert_governance_period") {
    const row = operation.exact_after.period;
    await client.query(`insert into atlas_v2.polity_governance_periods(${GOVERNANCE_FIELDS.join(",")}) values(${GOVERNANCE_FIELDS.map((_, i) => `$${i + 1}`).join(",")})`, GOVERNANCE_FIELDS.map((field) => row[field]));
    for (const link of operation.exact_after.source_links) await client.query(`insert into atlas_v2.polity_governance_period_sources(polity_governance_period_id,source_id,source_locator_key) values($1::uuid,$2::uuid,$3)`, [link.polity_governance_period_id,link.source_id,link.source_locator_key]);
    return;
  }
  if (operation.type === "assert_polity_designation") {
    const row = operation.exact_after.designation;
    await client.query(`insert into atlas_v2.polity_designations(${DESIGNATION_FIELDS.join(",")}) values(${DESIGNATION_FIELDS.map((_, i) => `$${i + 1}`).join(",")})`, DESIGNATION_FIELDS.map((field) => row[field]));
    for (const name of operation.exact_after.names) await client.query(`insert into atlas_v2.polity_designation_names(id,polity_designation_id,locale,name,is_preferred) values($1::uuid,$2::uuid,$3,$4,$5)`, [name.id,name.polity_designation_id,name.locale,name.name,name.is_preferred]);
    for (const link of operation.exact_after.source_links) await client.query(`insert into atlas_v2.polity_designation_sources(polity_designation_id,source_id,source_locator_key) values($1::uuid,$2::uuid,$3)`, [link.polity_designation_id,link.source_id,link.source_locator_key]);
    return;
  }
  const row = operation.exact_after.relation;
  await client.query(`insert into atlas_v2.polity_identity_relations(${IDENTITY_RELATION_FIELDS.join(",")}) values(${IDENTITY_RELATION_FIELDS.map((_, i) => `$${i + 1}`).join(",")})`, IDENTITY_RELATION_FIELDS.map((field) => row[field]));
  for (const link of operation.exact_after.source_links) await client.query(`insert into atlas_v2.polity_identity_relation_sources(polity_identity_relation_id,source_id,source_locator_key) values($1::uuid,$2::uuid,$3)`, [link.polity_identity_relation_id,link.source_id,link.source_locator_key]);
}

async function verifyStage2AssertionApplied(client, operation) {
  let actual;
  if (operation.type === "assert_governance_period") actual = await loadGovernanceBundle(client, operation.exact_after.period.id, { forUpdate:true });
  else if (operation.type === "assert_polity_designation") actual = await loadDesignationBundle(client, operation.exact_after.designation.id, { forUpdate:true });
  else actual = await loadIdentityRelationBundle(client, operation.exact_after.relation.id, { forUpdate:true });
  if (!exactEqual(actual, operation.exact_after)) throw new Error(`CORRECTION_V2_REPLAY_STAGE2_ASSERTION_DRIFT:${operation.decision_id}`);
}

function stage2AssertionCountDelta(operation) {
  const delta = { governance_periods:0, governance_sources:0, designations:0, designation_names:0, designation_sources:0, identity_relations:0, identity_relation_sources:0 };
  if (operation.type === "assert_governance_period") {
    delta.governance_periods = 1;
    delta.governance_sources = operation.exact_after.source_links.length;
  } else if (operation.type === "assert_polity_designation") {
    delta.designations = 1;
    delta.designation_names = operation.exact_after.names.length;
    delta.designation_sources = operation.exact_after.source_links.length;
  } else {
    delta.identity_relations = 1;
    delta.identity_relation_sources = operation.exact_after.source_links.length;
  }
  return delta;
}

function stage2AssertionIdentity(operation) {
  if (operation.type === "assert_governance_period") return { id:operation.exact_after.period.id, source_links:operation.exact_after.source_links, name_ids:[] };
  if (operation.type === "assert_polity_designation") return { id:operation.exact_after.designation.id, source_links:operation.exact_after.source_links, name_ids:operation.exact_after.names.map((name) => name.id) };
  return { id:operation.exact_after.relation.id, source_links:operation.exact_after.source_links, name_ids:[] };
}

module.exports = Object.freeze({
  STAGE2_ASSERTION_TYPES,
  GOVERNANCE_FIELDS,
  DESIGNATION_FIELDS,
  IDENTITY_RELATION_FIELDS,
  normalizeStage2AssertionOperation,
  loadGovernanceBundle,
  loadDesignationBundle,
  loadIdentityRelationBundle,
  assertStage2AssertionAbsent,
  insertStage2AssertionBundle,
  verifyStage2AssertionApplied,
  stage2AssertionCountDelta,
  stage2AssertionIdentity
});
