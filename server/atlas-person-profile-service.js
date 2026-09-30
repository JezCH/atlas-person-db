"use strict";

const crypto = require("node:crypto");
const { normalizeExact } = require("./atlas-identity-service.js");
const {
  currentTimelineDisposition,
  setTimelineDisposition
} = require("./atlas-person-timeline-service.js");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROFILE_OPERATIONS = new Set(["set_person_korean_name", "set_person_external_reference", "set_person_timeline_disposition"]);
const { normalizeNamuWikiDecision, currentExternalReference, setNamuWikiDecision, sameDecision } = require("./atlas-external-reference-service.js");

function outcomeBase({ requestId, operation, committed, v2, verification = null, validationFailures = [], transactionFailure = null, rollback = false, replay = false }) {
  return Object.freeze({
    marker: "ATLAS_PERSON_PROFILE_MUTATION_V1",
    write_mode: "v2-only",
    request_id: requestId,
    operation,
    committed,
    replay,
    legacy: { attempted: false, committed: false, record_ids: [] },
    v2: v2 || { committed: false, normalized_relationship_ids: [] },
    verification,
    parity: null,
    rollback,
    validation_failures: validationFailures,
    transaction_failure: transactionFailure
  });
}

function blocked(requestId, operation, code, detail = null) {
  return outcomeBase({
    requestId,
    operation,
    committed: false,
    validationFailures: [{ code, ...(detail == null ? {} : { detail }) }]
  });
}

function normalizeNamuWikiInput(value) {
  const raw = value && typeof value === "object" && !Array.isArray(value)
    ? value
    : (String(value || "").trim().includes("://") ? { status:"linked", url:value } : { status:"linked", document_title:value });
  const normalized = normalizeNamuWikiDecision(raw, { allowTitleShorthand:true });
  return Object.freeze({
    provider:normalized.provider,
    status:normalized.status,
    document_title:normalized.document_title,
    url:normalized.url
  });
}

async function lockPerson(client, personId) {
  await client.query("select pg_advisory_xact_lock(hashtext($1))", [`atlas-person-profile:${personId}`]);
  const person = await client.query(`
    select id::text,canonical_key,person_type,historicity
      from atlas_v2.persons
     where id=$1::uuid
     for update`, [personId]);
  if (person.rowCount !== 1) throw new Error("PERSON_PROFILE_TARGET_NOT_FOUND");
  return person.rows[0];
}

async function currentPreferredKoreanName(client, personId, { forUpdate = false } = {}) {
  const result = await client.query(`
    select id::text,name,name_type,is_preferred
      from atlas_v2.person_names
     where person_id=$1::uuid and locale='ko' and is_preferred=true
     order by id
     limit 2${forUpdate ? " for update" : ""}`, [personId]);
  if (result.rows.length > 1) throw new Error("PERSON_KOREAN_PREFERRED_NAME_AMBIGUOUS");
  return result.rows[0] || null;
}

async function setKoreanName(client, personId, rawName) {
  const name = normalizeExact(rawName);
  if (!name) throw new Error("PERSON_KOREAN_NAME_REQUIRED");
  if (name.length > 160) throw new Error("PERSON_KOREAN_NAME_TOO_LONG");

  const current = await currentPreferredKoreanName(client, personId, { forUpdate: true });
  if (current?.name === name) {
    return Object.freeze({ replay: true, before: { preferred_name_ko:name }, after: { preferred_name_ko:name } });
  }

  const collision = await client.query(`
    select person_id::text
      from atlas_v2.person_names
     where locale='ko' and name=$2 and person_id<>$1::uuid
     group by person_id
     order by person_id
     limit 1`, [personId, name]);
  if (collision.rowCount) throw new Error("PERSON_DISPLAY_NAME_COLLISION_REVIEW_REQUIRED");

  const existing = await client.query(`
    select id::text,name_type,is_preferred
      from atlas_v2.person_names
     where person_id=$1::uuid and locale='ko' and name=$2
     order by is_preferred desc,id
     limit 1
     for update`, [personId, name]);

  if (current) {
    await client.query(`update atlas_v2.person_names set is_preferred=false where id=$1::uuid`, [current.id]);
  }

  if (existing.rowCount) {
    await client.query(`
      update atlas_v2.person_names
         set is_preferred=true,name_type='display'
       where id=$1::uuid`, [existing.rows[0].id]);
  } else {
    await client.query(`
      insert into atlas_v2.person_names(id,person_id,locale,name,name_type,is_preferred)
      values(gen_random_uuid(),$1::uuid,'ko',$2,'display',true)`, [personId, name]);
  }

  return Object.freeze({
    replay: false,
    before: { preferred_name_ko:current?.name || null },
    after: { preferred_name_ko:name }
  });
}

function shouldBlockExternalReferenceOverwrite(current, next, { preventOverwrite = false } = {}) {
  return Boolean(preventOverwrite && current?.status === "linked" && !sameDecision(current, next));
}

