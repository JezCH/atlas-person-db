"use strict";

const {
  DOMAIN_DEFINITIONS,
  normalizeDomain,
  setRepresentativeDomainTx
} = require("./atlas-person-domain-service.js");
const {
  manifestHash,
  correctionLedgerExists,
  readLedger
} = require("./atlas-correction-ledger-service.js");

const MANIFEST_V2 = "atlas-correction-manifest/v2";
const MARKER_V2 = "ATLAS_CORRECTION_MANIFEST_V2";
const OPERATION_TYPE = "set_person_representative_domain";
const MAX_OPERATIONS = 50;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DOMAIN_CODES = Object.freeze(DOMAIN_DEFINITIONS.map((row) => row.code));

function requireNonEmpty(value, code) {
  const text = String(value == null ? "" : value).trim();
  if (!text) throw new Error(code);
  return text;
}

function requireUuid(value, code) {
  const id = requireNonEmpty(value, code).toLowerCase();
  if (!UUID_RE.test(id)) throw new Error(code);
  return id;
}

function requireDomain(value, code) {
  const domain = normalizeDomain(requireNonEmpty(value, code));
  if (!domain) throw new Error(code);
  return domain;
}

function requireOperation(raw, index) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("CORRECTION_PERSON_DOMAIN_OPERATION_OBJECT_REQUIRED");
  }
  if (String(raw.type || "").trim() !== OPERATION_TYPE) {
    throw new Error("CORRECTION_PERSON_DOMAIN_OPERATION_UNSUPPORTED");
  }
  const caseId = requireNonEmpty(raw.case_id, `CORRECTION_PERSON_DOMAIN_OP${index}_CASE_ID_REQUIRED`);
  const personId = requireUuid(raw.person_id, `CORRECTION_PERSON_DOMAIN_OP${index}_PERSON_ID_INVALID`);
  const expectedDomain = requireDomain(raw.expected_domain, `CORRECTION_PERSON_DOMAIN_OP${index}_EXPECTED_DOMAIN_INVALID`);
  const replacementDomain = requireDomain(raw.replacement_domain, `CORRECTION_PERSON_DOMAIN_OP${index}_REPLACEMENT_DOMAIN_INVALID`);
  if (expectedDomain === replacementDomain) {
    throw new Error(`CORRECTION_PERSON_DOMAIN_OP${index}_NO_CHANGE`);
  }
  return Object.freeze({
    type: OPERATION_TYPE,
    case_id: caseId,
    person_id: personId,
    expected_domain: expectedDomain,
    replacement_domain: replacementDomain
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
  const requestId = requireNonEmpty(raw.request_id, "CORRECTION_REQUEST_ID_REQUIRED");
  if (!Array.isArray(raw.operations) || raw.operations.length === 0 || raw.operations.length > MAX_OPERATIONS) {
    throw new Error("CORRECTION_PERSON_DOMAIN_OPERATIONS_INVALID");
  }
  const operations = raw.operations.map((operation, index) => requireOperation(operation, index + 1));
  const personIds = new Set();
  for (const operation of operations) {
    if (personIds.has(operation.person_id)) throw new Error("CORRECTION_PERSON_DOMAIN_PERSON_REUSED");
    personIds.add(operation.person_id);
  }
  return Object.freeze({ schema: MANIFEST_V2, requestId, operations });
}

function normalizePerson(row) {
  if (!row) return null;
  return Object.freeze({
    id: String(row.id).toLowerCase(),
    representative_domain: row.representative_domain == null ? null : String(row.representative_domain)
  });
}

async function loadPerson(client, personId, { forUpdate = false } = {}) {
  const result = await client.query(
    `select id::text,representative_domain
       from atlas_v2.persons
      where id=$1::uuid${forUpdate ? " for update" : ""}`,
    [personId]
  );
  if (result.rowCount > 1) throw new Error(`CORRECTION_PERSON_DOMAIN_PERSON_ID_NONUNIQUE:${personId}`);
  return normalizePerson(result.rows[0]);
}

async function personCount(client) {
  const result = await client.query(`select count(*)::bigint as count from atlas_v2.persons`);
  return String(result.rows[0].count);
}

async function activityFingerprint(client) {
  const result = await client.query(`
    select count(*)::int as row_count,
           md5(coalesce(string_agg(row_to_json(x)::text, '|' order by x.id::text), '')) as fingerprint
      from (
        select id,person_id,polity_id,role_id,period_basis_id,activity_start,activity_end,
               confidence,chronology_status,legacy_source_key,notes,source_locator,content_hash
          from atlas_v2.person_politics_v2
      ) x
  `);
  return Object.freeze(result.rows[0]);
}

async function domainCounts(client) {
  const result = await client.query(`
    select representative_domain,count(*)::int as count
      from atlas_v2.persons
     group by representative_domain
  `);
  const counts = Object.fromEntries(DOMAIN_CODES.map((code) => [code, 0]));
  counts.unclassified = 0;
  for (const row of result.rows) {
    if (row.representative_domain == null) {
      counts.unclassified = Number(row.count);
      continue;
    }
    const domain = String(row.representative_domain);
    if (!Object.prototype.hasOwnProperty.call(counts, domain)) {
      throw new Error(`CORRECTION_PERSON_DOMAIN_NONCANONICAL_STORED_VALUE:${domain}`);
    }
    counts[domain] = Number(row.count);
  }
  return Object.freeze(counts);
}

function expectedDomainCounts(before, operations) {
  const expected = { ...before };
  for (const operation of operations) {
    expected[operation.expected_domain] -= 1;
    expected[operation.replacement_domain] += 1;
  }
  return Object.freeze(expected);
}

function assertDomainCounts(actual, expected) {
  for (const key of [...DOMAIN_CODES, "unclassified"]) {
    if (Number(actual[key]) !== Number(expected[key])) {
      throw new Error(`CORRECTION_PERSON_DOMAIN_COUNT_DRIFT:${key}`);
    }
  }
}

async function assertPreflight(client, operation) {
  const person = await loadPerson(client, operation.person_id, { forUpdate: true });
  if (!person) throw new Error(`CORRECTION_PERSON_DOMAIN_PERSON_NOT_FOUND:${operation.person_id}`);
  if (person.representative_domain !== operation.expected_domain) {
    throw new Error(`CORRECTION_PERSON_DOMAIN_EXPECTED_DRIFT:${operation.person_id}`);
  }
  return person;
}

async function applyOperation(client, manifestRequestId, operation) {
  return setRepresentativeDomainTx(client, {
    person_id: operation.person_id,
    representative_domain: operation.replacement_domain,
    request_id: `${manifestRequestId}:${operation.case_id}`
  });
}

async function verifyAppliedOperation(client, operation, { forUpdate = false } = {}) {
  const person = await loadPerson(client, operation.person_id, { forUpdate });
  if (!person) throw new Error(`CORRECTION_PERSON_DOMAIN_REPLAY_PERSON_MISSING:${operation.person_id}`);
  if (person.representative_domain !== operation.replacement_domain) {
    throw new Error(`CORRECTION_PERSON_DOMAIN_REPLAY_DRIFT:${operation.person_id}`);
  }
  return person;
}

function createCorrectionPersonDomainV2Service({ client } = {}) {
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

      const beforePersonCount = await personCount(client);
      const beforeActivities = await activityFingerprint(client);
      const beforeCounts = await domainCounts(client);
      const expectedCounts = expectedDomainCounts(beforeCounts, manifest.operations);
      const outcomes = [];

      for (const operation of manifest.operations) {
        const before = await assertPreflight(client, operation);
        const result = await applyOperation(client, manifest.requestId, operation);
        const after = await verifyAppliedOperation(client, operation, { forUpdate: true });
        outcomes.push(Object.freeze({
          type: operation.type,
          case_id: operation.case_id,
          person_id: operation.person_id,
          representative_domain_before: before.representative_domain,
          representative_domain_after: after.representative_domain,
          replay: Boolean(result.replay)
        }));
      }

      const afterPersonCount = await personCount(client);
      const afterActivities = await activityFingerprint(client);
      const afterCounts = await domainCounts(client);
      if (afterPersonCount !== beforePersonCount) throw new Error("CORRECTION_PERSON_DOMAIN_PERSON_COUNT_DRIFT");
      if (afterActivities.row_count !== beforeActivities.row_count || afterActivities.fingerprint !== beforeActivities.fingerprint) {
        throw new Error("CORRECTION_PERSON_DOMAIN_ACTIVITY_MUTATION_DETECTED");
      }
      assertDomainCounts(afterCounts, expectedCounts);

      const snapshot = Object.freeze({
        version: 1,
        schema: MANIFEST_V2,
        marker: MARKER_V2,
        correction_family: "person_representative_domain",
        invariant: "Only atlas_v2.persons.representative_domain and its canonical profile mutation audit may change; Person identity and Activity rows remain unchanged.",
        operations: outcomes,
        person_count_before: beforePersonCount,
        person_count_after: afterPersonCount,
        domain_counts_before: beforeCounts,
        domain_counts_after: afterCounts,
        activity_fingerprint_before: beforeActivities,
        activity_fingerprint_after: afterActivities
      });

      if (dryRun) {
        await client.query("rollback");
        return Object.freeze({ marker: MARKER_V2, request_id: manifest.requestId, dry_run: true, committed: false, replay: false, result: snapshot });
      }
      if (!await correctionLedgerExists(client)) throw new Error("CORRECTION_LEDGER_SCHEMA_REQUIRED");
      await client.query(
        `insert into atlas_v2.correction_manifest_runs(request_id,manifest_hash,manifest_schema,result_snapshot)
         values($1,$2,$3,$4::jsonb)`,
        [manifest.requestId, hash, MANIFEST_V2, JSON.stringify(snapshot)]
      );
      await client.query("commit");
      return Object.freeze({ marker: MARKER_V2, request_id: manifest.requestId, dry_run: false, committed: true, replay: false, result: snapshot });
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
  loadPerson,
  personCount,
  activityFingerprint,
  domainCounts,
  expectedDomainCounts,
  assertPreflight,
  applyOperation,
  verifyAppliedOperation,
  createCorrectionPersonDomainV2Service
});
