"use strict";

const { bindRegistrationQueueCandidate } = require("./atlas-registration-queue-read-service.js");
const { createPerson, createPolity, createRole, normalizeExact, normalizePersonLifeStatusReview } = require("./atlas-identity-service.js");
const { temporalContextFromHumanActivity } = require("./atlas-polity-identity-resolver.js");
const { createStage2NativeActivityTx, loadStage2NativeActivity } = require("./atlas-stage2-native-activity-service.js");
const { requiredUuid, historicalYear } = require("./atlas-activity-semantic-key-v2.js");
const { manifestHash, readLedger } = require("./atlas-authoring-manifest-service.js");
const { createSource } = require("./atlas-source-service.js");
const { normalizePersonPlaceFacts, resolvePersonPlaceFacts } = require("./atlas-place-relation-service.js");
const { CONTRACT:SPATIAL_FACT_CONTRACT, normalizeSpatialRegistrationHandshake } = require("./atlas-spatial-fact-contract.js");
const {
  materializeSpatialRegistrationDisposition,
  verifySpatialRegistrationDisposition
} = require("./atlas-spatial-registration-disposition-service.js");
const {
  normalizeTimelineDisposition,
  currentTimelineDisposition,
  sameTimelineDisposition,
  setTimelineDisposition
} = require("./atlas-person-timeline-service.js");
const {
  DOMAIN_DEFINITIONS,
  normalizeDomain,
  currentDomain,
  setRepresentativeDomainTx
} = require("./atlas-person-domain-service.js");

const { EMPTY_END, validateOngoingActivity } = require("./atlas-ongoing-activity.js");
const {
  normalizeNamuWikiDecision,
  currentExternalReference,
  sameDecision,
  setNamuWikiDecision,
  NAMUWIKI_FINAL_NOT_FOUND_REASONS
} = require("./atlas-external-reference-service.js");

const HUMAN_AUTHORING_SCHEMA = "atlas-human-authoring/v1";
const HUMAN_PERSON_AUTHORING_SCHEMA = "atlas-human-person-authoring/v1";
const HUMAN_AUTHORING_MARKER = "ATLAS_HUMAN_AUTHORING_V1";
const SEMANTIC_VERSION = "v2-relation-full-temporal";
const PERSON_ONLY_SEMANTIC_VERSION = "person-only-canonical-v1";
const RELATION_CODES = new Set(["rules", "governs", "serves", "active_in", "claims_rule"]);
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

function canonicalReplayDomain(value) {
  if (value == null || String(value).trim() === "") return null;
  const raw = String(value).trim().toLowerCase();
  return raw === "knowledge" ? "science" : normalizeDomain(raw);
}

function normalizeAuthoringDomain(value) {
  return canonicalReplayDomain(value);
}

function usesLegacyKnowledgeDomain(raw) {
  const schema = String(raw?.schema || "").trim();
  const value = schema === HUMAN_PERSON_AUTHORING_SCHEMA
    ? raw?.representative_domain
    : raw?.person?.representative_domain;
  return value != null && String(value).trim().toLowerCase() === "knowledge";
}

function canonicalizeReplaySnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return snapshot;
  if (snapshot.schema === HUMAN_PERSON_AUTHORING_SCHEMA && snapshot.representative_domain === "knowledge") {
    return Object.freeze({ ...snapshot, representative_domain:"science" });
  }
  if (snapshot.person_registration?.representative_domain === "knowledge") {
    return Object.freeze({
      ...snapshot,
      person_registration:Object.freeze({ ...snapshot.person_registration, representative_domain:"science" })
    });
  }
  return snapshot;
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
    rules:"ruler",
    claims_rule:"ruler",
    governs:"government",
    serves:"service",
    active_in:"activity"
  })[relationCode] || "activity";
}

function normalizeNamuWikiReference(raw, { allowLegacyOmission = true } = {}) {
  if (raw == null) {
    if (allowLegacyOmission) return null;
    throw new Error("HUMAN_AUTHORING_NAMUWIKI_REQUIRED");
  }
  try {
    const normalized = normalizeNamuWikiDecision(raw, { checkedAtRequired:true });
    return Object.freeze({
      status:normalized.status,
      checked_at:normalized.checked_at,
      document_title:normalized.document_title,
      url:normalized.url,
      review_state:normalized.review_state,
      review_reason:normalized.review_reason
    });
  } catch (error) {
    const code=String(error?.message || "");
    const mapped=code.replace(/^EXTERNAL_REFERENCE_/, "HUMAN_AUTHORING_");
    throw new Error(mapped || "HUMAN_AUTHORING_NAMUWIKI_INVALID");
  }
}

function normalizeBoundary(raw, prefix) {
  const yearValue = raw?.[`${prefix}_year`];
  const monthValue = raw?.[`${prefix}_month`];
  const dayValue = raw?.[`${prefix}_day`];
  const certaintyValue = raw?.[`${prefix}_certainty`];
  const calendarValue = raw?.[`${prefix}_calendar`];
  const unresolved = yearValue == null || yearValue === "";
  if (unresolved) {
    if ([monthValue, dayValue, certaintyValue, calendarValue].some((value) => value != null && value !== "")) {
      throw new Error(`HUMAN_AUTHORING_${prefix.toUpperCase()}_UNRESOLVED_BOUNDARY_MUST_BE_ALL_NULL`);
    }
    return Object.freeze({ year:null, month:null, day:null, granularity:null, certainty:null, calendar:null });
  }

  const year = historicalYear(yearValue, `${prefix}_year`);
  const month = monthValue == null || monthValue === "" ? null : Number(monthValue);
  const day = dayValue == null || dayValue === "" ? null : Number(dayValue);
  if (month != null && (!Number.isInteger(month) || month < 1 || month > 12)) throw new Error(`HUMAN_AUTHORING_${prefix.toUpperCase()}_MONTH_INVALID`);
  if (day != null && (!Number.isInteger(day) || day < 1 || day > 31)) throw new Error(`HUMAN_AUTHORING_${prefix.toUpperCase()}_DAY_INVALID`);
  if (day != null && month == null) throw new Error(`HUMAN_AUTHORING_${prefix.toUpperCase()}_DAY_REQUIRES_MONTH`);
  const granularity = day != null ? "day" : month != null ? "month" : "year";
  const certainty = requiredText(certaintyValue, `HUMAN_AUTHORING_${prefix.toUpperCase()}_CERTAINTY_REQUIRED`);
  if (!CERTAINTIES.has(certainty)) throw new Error(`HUMAN_AUTHORING_${prefix.toUpperCase()}_CERTAINTY_INVALID`);
  const calendar = optionalText(calendarValue) || "unspecified_historical";
  if (!CALENDARS.has(calendar)) throw new Error(`HUMAN_AUTHORING_${prefix.toUpperCase()}_CALENDAR_INVALID`);
  return Object.freeze({ year, month, day, granularity, certainty, calendar });
}

