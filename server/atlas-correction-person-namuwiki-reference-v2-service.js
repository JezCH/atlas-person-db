"use strict";

const {
  normalizeNamuWikiDecision,
  currentExternalReference,
  setNamuWikiDecision
} = require("./atlas-external-reference-service.js");
const {
  manifestHash,
  correctionLedgerExists,
  readLedger
} = require("./atlas-correction-ledger-service.js");

const MANIFEST_V2 = "atlas-correction-manifest/v2";
const MARKER_V2 = "ATLAS_CORRECTION_MANIFEST_V2";
const OPERATION_TYPE = "set_person_namuwiki_reference";
const MAX_OPERATIONS = 50;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requiredText(value, code) {
  const text = String(value == null ? "" : value).trim();
  if (!text) throw new Error(code);
  return text;
}

function requireUuid(value, code) {
  const id = requiredText(value, code).toLowerCase();
  if (!UUID_RE.test(id)) throw new Error(code);
  return id;
}

function validIsoDate(value) {
  const text = String(value == null ? "" : value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const parsed = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === text;
}

function requireIsoDate(value, code) {
  const text = requiredText(value, code);
  if (!validIsoDate(text)) throw new Error(code);
  return text;
}

function requireOperation(raw, index) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("CORRECTION_PERSON_NAMUWIKI_REFERENCE_OPERATION_OBJECT_REQUIRED");
  }
  if (String(raw.type || "").trim() !== OPERATION_TYPE) {
    throw new Error("CORRECTION_PERSON_NAMUWIKI_REFERENCE_OPERATION_UNSUPPORTED");
  }
  const expectedReviewReason = requiredText(
    raw.expected_review_reason,
    `CORRECTION_PERSON_NAMUWIKI_REFERENCE_OP${index}_EXPECTED_REASON_REQUIRED`
  );
  if (expectedReviewReason !== "exact_target_url_pending") {
    throw new Error(`CORRECTION_PERSON_NAMUWIKI_REFERENCE_OP${index}_EXPECTED_REASON_INVALID`);
  }

  let replacement;
  try {
    replacement = normalizeNamuWikiDecision({
      status: "linked",
      checked_at: requireIsoDate(
        raw.replacement_checked_at,
        `CORRECTION_PERSON_NAMUWIKI_REFERENCE_OP${index}_REPLACEMENT_CHECKED_AT_INVALID`
      ),
      document_title: requiredText(
        raw.replacement_document_title,
        `CORRECTION_PERSON_NAMUWIKI_REFERENCE_OP${index}_REPLACEMENT_TITLE_REQUIRED`
      ),
      url: requiredText(
        raw.replacement_url,
        `CORRECTION_PERSON_NAMUWIKI_REFERENCE_OP${index}_REPLACEMENT_URL_REQUIRED`
      )
    }, { checkedAtRequired: true });
  } catch (error) {
    if (String(error?.message || "").startsWith("CORRECTION_PERSON_NAMUWIKI_REFERENCE_")) throw error;
    throw new Error(`CORRECTION_PERSON_NAMUWIKI_REFERENCE_OP${index}_REPLACEMENT_INVALID`);
  }

  return Object.freeze({
    type: OPERATION_TYPE,
    case_id: requiredText(raw.case_id, `CORRECTION_PERSON_NAMUWIKI_REFERENCE_OP${index}_CASE_ID_REQUIRED`),
    person_id: requireUuid(raw.person_id, `CORRECTION_PERSON_NAMUWIKI_REFERENCE_OP${index}_PERSON_ID_INVALID`),
    expected_checked_at: requireIsoDate(
      raw.expected_checked_at,
      `CORRECTION_PERSON_NAMUWIKI_REFERENCE_OP${index}_EXPECTED_CHECKED_AT_INVALID`
    ),
    expected_review_reason: expectedReviewReason,
    replacement_checked_at: replacement.checked_at,
    replacement_document_title: replacement.document_title,
    replacement_url: replacement.url
  });
}

function requireManifest(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("CORRECTION_MANIFEST_OBJECT_REQUIRED");
  }
  if (String(raw.schema || "").trim() !== MANIFEST_V2) {
    throw new Error("UNSUPPORTED_CORRECTION_MANIFEST_SCHEMA");
  }
  if (String(raw.review_status || "").trim().toLowerCase() !== "approved") {
    throw new Error("CORRECTION_MANIFEST_NOT_APPROVED");
  }
  const requestId = requiredText(raw.request_id, "CORRECTION_REQUEST_ID_REQUIRED");
  if (!Array.isArray(raw.operations) || raw.operations.length === 0 || raw.operations.length > MAX_OPERATIONS) {
    throw new Error("CORRECTION_PERSON_NAMUWIKI_REFERENCE_OPERATIONS_INVALID");
  }
  const operations = raw.operations.map((operation, index) => requireOperation(operation, index + 1));
  const personIds = new Set();
  for (const operation of operations) {
    if (personIds.has(operation.person_id)) {
      throw new Error("CORRECTION_PERSON_NAMUWIKI_REFERENCE_PERSON_REUSED");
    }
    personIds.add(operation.person_id);
  }
  return Object.freeze({ schema: MANIFEST_V2, requestId, operations });
}

