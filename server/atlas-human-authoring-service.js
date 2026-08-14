"use strict";

const { createPerson, createPolity, createRole, normalizeExact } = require("./atlas-identity-service.js");
const { createStage2NativeActivityTx, loadStage2NativeActivity } = require("./atlas-stage2-native-activity-service.js");
const { requiredUuid, historicalYear } = require("./atlas-activity-semantic-key-v2.js");
const { manifestHash, readLedger } = require("./atlas-authoring-manifest-service.js");

const HUMAN_AUTHORING_SCHEMA = "atlas-human-authoring/v1";
const HUMAN_AUTHORING_MARKER = "ATLAS_HUMAN_AUTHORING_V1";
const SEMANTIC_VERSION = "v2-relation-full-temporal";
const RELATION_CODES = new Set(["rules", "governs", "serves", "active_in", "opposes", "claims_rule"]);
const CERTAINTIES = new Set(["exact", "approximate", "uncertain"]);
const CONFIDENCE_VALUES = new Set(["well_established", "likely", "speculative", "disputed", "unknown"]);
const CALENDARS = new Set(["gregorian", "julian", "unspecified_historical", "source_calendar"]);

function requiredText(value, code) {
  const text = normalizeExact(value);
  if (!text) throw new Error(code);
  return text;
}

function optionalText(value) {
  return normalizeExact(value) || null;
}

function requiredObject(value, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(code);
  return value;
}

function roleCodeFromLabel(value) {
  const label = requiredText(value, "HUMAN_AUTHORING_ROLE_LABEL_REQUIRED");
  const ascii = label.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const code = ascii.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (!code) throw new Error("HUMAN_AUTHORING_ROLE_CODE_DERIVATION_FAILED");
  return code;
}

function roleCategoryForRelation(relationCode) {
  return ({
    rules: "ruler",
    claims_rule: "ruler",
    governs: "government",
    serves: "service",
    active_in: "activity",
    opposes: "opposition"
  })[relationCode] || "activity";
}

function normalizeBoundary(raw, prefix) {
  const year = historicalYear(raw?.[`${prefix}_year`], `${prefix}_year`);
  const monthValue = raw?.[`${prefix}_month`];
  const dayValue = raw?.[`${prefix}_day`];
  const month = monthValue == null || monthValue === "" ? null : Number(monthValue);
  const day = dayValue == null || dayValue === "" ? null : Number(dayValue);
  if (month != null && (!Number.isInteger(month) || month < 1 || month > 12)) throw new Error(`HUMAN_AUTHORING_${prefix.toUpperCase()}_MONTH_INVALID`);
  if (day != null && (!Number.isInteger(day) || day < 1 || day > 31)) throw new Error(`HUMAN_AUTHORING_${prefix.toUpperCase()}_DAY_INVALID`);
  if (day != null && month == null) throw new Error(`HUMAN_AUTHORING_${prefix.toUpperCase()}_DAY_REQUIRES_MONTH`);
  const granularity = day != null ? "day" : month != null ? "month" : "year";
  const certainty = requiredText(raw?.[`${prefix}_certainty`], `HUMAN_AUTHORING_${prefix.toUpperCase()}_CERTAINTY_REQUIRED`);
  if (!CERTAINTIES.has(certainty)) throw new Error(`HUMAN_AUTHORING_${prefix.toUpperCase()}_CERTAINTY_INVALID`);
  const calendar = optionalText(raw?.[`${prefix}_calendar`]) || "unspecified_historical";
  if (!CALENDARS.has(calendar)) throw new Error(`HUMAN_AUTHORING_${prefix.toUpperCase()}_CALENDAR_INVALID`);
  return Object.freeze({ year, month, day, granularity, certainty, calendar });
}

