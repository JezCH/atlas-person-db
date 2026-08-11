"use strict";

const crypto = require("node:crypto");
const { createPerson, normalizeExact } = require("./atlas-identity-service.js");
const { createV2AuthoritativeTx, comparablePayload } = require("./atlas-postgres-v2-authoritative-transaction.js");

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}

function manifestHash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function requireManifest(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("AUTHORING_MANIFEST_OBJECT_REQUIRED");
  if (raw.schema !== "atlas-authoring-manifest/v1") throw new Error("UNSUPPORTED_AUTHORING_MANIFEST_SCHEMA");
  const requestId = normalizeExact(raw.request_id);
  if (!requestId) throw new Error("AUTHORING_REQUEST_ID_REQUIRED");
  if (!raw.person || typeof raw.person !== "object" || Array.isArray(raw.person)) throw new Error("AUTHORING_PERSON_REQUIRED");
  if (!raw.activity || typeof raw.activity !== "object" || Array.isArray(raw.activity)) throw new Error("AUTHORING_ACTIVITY_REQUIRED");
  return { requestId, person: raw.person, activity: raw.activity };
}

async function readLedger(client, requestId) {
  const result = await client.query(`select request_id,manifest_hash,person_id,relationship_id,applied_at from atlas_v2.authoring_manifest_runs where request_id=$1 for update`, [requestId]);
  return result.rows[0] || null;
}

function activityFromManifest(personName, raw) {
  return comparablePayload({ person_name: personName, politic_name: raw?.politic_name, activity_start: raw?.activity_start, activity_end: raw?.activity_end, role: raw?.role, period_basis: raw?.period_basis, notes: raw?.notes });
}

function createAuthoringManifestService({ client } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  return Object.freeze({
    async apply(rawManifest) {
      const { requestId, person, activity } = requireManifest(rawManifest);
      const hash = manifestHash(rawManifest);
      await client.query("begin isolation level serializable");
      try {
        await client.query("select pg_advisory_xact_lock(hashtext($1))", [`atlas-authoring-manifest:${requestId}`]);
        const replay = await readLedger(client, requestId);
        if (replay) {
          if (replay.manifest_hash !== hash) throw new Error("AUTHORING_REQUEST_ID_COLLISION");
          await client.query("commit");
          return Object.freeze({ marker: "ATLAS_AUTHORING_MANIFEST_V1", request_id: requestId, committed: true, replay: true, person_id: replay.person_id, relationship_id: replay.relationship_id });
        }
        const identity = await createPerson(client, person);
        const activityPayload = activityFromManifest(person.canonical_name_en, activity);
        const created = await createV2AuthoritativeTx(client).executeV2Authoritative({ operation: "create", payload: activityPayload, request_id: `authoring:${requestId}` });
        const relationshipId = created.normalized_relationship_ids?.[0] || null;
        if (!relationshipId) throw new Error("AUTHORING_ACTIVITY_CREATE_FAILED");
        await client.query(`insert into atlas_v2.authoring_manifest_runs(request_id,manifest_hash,person_id,relationship_id) values($1,$2,$3,$4)`, [requestId, hash, identity.id, relationshipId]);
        await client.query("commit");
        return Object.freeze({ marker: "ATLAS_AUTHORING_MANIFEST_V1", request_id: requestId, committed: true, replay: false, person_id: identity.id, relationship_id: relationshipId });
      } catch (error) {
        try { await client.query("rollback"); } catch {}
        throw error;
      }
    }
  });
}

module.exports = Object.freeze({ createAuthoringManifestService, manifestHash, requireManifest, activityFromManifest, readLedger });