function normalizeReference(row) {
  if (!row) return null;
  return Object.freeze({
    status: String(row.status),
    checked_at: row.checked_at == null ? null : String(row.checked_at),
    document_title: row.document_title == null ? null : String(row.document_title),
    url: row.url == null ? null : String(row.url),
    review_state: row.review_state == null ? null : String(row.review_state),
    review_reason: row.review_reason == null ? null : String(row.review_reason)
  });
}

async function loadReference(client, personId, { forUpdate = false } = {}) {
  return normalizeReference(await currentExternalReference(client, personId, "namuwiki", { forUpdate }));
}

async function assertPreflight(client, operation) {
  const current = await loadReference(client, operation.person_id, { forUpdate: true });
  if (!current) throw new Error(`CORRECTION_PERSON_NAMUWIKI_REFERENCE_NOT_FOUND:${operation.person_id}`);
  if (
    current.status !== "not_found" ||
    current.checked_at !== operation.expected_checked_at ||
    current.document_title !== null ||
    current.url !== null ||
    current.review_state !== "reviewed_absent" ||
    current.review_reason !== operation.expected_review_reason
  ) {
    throw new Error(`CORRECTION_PERSON_NAMUWIKI_REFERENCE_EXPECTED_DRIFT:${operation.person_id}`);
  }
  return current;
}

async function personCount(client) {
  const result = await client.query(`select count(*)::bigint as count from atlas_v2.persons`);
  return String(result.rows[0].count);
}

async function referenceCount(client) {
  const result = await client.query(`select count(*)::bigint as count from atlas_v2.person_external_references`);
  return String(result.rows[0].count);
}

async function activityFingerprint(client) {
  const result = await client.query(`
    select count(*)::int as row_count,
           md5(coalesce(string_agg(row_to_json(x)::text, '|' order by x.id::text), '')) as fingerprint
      from (
        select id,person_id,polity_id,relation_type_id,role_id,period_basis_id,
               activity_start,activity_end,confidence,chronology_status,legacy_source_key,notes,source_locator,content_hash
          from atlas_v2.person_politics_v2
      ) x
  `);
  return Object.freeze(result.rows[0]);
}

async function applyOperation(client, manifestRequestId, operation, before) {
  const result = await setNamuWikiDecision(client, operation.person_id, {
    status: "linked",
    checked_at: operation.replacement_checked_at,
    document_title: operation.replacement_document_title,
    url: operation.replacement_url
  }, {
    checkedAtRequired: true,
    expectedCurrent: before,
    preventLinkedOverwrite: true
  });

  const after = normalizeReference(result.after);
  if (
    !after ||
    after.status !== "linked" ||
    after.checked_at !== operation.replacement_checked_at ||
    after.document_title !== operation.replacement_document_title ||
    after.url !== operation.replacement_url ||
    after.review_state !== "reviewed" ||
    after.review_reason !== null
  ) {
    throw new Error(`CORRECTION_PERSON_NAMUWIKI_REFERENCE_WRITE_DRIFT:${operation.person_id}`);
  }

  await client.query(`
    insert into atlas_v2.person_profile_mutation_audits(request_id,person_id,operation,before_snapshot,after_snapshot)
    values($1,$2::uuid,'set_person_external_reference',$3::jsonb,$4::jsonb)
  `, [
    `${manifestRequestId}:${operation.case_id}`,
    operation.person_id,
    JSON.stringify({ external_reference: before }),
    JSON.stringify({ external_reference: after })
  ]);

  return Object.freeze({ replay: Boolean(result.replay), before, after });
}

async function verifyAppliedOperation(client, operation, { forUpdate = false } = {}) {
  const current = await loadReference(client, operation.person_id, { forUpdate });
  if (
    !current ||
    current.status !== "linked" ||
    current.checked_at !== operation.replacement_checked_at ||
    current.document_title !== operation.replacement_document_title ||
    current.url !== operation.replacement_url ||
    current.review_state !== "reviewed" ||
    current.review_reason !== null
  ) {
    throw new Error(`CORRECTION_PERSON_NAMUWIKI_REFERENCE_REPLAY_DRIFT:${operation.person_id}`);
  }
  return current;
}