function normalizeSources(raw) {
  if (!Array.isArray(raw) || raw.length === 0) throw new Error("HUMAN_AUTHORING_SOURCE_REQUIRED");
  return raw.map((item, index) => {
    const source = requiredObject(item, `HUMAN_AUTHORING_SOURCE_INVALID:${index + 1}`);
    if (source.source_id != null) {
      return Object.freeze({
        mode: "existing",
        source_id: requiredUuid(source.source_id, `sources[${index}].source_id`),
        locator: requiredText(source.locator, `HUMAN_AUTHORING_SOURCE_LOCATOR_REQUIRED:${index + 1}`)
      });
    }
    const title = requiredText(source.title, `HUMAN_AUTHORING_SOURCE_TITLE_REQUIRED:${index + 1}`);
    const canonicalUrl = optionalText(source.canonical_url);
    const citationText = optionalText(source.citation_text) || title;
    const sourceType = optionalText(source.source_type) || (canonicalUrl ? "web_bibliographic_reference" : "bibliographic_reference");
    const locator = optionalText(source.locator) || canonicalUrl || citationText;
    return Object.freeze({ mode:"create", title, canonical_url:canonicalUrl, citation_text:citationText, source_type:sourceType, locator });
  });
}

function normalizeHumanAuthoringRequest(raw) {
  const request = requiredObject(raw, "HUMAN_AUTHORING_REQUEST_OBJECT_REQUIRED");
  if (request.schema !== HUMAN_AUTHORING_SCHEMA) throw new Error("HUMAN_AUTHORING_SCHEMA_REQUIRED");
  const requestId = requiredText(request.request_id, "HUMAN_AUTHORING_REQUEST_ID_REQUIRED");
  const person = requiredObject(request.person, "HUMAN_AUTHORING_PERSON_REQUIRED");
  const polity = requiredObject(request.polity, "HUMAN_AUTHORING_POLITY_REQUIRED");
  const activity = requiredObject(request.activity, "HUMAN_AUTHORING_ACTIVITY_REQUIRED");
  const relationCode = requiredText(activity.relation_type, "HUMAN_AUTHORING_RELATION_TYPE_REQUIRED");
  if (!/^[a-z][a-z0-9_]*$/.test(relationCode)) throw new Error("HUMAN_AUTHORING_RELATION_TYPE_INVALID");
  const periodBasis = requiredText(activity.period_basis, "HUMAN_AUTHORING_PERIOD_BASIS_REQUIRED");
  const start = normalizeBoundary(activity, "start");
  const end = normalizeBoundary(activity, "end");
  const confidence = requiredText(activity.confidence, "HUMAN_AUTHORING_CONFIDENCE_REQUIRED");
  if (!CONFIDENCE_VALUES.has(confidence)) throw new Error("HUMAN_AUTHORING_CONFIDENCE_INVALID");
  const roleLabel = optionalText(activity.role);
  const roleDisplayKo = optionalText(activity.role_display_name_ko);
  const roleCategory = optionalText(activity.role_category) || (roleLabel ? roleCategoryForRelation(relationCode) : null);
  const roleCode = optionalText(activity.role_code) || (roleLabel ? roleCodeFromLabel(roleLabel) : null);

  return Object.freeze({
    requestId,
    person:Object.freeze({
      canonical_name_en:requiredText(person.canonical_name_en, "HUMAN_AUTHORING_PERSON_EN_REQUIRED"),
      display_name_ko:optionalText(person.display_name_ko),
      canonical_key:optionalText(person.canonical_key),
      person_type:optionalText(person.person_type) || "historical",
      historicity:optionalText(person.historicity) || "historical"
    }),
    polity:Object.freeze({
      canonical_name_en:requiredText(polity.canonical_name_en, "HUMAN_AUTHORING_POLITY_EN_REQUIRED"),
      display_name_ko:optionalText(polity.display_name_ko),
      canonical_key:optionalText(polity.canonical_key),
      polity_type:optionalText(polity.polity_type) || "historical_polity",
      historicity:optionalText(polity.historicity) || "historical"
    }),
    activity:Object.freeze({
      relation_type:relationCode,
      period_basis:periodBasis,
      role:roleLabel,
      role_code:roleCode,
      role_display_name_ko:roleDisplayKo,
      role_category:roleCategory,
      start,
      end,
      confidence,
      chronology_status:optionalText(activity.chronology_status) || "reviewed",
      notes:optionalText(activity.notes)
    }),
    sources:Object.freeze(normalizeSources(request.sources))
  });
}