function normalizeSources(raw) {
  if (!Array.isArray(raw) || raw.length === 0) throw new Error("HUMAN_AUTHORING_SOURCE_REQUIRED");
  return raw.map((item, index) => {
    const source = requiredObject(item, `HUMAN_AUTHORING_SOURCE_INVALID:${index + 1}`);
    if (source.source_id != null) {
      return Object.freeze({
        mode:"existing",
        source_id:requiredUuid(source.source_id, `sources[${index}].source_id`),
        locator:requiredText(source.locator, `HUMAN_AUTHORING_SOURCE_LOCATOR_REQUIRED:${index + 1}`)
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

function automaticHumanRequestId(raw) {
  const request = requiredObject(raw, "HUMAN_AUTHORING_REQUEST_OBJECT_REQUIRED");
  const payload = { ...request };
  delete payload.request_id;
  return `human-v6.1:${manifestHash(payload).slice(0, 40)}`;
}

function withResolvedHumanRequestId(raw) {
  const request = requiredObject(raw, "HUMAN_AUTHORING_REQUEST_OBJECT_REQUIRED");
  const explicit = optionalText(request.request_id);
  if (explicit) return Object.freeze({ request, request_id:explicit, generated:false });
  const requestId = automaticHumanRequestId(request);
  return Object.freeze({
    request:Object.freeze({ ...request, request_id:requestId }),
    request_id:requestId,
    generated:true
  });
}

function normalizeHumanAuthoringRequest(raw, { allowLegacyNamuWikiOmission = true } = {}) {
  const request = requiredObject(raw, "HUMAN_AUTHORING_REQUEST_OBJECT_REQUIRED");
  if (request.schema !== HUMAN_AUTHORING_SCHEMA) throw new Error("HUMAN_AUTHORING_SCHEMA_REQUIRED");
  const requestId = requiredText(request.request_id, "HUMAN_AUTHORING_REQUEST_ID_REQUIRED");
  const person = requiredObject(request.person, "HUMAN_AUTHORING_PERSON_REQUIRED");
  const polity = request.polity == null ? null : requiredObject(request.polity, "HUMAN_AUTHORING_POLITY_INVALID");
  const activity = requiredObject(request.activity, "HUMAN_AUTHORING_ACTIVITY_REQUIRED");
  const relationCode = optionalText(activity.relation_type);
  if (relationCode != null && !/^[a-z][a-z0-9_]*$/.test(relationCode)) throw new Error("HUMAN_AUTHORING_RELATION_TYPE_INVALID");
  if (relationCode === "opposes") throw new Error("HUMAN_AUTHORING_PRIMARY_OPPOSES_FORBIDDEN");
  if ((polity == null) !== (relationCode == null)) throw new Error("HUMAN_AUTHORING_PRIMARY_POLITY_RELATION_PAIR_REQUIRED");
  const periodBasis = requiredText(activity.period_basis, "HUMAN_AUTHORING_PERIOD_BASIS_REQUIRED");
  const start = normalizeBoundary(activity, "start");
  const ongoing = validateOngoingActivity(activity, { human:true });
  const end = ongoing ? EMPTY_END : normalizeBoundary(activity, "end");
  const confidence = requiredText(activity.confidence, "HUMAN_AUTHORING_CONFIDENCE_REQUIRED");
  if (!CONFIDENCE_VALUES.has(confidence)) throw new Error("HUMAN_AUTHORING_CONFIDENCE_INVALID");
  const roleLabel = optionalText(activity.role);
  const roleDisplayKo = optionalText(activity.role_display_name_ko);
  const roleCategory = optionalText(activity.role_category) || (roleLabel ? roleCategoryForRelation(relationCode) : null);
  const roleCode = optionalText(activity.role_code) || (roleLabel ? roleCodeFromLabel(roleLabel) : null);
  const namuwiki = normalizeNamuWikiReference(request?.external_references?.namuwiki, { allowLegacyOmission:allowLegacyNamuWikiOmission });
  const lifeStatusReview = normalizePersonLifeStatusReview(person);
  return Object.freeze({
    requestId,
    person:Object.freeze({
      canonical_name_en:requiredText(person.canonical_name_en, "HUMAN_AUTHORING_PERSON_EN_REQUIRED"),
      display_name_ko:optionalText(person.display_name_ko),
      canonical_key:optionalText(person.canonical_key),
      person_type:optionalText(person.person_type) || "historical",
      historicity:optionalText(person.historicity) || "historical",
      ...(lifeStatusReview || {}),
      representative_domain_reviewed:Object.prototype.hasOwnProperty.call(person, "representative_domain"),
      representative_domain:normalizeAuthoringDomain(person.representative_domain),
      place_facts:normalizePersonPlaceFacts(person.place_facts)
    }),
    polity:polity == null ? null : Object.freeze({
      existing_id:polity.existing_id == null ? null : requiredUuid(polity.existing_id, "polity.existing_id"),
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
      ...(ongoing ? { ongoing_as_of:activity.ongoing_as_of } : {}),
      notes:optionalText(activity.notes)
    }),
    sources:Object.freeze(normalizeSources(request.sources)),
    external_references:Object.freeze({ namuwiki }),
    raw_spatial_disposition:request.spatial_disposition == null ? null : request.spatial_disposition
  });
}

function prepareHumanAuthoringRequest(rawRequest, { allowLegacyNamuWikiOmission = true } = {}) {
  const resolved = withResolvedHumanRequestId(rawRequest);
  return Object.freeze({
    schema:HUMAN_AUTHORING_SCHEMA,
    rawRequest:resolved.request,
    request:normalizeHumanAuthoringRequest(resolved.request, { allowLegacyNamuWikiOmission }),
    hash:manifestHash(resolved.request),
    requestIdGenerated:resolved.generated,
    legacyDomainAliasUsed:usesLegacyKnowledgeDomain(resolved.request)
  });
}

function normalizeHumanPersonAuthoringRequest(raw, { allowLegacyNamuWikiOmission = true } = {}) {
  const request = requiredObject(raw, "HUMAN_PERSON_AUTHORING_REQUEST_OBJECT_REQUIRED");
  if (request.schema !== HUMAN_PERSON_AUTHORING_SCHEMA) throw new Error("HUMAN_PERSON_AUTHORING_SCHEMA_REQUIRED");
  const requestId = requiredText(request.request_id, "HUMAN_PERSON_AUTHORING_REQUEST_ID_REQUIRED");
  const person = requiredObject(request.person, "HUMAN_PERSON_AUTHORING_PERSON_REQUIRED");
  const lifeStatusReview = normalizePersonLifeStatusReview(person);
  const namuwiki = normalizeNamuWikiReference(request?.external_references?.namuwiki, { allowLegacyOmission:allowLegacyNamuWikiOmission });
  const timelineDisposition = normalizeTimelineDisposition(requiredObject(request.timeline_disposition, "HUMAN_PERSON_AUTHORING_TIMELINE_DISPOSITION_REQUIRED"));
  if (timelineDisposition.disposition === "timeline") throw new Error("HUMAN_PERSON_AUTHORING_NON_TIMELINE_DISPOSITION_REQUIRED");
  const representativeDomain = normalizeAuthoringDomain(requiredText(request.representative_domain, "HUMAN_PERSON_AUTHORING_DOMAIN_REQUIRED"));
  if (!representativeDomain) throw new Error("HUMAN_PERSON_AUTHORING_DOMAIN_REQUIRED");
  return Object.freeze({
    requestId,
    person:Object.freeze({
      canonical_name_en:requiredText(person.canonical_name_en, "HUMAN_PERSON_AUTHORING_PERSON_EN_REQUIRED"),
      display_name_ko:requiredText(person.display_name_ko, "HUMAN_PERSON_AUTHORING_PERSON_KO_REQUIRED"),
      canonical_key:optionalText(person.canonical_key),
      person_type:optionalText(person.person_type) || "historical",
      historicity:optionalText(person.historicity) || "historical",
      ...(lifeStatusReview || {})
    }),
    timeline_disposition:timelineDisposition,
    representative_domain:representativeDomain,
    sources:Object.freeze(normalizeSources(request.sources)),
    external_references:Object.freeze({ namuwiki })
  });
}

function prepareHumanPersonAuthoringRequest(rawRequest, { allowLegacyNamuWikiOmission = true } = {}) {
  const resolved = withResolvedHumanRequestId(rawRequest);
  return Object.freeze({
    schema:HUMAN_PERSON_AUTHORING_SCHEMA,
    rawRequest:resolved.request,
    request:normalizeHumanPersonAuthoringRequest(resolved.request, { allowLegacyNamuWikiOmission }),
    hash:manifestHash(resolved.request),
    requestIdGenerated:resolved.generated,
    legacyDomainAliasUsed:usesLegacyKnowledgeDomain(resolved.request)
  });
}

function prepareAnyHumanAuthoringRequest(rawRequest, options = {}) {
  const schema = String(rawRequest?.schema || "").trim();
  if (schema === HUMAN_PERSON_AUTHORING_SCHEMA) return prepareHumanPersonAuthoringRequest(rawRequest, options);
  return prepareHumanAuthoringRequest(rawRequest, options);
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
  const {
    representative_domain,
    representative_domain_reviewed,
    place_facts,
    ...identityPerson
  } = person;
  const created = await createPerson(client, { ...identityPerson, allow_display_name_collision:false });
  return Object.freeze({
    id:String(created.id).toLowerCase(),
    disposition:created.replay ? "reused" : "created",
    ...(created.life_status_review ? { life_status_review:created.life_status_review } : {})
  });
}

async function resolveOrCreatePolity(client, polity, activity = null) {
  if (polity.existing_id) {
    const exact = await client.query(`
      select p.id::text,p.canonical_key,p.polity_type,p.historicity,
             en.name as canonical_name_en,ko.name as display_name_ko
        from atlas_v2.polities p
        left join atlas_v2.polity_names en
          on en.polity_id=p.id and en.locale='en' and en.is_preferred=true
        left join atlas_v2.polity_names ko
          on ko.polity_id=p.id and ko.locale='ko' and ko.is_preferred=true
       where p.id=$1::uuid
       limit 1
    `, [polity.existing_id]);
    const row = exact.rows?.[0];
    if (!row) throw new Error("HUMAN_AUTHORING_POLITY_ID_UNRESOLVED");
    const metadataMatches = String(row.canonical_name_en || "") === polity.canonical_name_en
      && String(row.polity_type || "") === polity.polity_type
      && String(row.historicity || "") === polity.historicity
      && (polity.canonical_key == null || String(row.canonical_key || "") === polity.canonical_key)
      && (polity.display_name_ko == null || String(row.display_name_ko || "") === polity.display_name_ko);
    if (!metadataMatches) throw new Error("HUMAN_AUTHORING_POLITY_IDENTITY_MISMATCH");
    return Object.freeze({ id:String(row.id).toLowerCase(), disposition:"reused" });
  }
  let created;
  try {
    created = await createPolity(client, {
      ...polity,
      allow_display_name_collision:false,
      identity_context:temporalContextFromHumanActivity(activity)
    });
  } catch (error) {
    if (String(error?.message || "") === "POLITY_DISPLAY_NAME_REQUIRED") {
      throw new Error("HUMAN_AUTHORING_NEW_POLITY_KO_REQUIRED");
    }
    throw error;
  }
  return Object.freeze({
    id:String(created.id).toLowerCase(),
    disposition:created.replay ? "reused" : "created"
  });
}

async function resolveOrCreateRole(client, activity) {
  if (!activity.role) return Object.freeze({ id:null, disposition:"none" });
  const byName = await client.query(`
    select distinct r.id::text
      from atlas_v2.roles r
      left join atlas_v2.role_names n on n.role_id=r.id and n.locale='en' and n.is_preferred=true
     where r.is_active=true and (r.source_label=$1 or n.name=$1)
     order by r.id::text
     limit 2`, [activity.role]);
  if (byName.rows.length > 1) throw new Error("HUMAN_AUTHORING_ROLE_NAME_AMBIGUOUS");
  if (byName.rows.length === 1) return Object.freeze({ id:String(byName.rows[0].id).toLowerCase(), disposition:"reused" });
  const roleCode = activity.role_code || roleCodeFromLabel(activity.role);
  const byCode = await client.query(`
    select r.id::text
      from atlas_v2.roles r
     where r.is_active=true and r.code=$1
     order by r.id::text
     limit 2`, [roleCode]);
  if (byCode.rows.length > 1) throw new Error("HUMAN_AUTHORING_ROLE_CODE_AMBIGUOUS");
  if (byCode.rows.length === 1) return Object.freeze({ id:String(byCode.rows[0].id).toLowerCase(), disposition:"reused" });
  if (!activity.role_display_name_ko) throw new Error("HUMAN_AUTHORING_NEW_ROLE_KO_REQUIRED");
  const created = await createRole(client, { code:roleCode, source_label:activity.role, display_name_ko:activity.role_display_name_ko, category:activity.role_category });
  return Object.freeze({ id:String(created.id).toLowerCase(), disposition:created.replay ? "reused" : "created" });
}

async function resolveCatalogCode(client, { table, code, unresolvedCode }) {
  const result = await client.query(`select id::text,code from atlas_v2.${table} where code=$1 and is_active=true order by id::text limit 2`, [code]);
  if (result.rows.length !== 1) throw new Error(unresolvedCode);
  return Object.freeze({ id:String(result.rows[0].id).toLowerCase(), code:String(result.rows[0].code) });
}

async function resolveCatalogCodeCached(client, cache, options) {
  if (!cache) return resolveCatalogCode(client, options);
  const key = `${options.table}:${options.code}`;
  if (!cache.has(key)) cache.set(key, await resolveCatalogCode(client, options));
  return cache.get(key);
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
    let outcome;
    try {
      outcome = await createSource(client, {
        source_key:sourceKey,
        source_type:source.source_type,
        title:source.title,
        canonical_url:source.canonical_url,
        citation_text:source.citation_text
      }, { lock:false, keyCollision:"error" });
    } catch (error) {
      const code=String(error?.message || "");
      if (code === "SOURCE_CANONICAL_URL_AMBIGUOUS_REVIEW_REQUIRED") throw new Error(`HUMAN_AUTHORING_SOURCE_CANONICAL_URL_AMBIGUOUS:${index + 1}`);
      if (code === "SOURCE_KEY_CONFLICT") throw new Error(`HUMAN_AUTHORING_SOURCE_KEY_COLLISION:${index + 1}`);
      if (code === "SOURCE_CREATE_FAILED") throw new Error(`HUMAN_AUTHORING_SOURCE_CREATE_FAILED:${index + 1}`);
      throw error;
    }
    results.push(Object.freeze({
      id:String(outcome.id).toLowerCase(),
      locator:source.locator,
      disposition:outcome.replay ? "reused" : "created"
    }));
  }
  return Object.freeze(results);
}

async function linkPersonSources(client, personId, sources) {
  for (const source of sources) {
    await client.query(
      `insert into atlas_v2.person_sources(person_id,source_id)
       values($1::uuid,$2::uuid)
       on conflict do nothing`,
      [personId, source.id]
    );
  }
  const live = await client.query(
    `select source_id::text
       from atlas_v2.person_sources
      where person_id=$1::uuid
      order by source_id::text`,
    [personId]
  );
  const liveIds = new Set((live.rows || []).map((row) => String(row.source_id).toLowerCase()));
  for (const source of sources) {
    if (!liveIds.has(String(source.id).toLowerCase())) throw new Error("HUMAN_PERSON_AUTHORING_SOURCE_LINK_VERIFICATION_FAILED");
  }
  return Object.freeze([...liveIds]);
}

async function writeTimelineAudit(client, requestId, personId, result) {
  if (result.replay) return;
  await client.query(
    `insert into atlas_v2.person_profile_mutation_audits(request_id,person_id,operation,before_snapshot,after_snapshot)
     values($1,$2::uuid,'set_person_timeline_disposition',$3::jsonb,$4::jsonb)`,
    [
      `${requestId}:timeline`,
      personId,
      JSON.stringify({ timeline_disposition:result.before }),
      JSON.stringify({ timeline_disposition:result.after })
    ]
  );
}

async function currentNamuWikiReference(client, personId, { forUpdate = false } = {}) {
  const row = await currentExternalReference(client, personId, "namuwiki", { forUpdate });
  if (!row) return null;
  return Object.freeze({
    status:String(row.status),
    checked_at:row.checked_at == null ? null : String(row.checked_at),
    document_title:row.document_title == null ? null : String(row.document_title),
    url:row.url == null ? null : String(row.url),
    ...(row.review_state == null ? {} : { review_state:String(row.review_state) }),
    ...(row.review_reason == null ? {} : { review_reason:String(row.review_reason) })
  });
}

function sameNamuWikiCore(left, right) {
  return sameDecision(left, right);
}

async function resolveNamuWikiReference(client, { requestId, person, requested, allowLegacyNamuWikiOmission = false }) {
  const current = await currentNamuWikiReference(client, person.id, { forUpdate:true });
  if (!requested) {
    if (current) return current;
    if (allowLegacyNamuWikiOmission) return null;
    throw new Error("HUMAN_AUTHORING_NAMUWIKI_REQUIRED");
  }
  if (requested.status === "not_found") {
    if (!requested.review_reason) throw new Error("HUMAN_AUTHORING_NAMUWIKI_REVIEW_REASON_REQUIRED");
    if (!NAMUWIKI_FINAL_NOT_FOUND_REASONS.includes(requested.review_reason)) {
      throw new Error("HUMAN_AUTHORING_NAMUWIKI_REVIEW_REASON_INVALID");
    }
  }
  let result;
  try {
    result = await setNamuWikiDecision(client, person.id, requested, {
      checkedAtRequired:true,
      preventLinkedOverwrite:true
    });
  } catch (error) {
    const code=String(error?.message || "");
    if (code === "EXTERNAL_REFERENCE_OVERWRITE_REVIEW_REQUIRED") throw new Error("HUMAN_AUTHORING_NAMUWIKI_OVERWRITE_REVIEW_REQUIRED");
    if (code === "EXTERNAL_REFERENCE_VERIFICATION_FAILED") throw new Error("HUMAN_AUTHORING_NAMUWIKI_VERIFICATION_FAILED");
    throw error;
  }
  const after = result.after == null ? null : Object.freeze({
    status:String(result.after.status),
    checked_at:result.after.checked_at == null ? null : String(result.after.checked_at),
    document_title:result.after.document_title == null ? null : String(result.after.document_title),
    url:result.after.url == null ? null : String(result.after.url),
    ...(result.after.review_state == null ? {} : { review_state:String(result.after.review_state) }),
    ...(result.after.review_reason == null ? {} : { review_reason:String(result.after.review_reason) })
  });
  if (!result.replay) {
    const before = result.before == null ? null : Object.freeze({
      status:String(result.before.status),
      checked_at:result.before.checked_at == null ? null : String(result.before.checked_at),
      document_title:result.before.document_title == null ? null : String(result.before.document_title),
      url:result.before.url == null ? null : String(result.before.url),
      ...(result.before.review_state == null ? {} : { review_state:String(result.before.review_state) }),
      ...(result.before.review_reason == null ? {} : { review_reason:String(result.before.review_reason) })
    });
    await client.query(`
      insert into atlas_v2.person_profile_mutation_audits(request_id,person_id,operation,before_snapshot,after_snapshot)
      values($1,$2::uuid,'set_person_external_reference',$3::jsonb,$4::jsonb)`,
      [`${requestId}:namuwiki`, person.id, JSON.stringify({ external_reference:before }), JSON.stringify({ external_reference:after })]);
  }
  return after;
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
    ...(activity.chronology_status === "ongoing" ? { ongoing_as_of:activity.ongoing_as_of } : {}),
    notes:activity.notes,
    source_links:sources.map((source) => Object.freeze({ source_id:source.id, source_locator_key:source.locator }))
  });
}

function buildSnapshot({ person, polity, role, relation, periodBasis, sources, activity, transport, externalReferences, personRegistration = null }) {
  return Object.freeze({
    version:1,
    schema:HUMAN_AUTHORING_SCHEMA,
    semantic_version:SEMANTIC_VERSION,
    transport:transport || null,
    external_references:externalReferences || Object.freeze({ namuwiki:null }),
    person_registration:personRegistration,
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


async function verifyNewPersonRegistrationReadback(client, {
  personId,
  timelineDisposition,
  representativeDomain,
  sourceIds,
  namuwiki
}) {
  const normalizedPersonId = requiredUuid(personId, "person_registration.person_id");
  const timeline = await currentTimelineDisposition(client, normalizedPersonId, { forUpdate:true });
  if (!sameTimelineDisposition(timeline, { person_id:normalizedPersonId, ...timelineDisposition })) {
    throw new Error("HUMAN_AUTHORING_NEW_PERSON_TIMELINE_READBACK_DRIFT");
  }

  const domain = await currentDomain(client, normalizedPersonId);
  if (domain !== canonicalReplayDomain(representativeDomain)) throw new Error("HUMAN_AUTHORING_NEW_PERSON_DOMAIN_READBACK_DRIFT");

  const liveNamuWiki = await currentNamuWikiReference(client, normalizedPersonId, { forUpdate:true });
  if (!sameNamuWikiCore(liveNamuWiki, namuwiki)) throw new Error("HUMAN_AUTHORING_NEW_PERSON_NAMUWIKI_READBACK_DRIFT");

  const links = await client.query(
    `select source_id::text
       from atlas_v2.person_sources
      where person_id=$1::uuid
      order by source_id::text`,
    [normalizedPersonId]
  );
  const liveSourceIds = new Set((links.rows || []).map((row) => String(row.source_id).toLowerCase()));
  const expectedSourceIds = [...new Set((sourceIds || []).map((id) => String(id).toLowerCase()))].sort();
  for (const sourceId of expectedSourceIds) {
    if (!liveSourceIds.has(sourceId)) throw new Error("HUMAN_AUTHORING_NEW_PERSON_SOURCE_READBACK_DRIFT");
  }

  return Object.freeze({
    timeline_disposition:Object.freeze({ ...timelineDisposition }),
    representative_domain_reviewed:true,
    representative_domain:domain,
    source_ids:Object.freeze(expectedSourceIds),
    namuwiki:liveNamuWiki
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
  if (snapshot.person_registration) {
    await verifyNewPersonRegistrationReadback(client, {
      personId:ledger.person_id,
      timelineDisposition:snapshot.person_registration.timeline_disposition,
      representativeDomain:snapshot.person_registration.representative_domain,
      sourceIds:snapshot.person_registration.source_ids,
      namuwiki:snapshot.person_registration.namuwiki
    });
  }
  if (snapshot.spatial_disposition?.authority === "atlas_v2.spatial_registration_dispositions") {
    await verifySpatialRegistrationDisposition(client, snapshot.spatial_disposition);
  }
  return canonicalizeReplaySnapshot(snapshot);
}

function outcome(requestId, replay, snapshot) {
  return Object.freeze({
    marker:HUMAN_AUTHORING_MARKER,
    schema:HUMAN_AUTHORING_SCHEMA,
    request_id:requestId,
    committed:true,
    replay,
    person_id:snapshot.entities.person.id,
    polity_id:snapshot.entities.polity?.id ?? null,
    role_id:snapshot.entities.role.id,
    relationship_id:snapshot.entities.activity.id,
    source_ids:snapshot.entities.sources.map((source) => source.id),
    external_references:snapshot.external_references || Object.freeze({ namuwiki:null }),
    result:snapshot
  });
}

function buildPersonOnlySnapshot({ person, sources, timelineDisposition, representativeDomain, transport, externalReferences }) {
  return Object.freeze({
    version:1,
    schema:HUMAN_PERSON_AUTHORING_SCHEMA,
    semantic_version:PERSON_ONLY_SEMANTIC_VERSION,
    transport:transport || null,
    external_references:externalReferences || Object.freeze({ namuwiki:null }),
    person:Object.freeze({ ...person }),
    timeline_disposition:Object.freeze({ ...timelineDisposition }),
    representative_domain:representativeDomain,
    sources:Object.freeze(sources.map((source) => Object.freeze({ id:source.id, disposition:source.disposition, locator:source.locator })))
  });
}

async function verifyPersonOnlyReplay(client, ledger) {
  const snapshot = ledger?.result_snapshot;
  if (snapshot?.schema !== HUMAN_PERSON_AUTHORING_SCHEMA || Number(snapshot?.version) !== 1 || snapshot?.semantic_version !== PERSON_ONLY_SEMANTIC_VERSION) {
    throw new Error("HUMAN_PERSON_AUTHORING_LEDGER_SNAPSHOT_INVALID");
  }
  const personId = requiredUuid(snapshot?.person?.id, "ledger.person.id");
  if (String(ledger.person_id) !== personId || ledger.relationship_id != null) throw new Error("HUMAN_PERSON_AUTHORING_REPLAY_LEDGER_DRIFT");
  const person = await client.query(`select id::text from atlas_v2.persons where id=$1::uuid`, [personId]);
  if (person.rowCount !== 1) throw new Error("HUMAN_PERSON_AUTHORING_REPLAY_PERSON_NOT_FOUND");
  const timeline = await currentTimelineDisposition(client, personId, { forUpdate:true });
  if (!sameTimelineDisposition(timeline, { person_id:personId, ...snapshot.timeline_disposition })) throw new Error("HUMAN_PERSON_AUTHORING_REPLAY_TIMELINE_DRIFT");
  const domain = await currentDomain(client, personId);
  if (domain !== canonicalReplayDomain(snapshot.representative_domain)) throw new Error("HUMAN_PERSON_AUTHORING_REPLAY_DOMAIN_DRIFT");
  const namuwiki = await currentNamuWikiReference(client, personId, { forUpdate:true });
  if (!sameNamuWikiCore(namuwiki, snapshot.external_references?.namuwiki)) throw new Error("HUMAN_PERSON_AUTHORING_REPLAY_NAMUWIKI_DRIFT");
  const links = await client.query(`select source_id::text from atlas_v2.person_sources where person_id=$1::uuid order by source_id::text`, [personId]);
  const liveIds = new Set((links.rows || []).map((row) => String(row.source_id).toLowerCase()));
  for (const source of snapshot.sources || []) {
    if (!liveIds.has(String(source.id).toLowerCase())) throw new Error("HUMAN_PERSON_AUTHORING_REPLAY_SOURCE_DRIFT");
  }
  return canonicalizeReplaySnapshot(snapshot);
}

function personOnlyOutcome(requestId, replay, snapshot) {
  return Object.freeze({
    marker:HUMAN_AUTHORING_MARKER,
    schema:HUMAN_PERSON_AUTHORING_SCHEMA,
    request_id:requestId,
    committed:true,
    replay,
    person_id:snapshot.person.id,
    polity_id:null,
    role_id:null,
    relationship_id:null,
    source_ids:snapshot.sources.map((source) => source.id),
    external_references:snapshot.external_references || Object.freeze({ namuwiki:null }),
    result:snapshot
  });
}

async function assertPersonOnlyTargetHasNoActivities(client, personId) {
  const result = await client.query(
    `select count(*)::int as activity_count
       from atlas_v2.person_politics_v2
      where person_id=$1::uuid`,
    [personId]
  );
  const count = Number(result.rows?.[0]?.activity_count || 0);
  if (count !== 0) throw new Error("HUMAN_PERSON_AUTHORING_EXISTING_ACTIVITY_CONFLICT");
  return count;
}

async function applyPersonOnlyPreparedWithinTransaction(client, prepared, { transport = null, allowLegacyNamuWikiOmission = false } = {}) {
  const { request, hash } = prepared;
  const ledger = await readLedger(client, request.requestId);
  if (ledger) {
    if (ledger.manifest_hash !== hash) throw new Error("AUTHORING_REQUEST_ID_COLLISION");
    if (ledger.manifest_schema !== HUMAN_PERSON_AUTHORING_SCHEMA) throw new Error("AUTHORING_LEDGER_SCHEMA_MISMATCH");
    return personOnlyOutcome(request.requestId, true, await verifyPersonOnlyReplay(client, ledger));
  }
  if (prepared.legacyDomainAliasUsed) throw new Error("HUMAN_AUTHORING_LEGACY_KNOWLEDGE_NEW_WRITE_RETIRED");

  const person = await resolveOrCreatePerson(client, request.person);
  await assertPersonOnlyTargetHasNoActivities(client, person.id);
  const namuwiki = await resolveNamuWikiReference(client, {
    requestId:request.requestId,
    person,
    requested:request.external_references.namuwiki,
    allowLegacyNamuWikiOmission
  });
  const sources = await resolveOrCreateSources(client, request.requestId, request.sources);
  await linkPersonSources(client, person.id, sources);
  const timelineResult = await setTimelineDisposition(client, person.id, request.timeline_disposition);
  await writeTimelineAudit(client, request.requestId, person.id, timelineResult);
  const domainResult = await setRepresentativeDomainTx(client, {
    person_id:person.id,
    representative_domain:request.representative_domain,
    request_id:`${request.requestId}:domain`
  });

  const snapshot = buildPersonOnlySnapshot({
    person,
    sources,
    timelineDisposition:timelineResult.after,
    representativeDomain:domainResult.representative_domain,
    transport,
    externalReferences:Object.freeze({ namuwiki })
  });
  await client.query(
    `insert into atlas_v2.authoring_manifest_runs(request_id,manifest_hash,manifest_schema,person_id,relationship_id,result_snapshot)
     values($1,$2,$3,$4::uuid,null,$5::jsonb)`,
    [request.requestId, hash, HUMAN_PERSON_AUTHORING_SCHEMA, person.id, JSON.stringify(snapshot)]
  );
  return personOnlyOutcome(request.requestId, false, snapshot);
}

async function applyPreparedWithinTransaction(client, prepared, { transport = null, catalogCache = null, allowLegacyNamuWikiOmission = false } = {}) {
  if (prepared?.schema === HUMAN_PERSON_AUTHORING_SCHEMA) {
    return applyPersonOnlyPreparedWithinTransaction(client, prepared, { transport, allowLegacyNamuWikiOmission });
  }
  const { request, hash } = prepared;
  const ledger = await readLedger(client, request.requestId);
  if (ledger) {
    if (ledger.manifest_hash !== hash) throw new Error("AUTHORING_REQUEST_ID_COLLISION");
    if (ledger.manifest_schema !== HUMAN_AUTHORING_SCHEMA) throw new Error("AUTHORING_LEDGER_SCHEMA_MISMATCH");
    const snapshot = await verifyReplay(client, ledger);
    return outcome(request.requestId, true, snapshot);
  }
  if (prepared.legacyDomainAliasUsed) throw new Error("HUMAN_AUTHORING_LEGACY_KNOWLEDGE_NEW_WRITE_RETIRED");
  const relation = request.activity.relation_type == null
    ? Object.freeze({ id:null, code:null })
    : await resolveCatalogCodeCached(client, catalogCache, { table:"person_polity_relation_types", code:request.activity.relation_type, unresolvedCode:"HUMAN_AUTHORING_RELATION_TYPE_UNRESOLVED" });
  const periodBasis = await resolveCatalogCodeCached(client, catalogCache, { table:"period_bases", code:request.activity.period_basis, unresolvedCode:"HUMAN_AUTHORING_PERIOD_BASIS_UNRESOLVED" });
  const person = await resolveOrCreatePerson(client, request.person);
  if (person.disposition === "created" && request.person.representative_domain_reviewed !== true) {
    throw new Error("HUMAN_AUTHORING_NEW_PERSON_DOMAIN_REVIEW_REQUIRED");
  }
  const polity = request.polity == null
    ? Object.freeze({ id:null, disposition:"none" })
    : await resolveOrCreatePolity(client, request.polity, request.activity);
  const role = await resolveOrCreateRole(client, request.activity);
  const namuwiki = await resolveNamuWikiReference(client, {
    requestId:request.requestId,
    person,
    requested:request.external_references.namuwiki,
    allowLegacyNamuWikiOmission
  });
  const sources = await resolveOrCreateSources(client, request.requestId, request.sources);
  let personRegistration = null;
  if (person.disposition === "created") {
    await linkPersonSources(client, person.id, sources);
    const timelineResult = await setTimelineDisposition(client, person.id, { disposition:"timeline" });
    await writeTimelineAudit(client, request.requestId, person.id, timelineResult);
    const domainResult = await setRepresentativeDomainTx(client, {
      person_id:person.id,
      representative_domain:request.person.representative_domain,
      request_id:`${request.requestId}:domain`
    });
    personRegistration = await verifyNewPersonRegistrationReadback(client, {
      personId:person.id,
      timelineDisposition:timelineResult.after,
      representativeDomain:domainResult.representative_domain,
      sourceIds:sources.map((source) => source.id),
      namuwiki
    });
  }
  const placeFacts = await resolvePersonPlaceFacts(client, { personId:person.id, facts:request.person.place_facts });
  const spatialReview = normalizeSpatialRegistrationHandshake(request.raw_spatial_disposition, { polityDisposition:polity.disposition });
  const spatialDisposition = spatialReview.required
    ? await materializeSpatialRegistrationDisposition(client, {
        polityId:polity.id,
        requestId:request.requestId,
        review:spatialReview
      })
    : Object.freeze({ ...spatialReview, materialized:true });
  const payload = activityPayload({ personId:person.id, polityId:polity.id, roleId:role.id, relation, periodBasis, activity:request.activity, sources });
  const created = await createStage2NativeActivityTx(client).create(payload, { requestId:request.requestId });
  const snapshot = Object.freeze({ ...buildSnapshot({ person, polity, role, relation, periodBasis, sources, activity:created, transport, externalReferences:Object.freeze({ namuwiki }), personRegistration }), person_place_facts:placeFacts, spatial_disposition:spatialDisposition });
  await client.query(`insert into atlas_v2.authoring_manifest_runs(request_id,manifest_hash,manifest_schema,person_id,relationship_id,result_snapshot) values($1,$2,$3,$4::uuid,$5::uuid,$6::jsonb)`, [request.requestId, hash, HUMAN_AUTHORING_SCHEMA, person.id, created.id, JSON.stringify(snapshot)]);
  return outcome(request.requestId, false, snapshot);
}

function manifestPathFromTransport(transport) {
  return transport && typeof transport === "object" ? optionalText(transport.manifest_path) : null;
}

function annotateBatchError(error, index, transport) {
  const target = error instanceof Error ? error : new Error(String(error || "HUMAN_AUTHORING_FAILED"));
  if (!Number.isInteger(target.batchIndex)) target.batchIndex = index;
  if (!target.manifestPath) target.manifestPath = manifestPathFromTransport(transport);
  return target;
}

async function rollbackQuietly(client) {
  try { await client.query("rollback"); } catch {}
}

async function lockRequestIds(client, requestIds) {
  const ordered = [...requestIds].sort((a, b) => a.localeCompare(b));
  for (const requestId of ordered) {
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [`atlas-human-authoring:${requestId}`]);
  }
}

function normalizeQueueCandidateId(value) {
  if (value == null) return null;
  const candidateId = String(value).normalize("NFC").trim();
  if (!candidateId) throw new Error("HUMAN_AUTHORING_QUEUE_CANDIDATE_ID_INVALID");
  return candidateId;
}

function createHumanAuthoringService({ client, prepare = prepareAnyHumanAuthoringRequest, applyPrepared = applyPreparedWithinTransaction, bindQueueCandidate = bindRegistrationQueueCandidate } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  if (typeof prepare !== "function") throw new Error("prepare is required");
  if (typeof applyPrepared !== "function") throw new Error("applyPrepared is required");
  if (typeof bindQueueCandidate !== "function") throw new Error("bindQueueCandidate is required");
  return Object.freeze({
    async apply(rawRequest, { transport = null, allowLegacyNamuWikiOmission = true, candidate_id = null } = {}) {
      const prepared = prepare(rawRequest, { allowLegacyNamuWikiOmission:true });
      const queueCandidateId = normalizeQueueCandidateId(candidate_id);
      await client.query("begin isolation level serializable");
      try {
        await lockRequestIds(client, [prepared.request.requestId]);
        const result = await applyPrepared(client, prepared, { transport, catalogCache:new Map(), allowLegacyNamuWikiOmission:false });
        if (queueCandidateId) {
          await bindQueueCandidate(client, { candidate_id:queueCandidateId, person_id:result.person_id, required:true });
        }
        await client.query("commit");
        return result;
      } catch (error) {
        await rollbackQuietly(client);
        throw error;
      }
    },

    async preflightBatch(rawRequests, { transports = null, allowLegacyNamuWikiOmission = true } = {}) {
      if (!Array.isArray(rawRequests) || rawRequests.length === 0) throw new Error("HUMAN_AUTHORING_BATCH_REQUESTS_REQUIRED");
      const normalizedTransports = transports == null ? rawRequests.map(() => null) : transports;
      if (!Array.isArray(normalizedTransports) || normalizedTransports.length !== rawRequests.length) throw new Error("HUMAN_AUTHORING_BATCH_TRANSPORT_LENGTH_MISMATCH");

      const prepared = new Array(rawRequests.length).fill(null);
      const results = new Array(rawRequests.length).fill(null);
      const firstIndexByRequestId = new Map();

      for (let index = 0; index < rawRequests.length; index += 1) {
        try {
          const item = prepare(rawRequests[index], { allowLegacyNamuWikiOmission:true });
          const requestId = item.request.requestId;
          if (firstIndexByRequestId.has(requestId)) {
            results[index] = Object.freeze({
              index,
              manifest_path:manifestPathFromTransport(normalizedTransports[index]),
              request_id:requestId,
              request_id_generated:item.requestIdGenerated === true,
              status:"BLOCKED",
              code:"HUMAN_AUTHORING_BATCH_DUPLICATE_REQUEST_ID"
            });
            continue;
          }
          firstIndexByRequestId.set(requestId, index);
          prepared[index] = item;
        } catch (error) {
          results[index] = Object.freeze({
            index,
            manifest_path:manifestPathFromTransport(normalizedTransports[index]),
            request_id:null,
            request_id_generated:false,
            status:"BLOCKED",
            code:String(error?.message || "HUMAN_AUTHORING_FAILED")
          });
        }
      }

      const catalogCache = new Map();
      for (let index = 0; index < prepared.length; index += 1) {
        const item = prepared[index];
        if (!item) continue;
        await client.query("begin isolation level serializable");
        try {
          await lockRequestIds(client, [item.request.requestId]);
          const outcome = await applyPrepared(client, item, {
            transport:normalizedTransports[index],
            catalogCache,
            allowLegacyNamuWikiOmission:false
          });
          await rollbackQuietly(client);
          results[index] = Object.freeze({
            index,
            manifest_path:manifestPathFromTransport(normalizedTransports[index]),
            request_id:outcome.request_id,
            request_id_generated:item.requestIdGenerated === true,
            status:outcome.replay === true ? "ALREADY_PRESENT" : "READY",
            code:null,
            person_id:outcome.replay === true ? outcome.person_id : null,
            polity_id:outcome.replay === true ? outcome.polity_id : null,
            role_id:outcome.replay === true ? outcome.role_id : null,
            relationship_id:outcome.replay === true ? outcome.relationship_id : null,
            relation_type_id:outcome.replay === true ? outcome.result?.entities?.relation_type?.id ?? null : null,
            period_basis_id:outcome.replay === true ? outcome.result?.entities?.period_basis?.id ?? null : null,
            external_references:outcome.replay === true ? outcome.external_references : null
          });
        } catch (error) {
          await rollbackQuietly(client);
          results[index] = Object.freeze({
            index,
            manifest_path:manifestPathFromTransport(normalizedTransports[index]),
            request_id:item.request.requestId,
            request_id_generated:item.requestIdGenerated === true,
            status:"BLOCKED",
            code:String(error?.message || "HUMAN_AUTHORING_FAILED")
          });
        }
      }
      return Object.freeze(results);
    },

    async applyBatch(rawRequests, { transports = null, allowLegacyNamuWikiOmission = true, candidate_ids = null } = {}) {
      if (!Array.isArray(rawRequests) || rawRequests.length === 0) throw new Error("HUMAN_AUTHORING_BATCH_REQUESTS_REQUIRED");
      const normalizedTransports = transports == null ? rawRequests.map(() => null) : transports;
      if (!Array.isArray(normalizedTransports) || normalizedTransports.length !== rawRequests.length) throw new Error("HUMAN_AUTHORING_BATCH_TRANSPORT_LENGTH_MISMATCH");
      if (candidate_ids != null && !Array.isArray(candidate_ids)) throw new Error("HUMAN_AUTHORING_BATCH_CANDIDATE_IDS_INVALID");
      const normalizedCandidateIds = candidate_ids == null ? rawRequests.map(() => null) : candidate_ids.map(normalizeQueueCandidateId);
      if (normalizedCandidateIds.length !== rawRequests.length) throw new Error("HUMAN_AUTHORING_BATCH_CANDIDATE_IDS_LENGTH_MISMATCH");

      const prepared = new Array(rawRequests.length).fill(null);
      const preparationFailures = [];
      for (let index = 0; index < rawRequests.length; index += 1) {
        try {
          prepared[index] = prepare(rawRequests[index], { allowLegacyNamuWikiOmission:true });
        } catch (error) {
          preparationFailures.push({ index, error:annotateBatchError(error, index, normalizedTransports[index]) });
        }
      }

      const firstIndexByRequestId = new Map();
      const duplicateFailures = [];
      for (let index = 0; index < prepared.length; index += 1) {
        if (!prepared[index]) continue;
        const requestId = prepared[index].request.requestId;
        if (firstIndexByRequestId.has(requestId)) {
          const error = annotateBatchError(new Error("HUMAN_AUTHORING_BATCH_DUPLICATE_REQUEST_ID"), index, normalizedTransports[index]);
          duplicateFailures.push({ index, error });
          prepared[index] = null;
          continue;
        }
        firstIndexByRequestId.set(requestId, index);
      }

      const catalogCache = new Map();
      const results = [];
      const failures = [...preparationFailures, ...duplicateFailures];
      for (let index = 0; index < prepared.length; index += 1) {
        if (!prepared[index]) continue;
        await client.query("begin isolation level serializable");
        try {
          await lockRequestIds(client, [prepared[index].request.requestId]);
          const result = await applyPrepared(client, prepared[index], {
            transport:normalizedTransports[index],
            catalogCache,
            allowLegacyNamuWikiOmission:false
          });
          if (normalizedCandidateIds[index]) {
            await bindQueueCandidate(client, {
              candidate_id:normalizedCandidateIds[index],
              person_id:result.person_id,
              required:true
            });
          }
          await client.query("commit");
          results.push(result);
        } catch (error) {
          await rollbackQuietly(client);
          failures.push({ index, error:annotateBatchError(error, index, normalizedTransports[index]) });
        }
      }

      if (failures.length) {
        failures.sort((a, b) => a.index - b.index);
        const first = failures[0].error;
        first.batchResults = Object.freeze([...results]);
        first.batchFailures = Object.freeze(failures.map((item) => Object.freeze({ index:item.index, code:String(item.error?.message || "HUMAN_AUTHORING_FAILED"), manifest_path:item.error?.manifestPath || null })));
        throw first;
      }
      return Object.freeze(results);
    }
  });
}

async function loadHumanAuthoringCatalogs(client) {
  const relations = await client.query(`select code from atlas_v2.person_polity_relation_types where is_active=true and code<>'opposes' order by code`);
  const periods = await client.query(`select code from atlas_v2.period_bases where is_active=true order by code`);
  return Object.freeze({
    relation_types:Object.freeze(relations.rows.map((row) => String(row.code))),
    period_bases:Object.freeze(periods.rows.map((row) => String(row.code))),
    representative_domains:Object.freeze(DOMAIN_DEFINITIONS.map((item) => Object.freeze({ code:item.code, label_ko:item.label_ko }))),
    representative_domain_reviewed_null_allowed:true,
    spatial_registration_states:Object.freeze([...SPATIAL_FACT_CONTRACT.registration_handshake.required_terminal_states])
  });
}

module.exports = Object.freeze({
  HUMAN_AUTHORING_SCHEMA,
  HUMAN_PERSON_AUTHORING_SCHEMA,
  HUMAN_AUTHORING_MARKER,
  SEMANTIC_VERSION,
  RELATION_CODES,
  CERTAINTIES,
  CONFIDENCE_VALUES,
  CALENDARS,
  roleCodeFromLabel,
  roleCategoryForRelation,
  normalizeNamuWikiReference,
  normalizeBoundary,
  canonicalReplayDomain,
  normalizeAuthoringDomain,
  usesLegacyKnowledgeDomain,
  canonicalizeReplaySnapshot,
  automaticHumanRequestId,
  withResolvedHumanRequestId,
  normalizeHumanAuthoringRequest,
  normalizeHumanPersonAuthoringRequest,
  prepareHumanAuthoringRequest,
  prepareHumanPersonAuthoringRequest,
  prepareAnyHumanAuthoringRequest,
  activityPayload,
  resolveCatalogCode,
  resolveOrCreatePerson,
  resolveOrCreatePolity,
  resolveOrCreateRole,
  resolveOrCreateSources,
  linkPersonSources,
  currentNamuWikiReference,
  resolveNamuWikiReference,
  applyPreparedWithinTransaction,
  applyPersonOnlyPreparedWithinTransaction,
  assertPersonOnlyTargetHasNoActivities,
  verifyPersonOnlyReplay,
  verifyNewPersonRegistrationReadback,
  lockRequestIds,
  normalizeQueueCandidateId,
  createHumanAuthoringService,
  loadHumanAuthoringCatalogs
});