function createCorrectionPersonNamuWikiReferenceV2Service({ client } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");

  async function execute(rawManifest, { dryRun = false } = {}) {
    const manifest = requireManifest(rawManifest);
    const hash = manifestHash(rawManifest);
    await client.query("begin isolation level serializable");
    try {
      await client.query("select pg_advisory_xact_lock(hashtext($1))", [`atlas-correction-manifest:${manifest.requestId}`]);
      const ledger = await readLedger(client, manifest.requestId);
      if (ledger) {
        if (ledger.manifest_hash !== hash) throw new Error("CORRECTION_REQUEST_ID_COLLISION");
        if (ledger.manifest_schema !== MANIFEST_V2) throw new Error("CORRECTION_LEDGER_SCHEMA_MISMATCH");
        for (const operation of manifest.operations) {
          await verifyAppliedOperation(client, operation, { forUpdate: true });
        }
        if (dryRun) await client.query("rollback"); else await client.query("commit");
        return Object.freeze({
          marker: MARKER_V2,
          request_id: manifest.requestId,
          dry_run: Boolean(dryRun),
          committed: !dryRun,
          replay: true,
          result: ledger.result_snapshot
        });
      }

      const beforePersons = await personCount(client);
      const beforeReferences = await referenceCount(client);
      const beforeActivities = await activityFingerprint(client);
      const outcomes = [];

      for (const operation of manifest.operations) {
        const before = await assertPreflight(client, operation);
        const written = await applyOperation(client, manifest.requestId, operation, before);
        const after = await verifyAppliedOperation(client, operation, { forUpdate: true });
        outcomes.push(Object.freeze({
          type: operation.type,
          case_id: operation.case_id,
          person_id: operation.person_id,
          checked_at_before: before.checked_at,
          checked_at_after: after.checked_at,
          review_reason_before: before.review_reason,
          document_title_after: after.document_title,
          url_after: after.url,
          replay: written.replay
        }));
      }

      const afterPersons = await personCount(client);
      const afterReferences = await referenceCount(client);
      const afterActivities = await activityFingerprint(client);
      if (afterPersons !== beforePersons) {
        throw new Error("CORRECTION_PERSON_NAMUWIKI_REFERENCE_PERSON_COUNT_DRIFT");
      }
      if (afterReferences !== beforeReferences) {
        throw new Error("CORRECTION_PERSON_NAMUWIKI_REFERENCE_REFERENCE_COUNT_DRIFT");
      }
      if (
        afterActivities.row_count !== beforeActivities.row_count ||
        afterActivities.fingerprint !== beforeActivities.fingerprint
      ) {
        throw new Error("CORRECTION_PERSON_NAMUWIKI_REFERENCE_ACTIVITY_MUTATION_DETECTED");
      }

      const snapshot = Object.freeze({
        version: 1,
        schema: MANIFEST_V2,
        marker: MARKER_V2,
        correction_family: "person_namuwiki_reference",
        invariant: "Only an existing Person's NamuWiki external-reference decision and its canonical profile mutation audit may change; Person identity, Person count, external-reference count, and Activity rows remain unchanged.",
        operations: outcomes,
        person_count_before: beforePersons,
        person_count_after: afterPersons,
        reference_count_before: beforeReferences,
        reference_count_after: afterReferences,
        activity_fingerprint_before: beforeActivities,
        activity_fingerprint_after: afterActivities
      });

      if (dryRun) {
        await client.query("rollback");
        return Object.freeze({
          marker: MARKER_V2,
          request_id: manifest.requestId,
          dry_run: true,
          committed: false,
          replay: false,
          result: snapshot
        });
      }

      if (!await correctionLedgerExists(client)) throw new Error("CORRECTION_LEDGER_SCHEMA_REQUIRED");
      await client.query(`
        insert into atlas_v2.correction_manifest_runs(request_id,manifest_hash,manifest_schema,result_snapshot)
        values($1,$2,$3,$4::jsonb)
      `, [manifest.requestId, hash, MANIFEST_V2, JSON.stringify(snapshot)]);
      await client.query("commit");
      return Object.freeze({
        marker: MARKER_V2,
        request_id: manifest.requestId,
        dry_run: false,
        committed: true,
        replay: false,
        result: snapshot
      });
    } catch (error) {
      try { await client.query("rollback"); } catch {}
      throw error;
    }
  }

  return Object.freeze({ execute });
}

module.exports = Object.freeze({
  OPERATION_TYPE,
  MAX_OPERATIONS,
  requireOperation,
  requireManifest,
  loadReference,
  assertPreflight,
  personCount,
  referenceCount,
  activityFingerprint,
  applyOperation,
  verifyAppliedOperation,
  createCorrectionPersonNamuWikiReferenceV2Service
});