async function exactEntityByPreferredEnglishName(client, { table, namesTable, ownerColumn, name, activeSql = "" }) {
  const result = await client.query(`
    select distinct e.id::text
      from atlas_v2.${table} e
      join atlas_v2.${namesTable} n on n.${ownerColumn}=e.id
     where n.locale='en' and n.is_preferred=true and n.name=$1 ${activeSql}
     order by e.id::text
     limit 2`, [name]);
  if (result.rows.length > 1) throw new Error(`HUMAN_AUTHORING_${table.toUpperCase()}_NAME_AMBIGUOUS`);
  return result.rows[0]?.id ? String(result.rows[0].id).toLowerCase() : null;
}

async function resolveOrCreatePerson(client, person) {
  const existing = await exactEntityByPreferredEnglishName(client, { table:"persons", namesTable:"person_names", ownerColumn:"person_id", name:person.canonical_name_en });
  if (existing) return Object.freeze({ id:existing, disposition:"reused" });
  if (!person.display_name_ko) throw new Error("HUMAN_AUTHORING_NEW_PERSON_KO_REQUIRED");
  const created = await createPerson(client, { ...person, allow_display_name_collision:false });
  return Object.freeze({ id:String(created.id).toLowerCase(), disposition:created.replay ? "reused" : "created" });
}

async function resolveOrCreatePolity(client, polity) {
  const existing = await exactEntityByPreferredEnglishName(client, { table:"polities", namesTable:"polity_names", ownerColumn:"polity_id", name:polity.canonical_name_en });
  if (existing) return Object.freeze({ id:existing, disposition:"reused" });
  if (!polity.display_name_ko) throw new Error("HUMAN_AUTHORING_NEW_POLITY_KO_REQUIRED");
  const created = await createPolity(client, { ...polity, allow_display_name_collision:false });
  return Object.freeze({ id:String(created.id).toLowerCase(), disposition:created.replay ? "reused" : "created" });
}

async function resolveOrCreateRole(client, activity) {
  if (!activity.role) return Object.freeze({ id:null, disposition:"none" });
  const result = await client.query(`
    select distinct r.id::text
      from atlas_v2.roles r
      left join atlas_v2.role_names n on n.role_id=r.id and n.locale='en' and n.is_preferred=true
     where r.is_active=true and (r.source_label=$1 or n.name=$1)
     order by r.id::text
     limit 2`, [activity.role]);
  if (result.rows.length > 1) throw new Error("HUMAN_AUTHORING_ROLE_NAME_AMBIGUOUS");
  if (result.rows.length === 1) return Object.freeze({ id:String(result.rows[0].id).toLowerCase(), disposition:"reused" });
  if (!activity.role_display_name_ko) throw new Error("HUMAN_AUTHORING_NEW_ROLE_KO_REQUIRED");
  const created = await createRole(client, { code:activity.role_code, source_label:activity.role, display_name_ko:activity.role_display_name_ko, category:activity.role_category });
  return Object.freeze({ id:String(created.id).toLowerCase(), disposition:created.replay ? "reused" : "created" });
}

async function resolveCatalogCode(client, { table, code, unresolvedCode }) {
  const result = await client.query(`select id::text,code from atlas_v2.${table} where code=$1 and is_active=true order by id::text limit 2`, [code]);
  if (result.rows.length !== 1) throw new Error(unresolvedCode);
  return Object.freeze({ id:String(result.rows[0].id).toLowerCase(), code:String(result.rows[0].code) });
}

