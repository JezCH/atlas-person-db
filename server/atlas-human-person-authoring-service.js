"use strict";

const { createPerson, normalizeExact } = require("./atlas-identity-service.js");
const { resolveOrCreateSources } = require("./atlas-human-authoring-service.js");
const { requiredUuid } = require("./atlas-activity-semantic-key-v2.js");
const { manifestHash, readLedger } = require("./atlas-authoring-manifest-service.js");

const HUMAN_PERSON_AUTHORING_SCHEMA = "atlas-human-person-authoring/v1";
const HUMAN_PERSON_AUTHORING_MARKER = "ATLAS_HUMAN_PERSON_AUTHORING_V1";
const PERSON_ONLY_SEMANTIC_VERSION = "v1-person-identity-only";

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

function normalizeSources(raw) {
  if (!Array.isArray(raw) || raw.length === 0) throw new Error("HUMAN_PERSON_AUTHORING_SOURCE_REQUIRED");
  return raw.map((item, index) => {
    const source = requiredObject(item, `HUMAN_PERSON_AUTHORING_SOURCE_INVALID:${index + 1}`);
    if (source.source_id != null) {
      return Object.freeze({
        mode: "existing",
        source_id: requiredUuid(source.source_id, `sources[${index}].source_id`),
        locator: requiredText(source.locator, `HUMAN_PERSON_AUTHORING_SOURCE_LOCATOR_REQUIRED:${index + 1}`)
      });
    }
    const title = requiredText(source.title, `HUMAN_PERSON_AUTHORING_SOURCE_TITLE_REQUIRED:${index + 1}`);
    const canonicalUrl = optionalText(source.canonical_url);
    const citationText = optionalText(source.citation_text) || title;
    const sourceType = optionalText(source.source_type) || (canonicalUrl ? "web_bibliographic_reference" : "bibliographic_reference");
    const locator = optionalText(source.locator) || canonicalUrl || citationText;
    return Object.freeze({
      mode: "create",
      title,
      canonical_url: canonicalUrl,
      citation_text: citationText,
      source_type: sourceType,
      locator
    });
  });
}

function normalizePersonOnlyRequest(raw) {
  const request = requiredObject(raw, "HUMAN_PERSON_AUTHORING_REQUEST_OBJECT_REQUIRED");
  if (request.schema !== HUMAN_PERSON_AUTHORING_SCHEMA) throw new Error("HUMAN_PERSON_AUTHORING_SCHEMA_REQUIRED");
  if (normalizeExact(request.review_status).toLowerCase() !== "approved") throw new Error("HUMAN_PERSON_AUTHORING_NOT_APPROVED");
  const requestId = requiredText(request.request_id, "HUMAN_PERSON_AUTHORING_REQUEST_ID_REQUIRED");
  const person = requiredObject(request.person, "HUMAN_PERSON_AUTHORING_PERSON_REQUIRED");
  return Object.freeze({
    requestId,
    person: Object.freeze({
      canonical_name_en: requiredText(person.canonical_name_en, "HUMAN_PERSON_AUTHORING_PERSON_EN_REQUIRED"),
      display_name_ko: requiredText(person.display_name_ko, "HUMAN_PERSON_AUTHORING_PERSON_KO_REQUIRED"),
      canonical_key: optionalText(person.canonical_key),
      person_type: requiredText(person.person_type, "HUMAN_PERSON_AUTHORING_PERSON_TYPE_REQUIRED"),
      historicity: requiredText(person.historicity, "HUMAN_PERSON_AUTHORING_HISTORICITY_REQUIRED")
    }),
    sources: Object.freeze(normalizeSources(request.sources))
  });
}

function normalizeId(value, field) {
  return requiredUuid(value, field).toLowerCase();
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
  const expected = [...new Set(sources.map((source) => normalizeId(source.id, "source.id")))].sort();
  const result = await client.query(
    `select source_id::text
       from atlas_v2.person_sources
      where person_id=$1::uuid
        and source_id=any($2::uuid[])
      order by source_id::text`,
    [personId, expected]
  );
  const actual = (result.rows || []).map((row) => String(row.source_id).toLowerCase()).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error("HUMAN_PERSON_AUTHORING_SOURCE_BINDING_MISMATCH");
}

function snapshotFor({ person, sources, transport }) {
  return Object.freeze({
    version: 1,
    schema: HUMAN_PERSON_AUTHORING_SCHEMA,
    semantic_version: PERSON_ONLY_SEMANTIC_VERSION,
    transport: transport || null,
    entities: Object.freeze({
      person,
      sources: Object.freeze(sources.map((source) => Object.freeze({
        id: source.id,
        disposition: source.disposition,
        locator: source.locator
      })))
    })
  });
}

