"use strict";

const fs = require("node:fs");
const path = require("node:path");

const QUEUE_SCHEMA = "atlas-registration-queue/v1";
const SOURCE_SCHEMA = "atlas-core/person-registration-queue-source/v1";
const SOURCE_PATH = path.join(__dirname, "..", "data", "core", "person-registration-queue-source.v1.json");
const TERMINAL_REGISTRATION_STATES = new Set(["REGISTERED", "VERIFIED_AUTHORING_ONLY", "NOT_APPLICABLE"]);

const REGISTRATION_STATE_SQL = `
select
  candidate_id,
  review_revision,
  registration_state,
  person_id::text,
  updated_at
from atlas_v2.person_candidate_registration_states
`;

const PERSON_NAME_SQL = `
select
  p.id::text as person_id,
  pn.name
from atlas_v2.persons p
join atlas_v2.person_names pn on pn.person_id=p.id
where nullif(trim(pn.name),'') is not null
`;

function text(value) {
  return String(value ?? "").normalize("NFC").trim();
}

function normalizeLookupName(value) {
  return text(value)
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .normalize("NFKC")
    .toLocaleLowerCase("und")
    .replace(/[’'`".,()[\]{}\-–—_/]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function loadQueueSource(filePath = SOURCE_PATH) {
  const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (payload?.schema !== SOURCE_SCHEMA || !Array.isArray(payload?.candidates)) {
    throw new Error("REGISTRATION_QUEUE_SOURCE_INVALID");
  }
  const seen = new Set();
  const candidates = payload.candidates.map((raw) => {
    const candidate_id = text(raw?.candidate_id);
    const name = text(raw?.name);
    if (!candidate_id || !name) throw new Error("REGISTRATION_QUEUE_SOURCE_CANDIDATE_INVALID");
    if (seen.has(candidate_id)) throw new Error(`REGISTRATION_QUEUE_SOURCE_DUPLICATE_ID:${candidate_id}`);
    seen.add(candidate_id);
    const lookup_names = [...new Set(
      (Array.isArray(raw?.lookup_names) ? raw.lookup_names : [name])
        .map(text)
        .filter(Boolean)
    )];
    if (!lookup_names.length) lookup_names.push(name);
    return Object.freeze({
      candidate_id,
      name,
      lookup_names:Object.freeze(lookup_names),
      representative_domain:raw?.representative_domain == null ? null : text(raw.representative_domain) || null,
      legacy_priority:raw?.legacy_priority == null ? null : text(raw.legacy_priority) || null,
      review_state:raw?.review_state == null ? null : text(raw.review_state) || null,
      origin:raw?.origin == null ? null : text(raw.origin) || null,
      source_issue:raw?.source_issue == null ? null : Number(raw.source_issue),
      source_comment_id:raw?.source_comment_id == null ? null : Number(raw.source_comment_id),
      human_authorized_by_user:raw?.human_authorized_by_user === true
    });
  });
  return Object.freeze({
    schema:payload.schema,
    version:Number(payload.version || 1),
    generated_at:payload.generated_at == null ? null : text(payload.generated_at),
    bootstrap:Object.freeze({ ...(payload.bootstrap || {}) }),
    candidates:Object.freeze(candidates)
  });
}

function registrationStateMap(rows) {
  const map = new Map();
  for (const row of rows || []) {
    const candidateId = text(row?.candidate_id);
    if (!candidateId) continue;
    map.set(candidateId, Object.freeze({
      candidate_id:candidateId,
      review_revision:row?.review_revision == null ? null : Number(row.review_revision),
      registration_state:text(row?.registration_state).toUpperCase() || null,
      person_id:row?.person_id == null ? null : text(row.person_id) || null,
      updated_at:row?.updated_at == null ? null : String(row.updated_at)
    }));
  }
  return map;
}

function personNameIndex(rows) {
  const map = new Map();
  for (const row of rows || []) {
    const key = normalizeLookupName(row?.name);
    const personId = text(row?.person_id);
    if (!key || !personId) continue;
    const ids = map.get(key) || new Set();
    ids.add(personId);
    map.set(key, ids);
  }
  return map;
}

function exactPersonMatches(candidate, index) {
  const ids = new Set();
  for (const lookupName of candidate.lookup_names || []) {
    const key = normalizeLookupName(lookupName);
    if (!key) continue;
    for (const id of index.get(key) || []) ids.add(id);
  }
  return Object.freeze([...ids].sort());
}

function summarizeCurrent(rows, sourceCount, removed) {
  const byDomain = {};
  const byState = {};
  for (const row of rows) {
    const domain = row.representative_domain || "unassigned";
    const state = row.registration_state || "LEGACY_QUEUED";
    byDomain[domain] = (byDomain[domain] || 0) + 1;
    byState[state] = (byState[state] || 0) + 1;
  }
  return Object.freeze({
    source_admissions:sourceCount,
    current_total:rows.length,
    removed_registered_state:removed.registered_state,
    removed_not_applicable:removed.not_applicable,
    removed_existing_person:removed.existing_person,
    ambiguous_existing_identity:removed.ambiguous_existing_identity,
    by_domain:Object.freeze(byDomain),
    by_registration_state:Object.freeze(byState)
  });
}

async function readCurrentRegistrationQueue({ client, source = loadQueueSource() } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  const [registrationResult, personNameResult] = await Promise.all([
    client.query(REGISTRATION_STATE_SQL),
    client.query(PERSON_NAME_SQL)
  ]);
  const registration = registrationStateMap(registrationResult.rows || []);
  const names = personNameIndex(personNameResult.rows || []);
  const removed = {
    registered_state:0,
    not_applicable:0,
    existing_person:0,
    ambiguous_existing_identity:0
  };
  const current = [];

  for (const candidate of source.candidates) {
    const state = registration.get(candidate.candidate_id) || null;
    const stateCode = state?.registration_state || null;

    if (stateCode === "NOT_APPLICABLE") {
      removed.not_applicable += 1;
      continue;
    }
    if (stateCode && TERMINAL_REGISTRATION_STATES.has(stateCode)) {
      removed.registered_state += 1;
      continue;
    }

    const exactMatches = exactPersonMatches(candidate, names);
    if (exactMatches.length === 1) {
      removed.existing_person += 1;
      continue;
    }
    if (exactMatches.length > 1) removed.ambiguous_existing_identity += 1;

    current.push(Object.freeze({
      candidate_id:candidate.candidate_id,
      name:candidate.name,
      lookup_names:candidate.lookup_names,
      representative_domain:candidate.representative_domain,
      legacy_priority:candidate.legacy_priority,
      review_state:candidate.review_state,
      origin:candidate.origin,
      registration_state:stateCode || "LEGACY_QUEUED",
      review_revision:state?.review_revision ?? null,
      state_updated_at:state?.updated_at ?? null,
      identity_resolution:exactMatches.length > 1 ? "AMBIGUOUS_EXISTING" : "PENDING",
      ambiguous_person_ids:exactMatches.length > 1 ? exactMatches : Object.freeze([])
    }));
  }

  current.sort((a,b) => {
    const byDomain = String(a.representative_domain || "").localeCompare(String(b.representative_domain || ""));
    if (byDomain) return byDomain;
    return a.name.localeCompare(b.name, "en");
  });

  return Object.freeze({
    schema:QUEUE_SCHEMA,
    source_schema:source.schema,
    generated_at:source.generated_at,
    summary:summarizeCurrent(current, source.candidates.length, removed),
    candidates:Object.freeze(current)
  });
}

module.exports = Object.freeze({
  QUEUE_SCHEMA,
  SOURCE_SCHEMA,
  SOURCE_PATH,
  TERMINAL_REGISTRATION_STATES,
  REGISTRATION_STATE_SQL,
  PERSON_NAME_SQL,
  text,
  normalizeLookupName,
  loadQueueSource,
  registrationStateMap,
  personNameIndex,
  exactPersonMatches,
  summarizeCurrent,
  readCurrentRegistrationQueue
});