async function resolveOrCreateSources(client, requestId, sources) {
  const results = [];
  for (let index = 0; index < sources.length; index += 1) {
    const source = sources[index];
    if (source.mode === "existing") {
      const found = await client.query(`select id::text from atlas_v2.sources where id=$1::uuid`, [source.source_id]);
      if (found.rows.length !== 1) throw new Error(`HUMAN_AUTHORING_SOURCE_ID_UNRESOLVED:${index + 1}`);
      results.push(Object.freeze({ id:source.source_id, locator:source.locator, disposition:"reused" }));
      continue;
    }
    const sourceKey = `human-authoring:${requestId}:${index + 1}`;
    const collision = await client.query(`select id::text from atlas_v2.sources where source_key=$1 limit 1`, [sourceKey]);
    if (collision.rows.length) throw new Error(`HUMAN_AUTHORING_SOURCE_KEY_COLLISION:${index + 1}`);
    const inserted = await client.query(`
      insert into atlas_v2.sources(id,source_key,source_type,title,sha256,bytes,canonical_url,citation_text)
      values(gen_random_uuid(),$1,$2,$3,null,null,$4,$5)
      returning id::text`, [sourceKey, source.source_type, source.title, source.canonical_url, source.citation_text]);
    const id = String(inserted.rows[0]?.id || "").toLowerCase();
    if (!id) throw new Error(`HUMAN_AUTHORING_SOURCE_CREATE_FAILED:${index + 1}`);
    results.push(Object.freeze({ id, locator:source.locator, disposition:"created" }));
  }
  return Object.freeze(results);
}

function activityPayload({ personId, polityId, roleId, relation, periodBasis, activity, sources }) {
  return Object.freeze({
    person_id:personId,
    polity_id:polityId,
    relation_type_id:relation.id,
    role_id:roleId,
    period_basis_id:periodBasis.id,
    activity_start:activity.start.year,
    activity_start_month:activity.start.month,
    activity_start_day:activity.start.day,
    activity_start_granularity:activity.start.granularity,
    activity_start_certainty:activity.start.certainty,
    activity_start_calendar:activity.start.calendar,
    activity_end:activity.end.year,
    activity_end_month:activity.end.month,
    activity_end_day:activity.end.day,
    activity_end_granularity:activity.end.granularity,
    activity_end_certainty:activity.end.certainty,
    activity_end_calendar:activity.end.calendar,
    confidence:activity.confidence,
    chronology_status:activity.chronology_status,
    notes:activity.notes,
    source_links:sources.map((source) => Object.freeze({ source_id:source.id, source_locator_key:source.locator }))
  });
}

function buildSnapshot({ person, polity, role, relation, periodBasis, sources, activity, transport }) {
  return Object.freeze({
    version:1,
    schema:HUMAN_AUTHORING_SCHEMA,
    semantic_version:SEMANTIC_VERSION,
    transport:transport || null,
    entities:Object.freeze({
      person,
      polity,
      role,
      relation_type:Object.freeze({ id:relation.id, code:relation.code }),
      period_basis:Object.freeze({ id:periodBasis.id, code:periodBasis.code }),
      sources:Object.freeze(sources.map((source) => Object.freeze({ id:source.id, disposition:source.disposition, locator:source.locator }))),
      activity:Object.freeze({ id:activity.id, semantic_key:activity.semantic_key, semantic_hash:activity.semantic_hash })
    })
  });
}

async function verifyReplay(client, ledger) {
  const snapshot = ledger?.result_snapshot;
  if (snapshot?.schema !== HUMAN_AUTHORING_SCHEMA || Number(snapshot?.version) !== 1 || snapshot?.semantic_version !== SEMANTIC_VERSION) throw new Error("HUMAN_AUTHORING_LEDGER_SNAPSHOT_INVALID");
  const activityId = requiredUuid(snapshot?.entities?.activity?.id, "ledger.activity.id");
  const live = await loadStage2NativeActivity(client, activityId, { forUpdate:true });
  if (!live) throw new Error("HUMAN_AUTHORING_REPLAY_ACTIVITY_NOT_FOUND");
  if (String(live.person_id) !== String(ledger.person_id) || String(activityId) !== String(ledger.relationship_id)) throw new Error("HUMAN_AUTHORING_REPLAY_LEDGER_DRIFT");
  const expectedSourceIds = (snapshot.entities.sources || []).map((source) => String(source.id)).sort();
  const liveSourceIds = (live.source_links || []).map((source) => String(source.source_id)).sort();
  if (JSON.stringify(expectedSourceIds) !== JSON.stringify(liveSourceIds)) throw new Error("HUMAN_AUTHORING_REPLAY_SOURCE_DRIFT");
  return snapshot;
}

