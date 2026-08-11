"use strict";

const crypto = require("node:crypto");
const {
  createPerson,
  createPolity,
  createRole,
  normalizeExact
} = require("./atlas-identity-service.js");
const {
  createV2AuthoritativeTx,
  comparablePayload
} = require("./atlas-postgres-v2-authoritative-transaction.js");

const MANIFEST_V1 = "atlas-authoring-manifest/v1";
const MANIFEST_V2 = "atlas-authoring-manifest/v2";
const SUPPORTED_SCHEMAS = new Set([MANIFEST_V1, MANIFEST_V2]);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function manifestHash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function optionalObject(value, code) {
  if (value == null) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(code);
  return value;
}

function validateDeclaredIdentityReferences({ schema, activity, polityIdentity, roleIdentity }) {
  if (schema === MANIFEST_V1 && (polityIdentity || roleIdentity)) {
    throw new Error("AUTHORING_MANIFEST_V2_REQUIRED_FOR_IDENTITY_DECLARATIONS");
  }

  if (polityIdentity) {
    const activityPolity = normalizeExact(activity?.politic_name);
    const declaredPolity = normalizeExact(polityIdentity?.canonical_name_en);
    if (!activityPolity || !declaredPolity || activityPolity !== declaredPolity) {
      throw new Error("AUTHORING_POLITY_ACTIVITY_REFERENCE_MISMATCH");
    }
  }

  if (roleIdentity) {
    const activityRole = normalizeExact(activity?.role);
    if (!activityRole) throw new Error("AUTHORING_ROLE_ACTIVITY_REFERENCE_REQUIRED");
    const declaredTokens = [
      roleIdentity?.code,
      roleIdentity?.source_label,
      roleIdentity?.display_name_ko
    ].map(normalizeExact).filter(Boolean);
    if (!declaredTokens.includes(activityRole)) {
      throw new Error("AUTHORING_ROLE_ACTIVITY_REFERENCE_MISMATCH");
    }
  }
}

function requireManifest(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("AUTHORING_MANIFEST_OBJECT_REQUIRED");
  }
  const schema = normalizeExact(raw.schema);
  if (!SUPPORTED_SCHEMAS.has(schema)) throw new Error("UNSUPPORTED_AUTHORING_MANIFEST_SCHEMA");
  if (normalizeExact(raw.review_status).toLowerCase() !== "approved") {
    throw new Error("AUTHORING_MANIFEST_NOT_APPROVED");
  }
  const requestId = normalizeExact(raw.request_id);
  if (!requestId) throw new Error("AUTHORING_REQUEST_ID_REQUIRED");
  if (!raw.person || typeof raw.person !== "object" || Array.isArray(raw.person)) {
    throw new Error("AUTHORING_PERSON_REQUIRED");
  }
  if (!raw.activity || typeof raw.activity !== "object" || Array.isArray(raw.activity)) {
    throw new Error("AUTHORING_ACTIVITY_REQUIRED");
  }

  const polityIdentity = optionalObject(raw.polity_identity, "AUTHORING_POLITY_IDENTITY_OBJECT_REQUIRED");
  const roleIdentity = optionalObject(raw.role_identity, "AUTHORING_ROLE_IDENTITY_OBJECT_REQUIRED");
  validateDeclaredIdentityReferences({
    schema,
    activity: raw.activity,
    polityIdentity,
    roleIdentity
  });

  return {
    schema,
    requestId,
    person: raw.person,
    polityIdentity,
    roleIdentity,
    activity: raw.activity
  };
}

function markerForSchema(schema) {
  return schema === MANIFEST_V2 ? "ATLAS_AUTHORING_MANIFEST_V2" : "ATLAS_AUTHORING_MANIFEST_V1";
}

async function readLedger(client, requestId) {
  const result = await client.query(
    `select request_id,manifest_hash,person_id,relationship_id,applied_at
       from atlas_v2.authoring_manifest_runs
      where request_id=$1
      for update`,
    [requestId]
  );
  return result.rows[0] || null;
}

function activityFromManifest(personName, raw) {
  return comparablePayload({
    person_name: personName,
    politic_name: raw?.politic_name,
    activity_start: raw?.activity_start,
    activity_end: raw?.activity_end,
    role: raw?.role,
    period_basis: raw?.period_basis,
    notes: raw?.notes
  });
}

function createAuthoringManifestService({ client } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");

  return Object.freeze({
    async apply(rawManifest) {
      const {
        schema,
        requestId,
        person,
        polityIdentity,
        roleIdentity,
        activity
      } = requireManifest(rawManifest);
      const hash = manifestHash(rawManifest);
      const marker = markerForSchema(schema);

      await client.query("begin isolation level serializable");
      try {
        await client.query("select pg_advisory_xact_lock(hashtext($1))", [`atlas-authoring-manifest:${requestId}`]);
        const replay = await readLedger(client, requestId);
        if (replay) {
          if (replay.manifest_hash !== hash) throw new Error("AUTHORING_REQUEST_ID_COLLISION");
          await client.query("commit");
          return Object.freeze({
            marker,
            request_id: requestId,
            committed: true,
            replay: true,
            person_id: replay.person_id,
            relationship_id: replay.relationship_id
          });
        }

        const personResult = await createPerson(client, person);
        const polityResult = polityIdentity ? await createPolity(client, polityIdentity) : null;
        const roleResult = roleIdentity ? await createRole(client, roleIdentity) : null;

        const activityPayload = activityFromManifest(person.canonical_name_en, activity);
        const created = await createV2AuthoritativeTx(client).executeV2Authoritative({
          operation: "create",
          payload: activityPayload,
          request_id: `authoring:${requestId}`
        });
        const relationshipId = created.normalized_relationship_ids?.[0] || null;
        if (!relationshipId) throw new Error("AUTHORING_ACTIVITY_CREATE_FAILED");

        await client.query(
          `insert into atlas_v2.authoring_manifest_runs(request_id,manifest_hash,person_id,relationship_id)
           values($1,$2,$3,$4)`,
          [requestId, hash, personResult.id, relationshipId]
        );
        await client.query("commit");

        return Object.freeze({
          marker,
          request_id: requestId,
          committed: true,
          replay: false,
          person_id: personResult.id,
          relationship_id: relationshipId,
          ...(polityResult ? { polity_id: polityResult.id } : {}),
          ...(roleResult ? { role_id: roleResult.id } : {})
        });
      } catch (error) {
        try { await client.query("rollback"); } catch {}
        throw error;
      }
    }
  });
}

module.exports = Object.freeze({
  MANIFEST_V1,
  MANIFEST_V2,
  SUPPORTED_SCHEMAS,
  createAuthoringManifestService,
  manifestHash,
  requireManifest,
  markerForSchema,
  validateDeclaredIdentityReferences,
  activityFromManifest,
  readLedger
});
