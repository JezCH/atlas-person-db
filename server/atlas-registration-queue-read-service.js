"use strict";

const QUEUE_SCHEMA = "atlas-registration-queue/v2";
const QUEUE_TABLE = "atlas_v2.person_registration_candidates";

const PENDING_SQL = `
select
  candidate_id,
  name,
  representative_domain,
  priority,
  review_metadata,
  created_at,
  updated_at
from atlas_v2.person_registration_candidates
where person_id is null
order by coalesce(representative_domain,''), name, candidate_id
`;

const SUMMARY_SQL = `
select
  count(*)::int as candidate_total,
  count(*) filter (where q.person_id is null)::int as current_total,
  count(*) filter (where q.person_id is not null)::int as registered_bound,
  count(*) filter (where q.person_id is not null and p.id is null)::int as dangling_person_ids
from atlas_v2.person_registration_candidates q
left join atlas_v2.persons p on p.id=q.person_id
`;

function text(value) {
  return String(value ?? "").normalize("NFC").trim();
}

function requiredCandidateId(value) {
  const candidateId = text(value);
  if (!candidateId) throw new Error("REGISTRATION_QUEUE_CANDIDATE_ID_REQUIRED");
  return candidateId;
}

function requiredPersonId(value) {
  const personId = text(value).toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(personId)) {
    throw new Error("REGISTRATION_QUEUE_PERSON_ID_REQUIRED");
  }
  return personId;
}

function normalizeMetadata(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

async function readCurrentRegistrationQueue({ client } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");

  const summaryResult = await client.query(SUMMARY_SQL);
  const pendingResult = await client.query(PENDING_SQL);
  const row = summaryResult.rows?.[0] || {};
  const candidates = (pendingResult.rows || []).map((item) => {
    const reviewMetadata = normalizeMetadata(item.review_metadata);
    const priority = item.priority == null ? null : text(item.priority) || null;
    return Object.freeze({
      candidate_id:requiredCandidateId(item.candidate_id),
      name:text(item.name),
      representative_domain:item.representative_domain == null ? null : text(item.representative_domain) || null,
      priority,
      legacy_priority:priority,
      review_state:reviewMetadata.review_state == null ? null : text(reviewMetadata.review_state) || null,
      origin:reviewMetadata.origin == null ? null : text(reviewMetadata.origin) || null,
      review_metadata:Object.freeze({ ...reviewMetadata }),
      created_at:item.created_at == null ? null : String(item.created_at),
      updated_at:item.updated_at == null ? null : String(item.updated_at)
    });
  });

  const byDomain = {};
  for (const candidate of candidates) {
    const domain = candidate.representative_domain || "unassigned";
    byDomain[domain] = (byDomain[domain] || 0) + 1;
  }

  const candidateTotal = Number(row.candidate_total || 0);
  const currentTotal = Number(row.current_total || 0);
  const registeredBound = Number(row.registered_bound || 0);
  return Object.freeze({
    schema:QUEUE_SCHEMA,
    authority:QUEUE_TABLE,
    membership_rule:"person_id IS NULL",
    summary:Object.freeze({
      candidate_total:candidateTotal,
      source_admissions:candidateTotal,
      current_total:currentTotal,
      registered_bound:registeredBound,
      pending_count:currentTotal,
      dangling_person_ids:Number(row.dangling_person_ids || 0),
      duplicate_candidate_ids:0,
      by_domain:Object.freeze(byDomain)
    }),
    candidates:Object.freeze(candidates)
  });
}

async function loadRegistrationQueueCandidate(client, candidateId, { forUpdate = false } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  const id = requiredCandidateId(candidateId);
  const result = await client.query(
    `select candidate_id,person_id::text
       from atlas_v2.person_registration_candidates
      where candidate_id=$1
      ${forUpdate ? "for update" : ""}`,
    [id]
  );
  return result.rows?.[0] || null;
}

async function bindRegistrationQueueCandidate(client, {
  candidate_id,
  person_id,
  required = false
} = {}) {
  const candidateId = requiredCandidateId(candidate_id);
  const personId = requiredPersonId(person_id);
  const current = await loadRegistrationQueueCandidate(client, candidateId, { forUpdate:true });

  if (!current) {
    if (required) throw new Error("REGISTRATION_QUEUE_CANDIDATE_NOT_FOUND");
    return null;
  }

  const currentPersonId = current.person_id == null ? null : requiredPersonId(current.person_id);
  if (currentPersonId != null) {
    if (currentPersonId !== personId) throw new Error("REGISTRATION_QUEUE_PERSON_BINDING_CONFLICT");
    return Object.freeze({ candidate_id:candidateId, person_id:personId, replay:true });
  }

  const result = await client.query(
    `update atlas_v2.person_registration_candidates
        set person_id=$2::uuid,
            updated_at=now()
      where candidate_id=$1
        and person_id is null
      returning candidate_id,person_id::text`,
    [candidateId, personId]
  );
  if (result.rowCount !== 1) throw new Error("REGISTRATION_QUEUE_PERSON_BINDING_FAILED");
  return Object.freeze({ candidate_id:candidateId, person_id:personId, replay:false });
}

module.exports = Object.freeze({
  QUEUE_SCHEMA,
  QUEUE_TABLE,
  PENDING_SQL,
  SUMMARY_SQL,
  text,
  requiredCandidateId,
  requiredPersonId,
  readCurrentRegistrationQueue,
  loadRegistrationQueueCandidate,
  bindRegistrationQueueCandidate
});