async function verifyReplay(client, ledger, request) {
  const snapshot = ledger?.result_snapshot;
  if (snapshot?.schema !== HUMAN_PERSON_AUTHORING_SCHEMA || Number(snapshot?.version) !== 1 || snapshot?.semantic_version !== PERSON_ONLY_SEMANTIC_VERSION) {
    throw new Error("HUMAN_PERSON_AUTHORING_LEDGER_SNAPSHOT_INVALID");
  }
  const personId = normalizeId(snapshot?.entities?.person?.id, "ledger.person.id");
  if (String(ledger.person_id || "").toLowerCase() !== personId || ledger.relationship_id != null) {
    throw new Error("HUMAN_PERSON_AUTHORING_REPLAY_LEDGER_DRIFT");
  }
  const personResult = await client.query(`
    select p.id::text,p.person_type,p.historicity,
           en.name as canonical_name_en,ko.name as display_name_ko
      from atlas_v2.persons p
      left join atlas_v2.person_names en on en.person_id=p.id and en.locale='en' and en.is_preferred=true
      left join atlas_v2.person_names ko on ko.person_id=p.id and ko.locale='ko' and ko.is_preferred=true
     where p.id=$1::uuid
     limit 1`, [personId]);
  const row = personResult.rows?.[0];
  if (!row
    || normalizeExact(row.person_type) !== request.person.person_type
    || normalizeExact(row.historicity) !== request.person.historicity
    || normalizeExact(row.canonical_name_en) !== request.person.canonical_name_en
    || normalizeExact(row.display_name_ko) !== request.person.display_name_ko) {
    throw new Error("HUMAN_PERSON_AUTHORING_REPLAY_PERSON_DRIFT");
  }
  const sources = Array.isArray(snapshot?.entities?.sources) ? snapshot.entities.sources : [];
  if (!sources.length) throw new Error("HUMAN_PERSON_AUTHORING_REPLAY_SOURCE_SNAPSHOT_INVALID");
  await linkPersonSources(client, personId, sources);
  return snapshot;
}

function outcome(requestId, replay, snapshot) {
  return Object.freeze({
    marker: HUMAN_PERSON_AUTHORING_MARKER,
    schema: HUMAN_PERSON_AUTHORING_SCHEMA,
    request_id: requestId,
    committed: true,
    replay,
    person_id: snapshot.entities.person.id,
    source_ids: snapshot.entities.sources.map((source) => source.id),
    result: snapshot
  });
}

function createHumanPersonAuthoringService({ client } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  return Object.freeze({
    async apply(rawRequest, { transport = null } = {}) {
      const request = normalizePersonOnlyRequest(rawRequest);
      const hash = manifestHash(rawRequest);
      await client.query("begin isolation level serializable");
      try {
        await client.query("select pg_advisory_xact_lock(hashtext($1))", [`atlas-human-person-authoring:${request.requestId}`]);
        const ledger = await readLedger(client, request.requestId);
        if (ledger) {
          if (ledger.manifest_hash !== hash) throw new Error("AUTHORING_REQUEST_ID_COLLISION");
          if (ledger.manifest_schema !== HUMAN_PERSON_AUTHORING_SCHEMA) throw new Error("AUTHORING_LEDGER_SCHEMA_MISMATCH");
          const snapshot = await verifyReplay(client, ledger, request);
          await client.query("commit");
          return outcome(request.requestId, true, snapshot);
        }

        const created = await createPerson(client, {
          ...request.person,
          allow_display_name_collision: false
        });
        const person = Object.freeze({
          id: String(created.id).toLowerCase(),
          disposition: created.replay ? "reused" : "created"
        });
        const sources = await resolveOrCreateSources(client, request.requestId, request.sources);
        await linkPersonSources(client, person.id, sources);
        const snapshot = snapshotFor({ person, sources, transport });
        await client.query(
          `insert into atlas_v2.authoring_manifest_runs(request_id,manifest_hash,manifest_schema,person_id,relationship_id,result_snapshot)
           values($1,$2,$3,$4::uuid,null,$5::jsonb)`,
          [request.requestId, hash, HUMAN_PERSON_AUTHORING_SCHEMA, person.id, JSON.stringify(snapshot)]
        );
        await client.query("commit");
        return outcome(request.requestId, false, snapshot);
      } catch (error) {
        try { await client.query("rollback"); } catch {}
        throw error;
      }
    }
  });
}

module.exports = Object.freeze({
  HUMAN_PERSON_AUTHORING_SCHEMA,
  HUMAN_PERSON_AUTHORING_MARKER,
  PERSON_ONLY_SEMANTIC_VERSION,
  normalizePersonOnlyRequest,
  linkPersonSources,
  createHumanPersonAuthoringService
});