function externalReferenceExpectedCurrentMismatch(current, expected) {
  if (!expected) return false;
  return !sameDecision(current, normalizeNamuWikiInput(expected));
}

async function setExternalReference(client, personId, rawPayload) {
  const provider = normalizeExact(rawPayload?.provider || "namuwiki").toLowerCase();
  if (provider !== "namuwiki") throw new Error("PERSON_EXTERNAL_REFERENCE_PROVIDER_UNSUPPORTED");
  const result = await setNamuWikiDecision(client, personId, rawPayload?.value, {
    allowTitleShorthand:true,
    preventLinkedOverwrite:rawPayload?.prevent_overwrite === true,
    expectedCurrent:rawPayload?.expected_current_reference || null,
    refreshCheckedAtOnReplay:true
  });
  return Object.freeze({
    replay:result.replay,
    ...(result.replay ? { review_recorded:true } : {}),
    before:{ external_reference:result.before },
    after:{ external_reference:result.after }
  });
}

async function writeAudit(client, { requestId, personId, operation, before, after }) {
  await client.query(`
    insert into atlas_v2.person_profile_mutation_audits(request_id,person_id,operation,before_snapshot,after_snapshot)
    values($1,$2::uuid,$3,$4::jsonb,$5::jsonb)`,
    [requestId, personId, operation, JSON.stringify(before || {}), JSON.stringify(after || {})]);
}

async function verifyMutation(client, { personId, operation, expected }) {
  if (operation === "set_person_korean_name") {
    const row = await currentPreferredKoreanName(client, personId);
    return Object.freeze({ checked:true, match:row?.name === expected.preferred_name_ko, preferred_name_ko:row?.name || null });
  }
  if (operation === "set_person_timeline_disposition") {
    const row = await currentTimelineDisposition(client, personId);
    return Object.freeze({
      checked:true,
      match:Boolean(row && JSON.stringify(row) === JSON.stringify(expected.timeline_disposition)),
      timeline_disposition:row
    });
  }
  const row = await currentExternalReference(client, personId, "namuwiki");
  const wanted = expected.external_reference || null;
  return Object.freeze({
    checked:true,
    match:Boolean(row && wanted && row.status === wanted.status && row.document_title === wanted.document_title && row.url === wanted.url),
    external_reference:row
  });
}

function createPersonProfileMutationService({ client } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client with query() is required");

  async function mutate(request = {}) {
    const operation = String(request.operation || "").trim();
    const requestId = String(request.request_id || crypto.randomUUID());
    if (!PROFILE_OPERATIONS.has(operation)) return blocked(requestId, operation, "PERSON_PROFILE_OPERATION_REQUIRED");
    const personId = String(request.payload?.person_id || "").trim().toLowerCase();
    if (!UUID_RE.test(personId)) return blocked(requestId, operation, "PERSON_ID_REQUIRED");

    await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
    try {
      await lockPerson(client, personId);
      const change = operation === "set_person_korean_name"
        ? await setKoreanName(client, personId, request.payload?.name)
        : operation === "set_person_timeline_disposition"
          ? (() => setTimelineDisposition(client, personId, request.payload).then((result) => Object.freeze({
              replay:result.replay,
              before:{ timeline_disposition:result.before },
              after:{ timeline_disposition:result.after }
            })))()
          : await setExternalReference(client, personId, request.payload);

      if (!change.replay || change.review_recorded === true) {
        await writeAudit(client, { requestId, personId, operation, before:change.before, after:change.after });
      }

      const verification = await verifyMutation(client, { personId, operation, expected:change.after });
      if (!verification.match) throw new Error("PERSON_PROFILE_VERIFICATION_FAILED");
      await client.query("COMMIT");

      return outcomeBase({
        requestId,
        operation,
        committed:true,
        replay:change.replay,
        v2:{
          committed:true,
          normalized_relationship_ids:[],
          person_id:personId,
          ...(operation === "set_person_korean_name"
            ? { preferred_name_ko:verification.preferred_name_ko }
            : operation === "set_person_timeline_disposition"
              ? { timeline_disposition:verification.timeline_disposition }
              : { external_reference:verification.external_reference })
        },
        verification
      });
    } catch (error) {
      try { await client.query("ROLLBACK"); } catch {}
      const code = String(error?.message || error || "PERSON_PROFILE_MUTATION_FAILED");
      const validation = /REQUIRED|INVALID|UNSUPPORTED|COLLISION|AMBIGUOUS|NOT_FOUND|TOO_LONG|REVIEW_REQUIRED/.test(code)
        ? [{ code }]
        : [];
      return outcomeBase({
        requestId,
        operation,
        committed:false,
        rollback:true,
        validationFailures:validation,
        transactionFailure:validation.length ? null : code
      });
    }
  }

  return Object.freeze({ mutate });
}

module.exports = Object.freeze({
  PROFILE_OPERATIONS,
  normalizeNamuWikiInput,
  shouldBlockExternalReferenceOverwrite,
  externalReferenceExpectedCurrentMismatch,
  createPersonProfileMutationService
});