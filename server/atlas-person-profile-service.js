"use strict";

const crypto = require("node:crypto");
const { normalizeExact } = require("./atlas-identity-service.js");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROFILE_OPERATIONS = new Set(["set_person_korean_name", "set_person_external_reference"]);
const NAMUWIKI_HOST = "namu.wiki";

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

function safeDecode(value) {
  try { return decodeURIComponent(value); } catch { return value; }
}

function normalizeNamuWikiInput(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const status = normalizeExact(value.status).toLowerCase();
    if (status === "not_found") {
      const documentTitle = normalizeExact(value.document_title);
      const url = normalizeExact(value.url || value.canonical_url);
      if (documentTitle || url) throw new Error("PERSON_NAMUWIKI_NOT_FOUND_REFERENCE_MUST_BE_EMPTY");
      return Object.freeze({
        provider: "namuwiki",
        status: "not_found",
        document_title: null,
        url: null
      });
    }
    if (status && status !== "linked") throw new Error("PERSON_NAMUWIKI_STATUS_UNSUPPORTED");
    value = value.url || value.canonical_url || value.document_title;
  }

  const text = normalizeExact(value);
  if (!text) throw new Error("PERSON_NAMUWIKI_VALUE_REQUIRED");

  if (/^https?:\/\//i.test(text)) {
    let parsed;
    try { parsed = new URL(text); } catch { throw new Error("PERSON_NAMUWIKI_URL_INVALID"); }
    if (parsed.protocol !== "https:" || parsed.host !== NAMUWIKI_HOST || parsed.username || parsed.password) {
      throw new Error("PERSON_NAMUWIKI_URL_INVALID");
    }
    if (!parsed.pathname.startsWith("/w/") || parsed.pathname.length <= 3) throw new Error("PERSON_NAMUWIKI_URL_INVALID");
    const encodedTitle = parsed.pathname.slice(3);
    const documentTitle = normalizeExact(safeDecode(encodedTitle));
    if (!documentTitle) throw new Error("PERSON_NAMUWIKI_DOCUMENT_TITLE_REQUIRED");
    parsed.search = "";
    parsed.hash = "";
    return Object.freeze({
      provider: "namuwiki",
      status: "linked",
      document_title: documentTitle,
      url: parsed.href
    });
  }

  if (text.includes("://")) throw new Error("PERSON_NAMUWIKI_URL_INVALID");
  const documentTitle = text;
  return Object.freeze({
    provider: "namuwiki",
    status: "linked",
    document_title: documentTitle,
    url: `https://${NAMUWIKI_HOST}/w/${encodeURIComponent(documentTitle)}`
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

async function currentExternalReference(client, personId, provider, { forUpdate = false } = {}) {
  const result = await client.query(`
    select provider,status,checked_at::text,document_title,url,updated_at
      from atlas_v2.person_external_references
     where person_id=$1::uuid and provider=$2${forUpdate ? " for update" : ""}`, [personId, provider]);
  return result.rows[0] || null;
}

function sameReference(row, next) {
  return Boolean(row)
    && row.provider === next.provider
    && row.status === next.status
    && row.document_title === next.document_title
    && row.url === next.url;
}

function shouldBlockExternalReferenceOverwrite(current, next, { preventOverwrite = false } = {}) {
  return Boolean(preventOverwrite && current?.status === "linked" && !sameReference(current, next));
}

async function setExternalReference(client, personId, rawPayload) {
  const provider = normalizeExact(rawPayload?.provider || "namuwiki").toLowerCase();
  if (provider !== "namuwiki") throw new Error("PERSON_EXTERNAL_REFERENCE_PROVIDER_UNSUPPORTED");
  const next = normalizeNamuWikiInput(rawPayload?.value);
  const current = await currentExternalReference(client, personId, provider, { forUpdate: true });
  if (sameReference(current, next)) {
    return Object.freeze({ replay:true, before:{ external_reference:current }, after:{ external_reference:current } });
  }
  if (shouldBlockExternalReferenceOverwrite(current, next, { preventOverwrite:rawPayload?.prevent_overwrite === true })) {
    throw new Error("PERSON_EXTERNAL_REFERENCE_OVERWRITE_REVIEW_REQUIRED");
  }

  const saved = await client.query(`
    insert into atlas_v2.person_external_references(person_id,provider,status,checked_at,document_title,url,updated_at)
    values($1::uuid,$2,$3,current_date,$4,$5,now())
    on conflict (person_id,provider) do update
      set status=excluded.status,
          checked_at=excluded.checked_at,
          document_title=excluded.document_title,
          url=excluded.url,
          updated_at=now()
    returning provider,status,checked_at::text,document_title,url,updated_at`,
    [personId, next.provider, next.status, next.document_title, next.url]);

  return Object.freeze({
    replay:false,
    before:{ external_reference:current },
    after:{ external_reference:saved.rows[0] }
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
        : await setExternalReference(client, personId, request.payload);

      if (!change.replay) {
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
  createPersonProfileMutationService
});