function outcome(requestId, replay, snapshot) {
  return Object.freeze({
    marker:HUMAN_AUTHORING_MARKER,
    schema:HUMAN_AUTHORING_SCHEMA,
    request_id:requestId,
    committed:true,
    replay,
    person_id:snapshot.entities.person.id,
    polity_id:snapshot.entities.polity.id,
    role_id:snapshot.entities.role.id,
    relationship_id:snapshot.entities.activity.id,
    source_ids:snapshot.entities.sources.map((source) => source.id),
    result:snapshot
  });
}

function createHumanAuthoringService({ client } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  return Object.freeze({
    async apply(rawRequest, { transport = null } = {}) {
      const request = normalizeHumanAuthoringRequest(rawRequest);
      const hash = manifestHash(rawRequest);
      await client.query("begin isolation level serializable");
      try {
        await client.query("select pg_advisory_xact_lock(hashtext($1))", [`atlas-human-authoring:${request.requestId}`]);
        const ledger = await readLedger(client, request.requestId);
        if (ledger) {
          if (ledger.manifest_hash !== hash) throw new Error("AUTHORING_REQUEST_ID_COLLISION");
          if (ledger.manifest_schema !== HUMAN_AUTHORING_SCHEMA) throw new Error("AUTHORING_LEDGER_SCHEMA_MISMATCH");
          const snapshot = await verifyReplay(client, ledger);
          await client.query("commit");
          return outcome(request.requestId, true, snapshot);
        }
        const relation = await resolveCatalogCode(client, { table:"person_polity_relation_types", code:request.activity.relation_type, unresolvedCode:"HUMAN_AUTHORING_RELATION_TYPE_UNRESOLVED" });
        const periodBasis = await resolveCatalogCode(client, { table:"period_bases", code:request.activity.period_basis, unresolvedCode:"HUMAN_AUTHORING_PERIOD_BASIS_UNRESOLVED" });
        const person = await resolveOrCreatePerson(client, request.person);
        const polity = await resolveOrCreatePolity(client, request.polity);
        const role = await resolveOrCreateRole(client, request.activity);
        const sources = await resolveOrCreateSources(client, request.requestId, request.sources);
        const payload = activityPayload({ personId:person.id, polityId:polity.id, roleId:role.id, relation, periodBasis, activity:request.activity, sources });
        const created = await createStage2NativeActivityTx(client).create(payload, { requestId:request.requestId });
        const snapshot = buildSnapshot({ person, polity, role, relation, periodBasis, sources, activity:created, transport });
        await client.query(`insert into atlas_v2.authoring_manifest_runs(request_id,manifest_hash,manifest_schema,person_id,relationship_id,result_snapshot) values($1,$2,$3,$4::uuid,$5::uuid,$6::jsonb)`, [request.requestId, hash, HUMAN_AUTHORING_SCHEMA, person.id, created.id, JSON.stringify(snapshot)]);
        await client.query("commit");
        return outcome(request.requestId, false, snapshot);
      } catch (error) {
        try { await client.query("rollback"); } catch {}
        throw error;
      }
    }
  });
}

async function loadHumanAuthoringCatalogs(client) {
  // Keep a single pg.Client sequential. The catalog payload is tiny and does
  // not justify deprecated concurrent client.query() calls.
  const relations = await client.query(`select code from atlas_v2.person_polity_relation_types where is_active=true order by code`);
  const periods = await client.query(`select code from atlas_v2.period_bases where is_active=true order by code`);
  return Object.freeze({ relation_types:Object.freeze(relations.rows.map((row) => String(row.code))), period_bases:Object.freeze(periods.rows.map((row) => String(row.code))) });
}

module.exports = Object.freeze({
  HUMAN_AUTHORING_SCHEMA,
  HUMAN_AUTHORING_MARKER,
  SEMANTIC_VERSION,
  RELATION_CODES,
  CERTAINTIES,
  CONFIDENCE_VALUES,
  CALENDARS,
  roleCodeFromLabel,
  roleCategoryForRelation,
  normalizeHumanAuthoringRequest,
  activityPayload,
  resolveCatalogCode,
  resolveOrCreatePerson,
  resolveOrCreatePolity,
  resolveOrCreateRole,
  resolveOrCreateSources,
  createHumanAuthoringService,
  loadHumanAuthoringCatalogs
});
