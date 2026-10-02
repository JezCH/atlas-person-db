"use strict";

const crypto = require("node:crypto");
const { normalizeExact } = require("./atlas-identity-service.js");

const MANIFEST_V1 = "atlas-authoring-manifest/v1";
const MANIFEST_V2 = "atlas-authoring-manifest/v2";
const SUPPORTED_SCHEMAS = new Set([MANIFEST_V1, MANIFEST_V2]);
const RESULT_SNAPSHOT_VERSION = 1;

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
    `select request_id,manifest_hash,manifest_schema,person_id,relationship_id,result_snapshot,applied_at
       from atlas_v2.authoring_manifest_runs
      where request_id=$1
      for update`,
    [requestId]
  );
  return result.rows[0] || null;
}

async function loadRelationshipIdentity(client, relationshipId) {
  const result = await client.query(
    `select id,person_id,polity_id,role_id,period_basis_id
       from atlas_v2.person_politics_v2
      where id=$1
      for update`,
    [relationshipId]
  );
  if (result.rows.length !== 1) throw new Error("AUTHORING_RELATIONSHIP_RESULT_NOT_FOUND");
  return result.rows[0];
}

function assertExactId(actual, expected, code) {
  if (String(actual ?? "") !== String(expected ?? "")) throw new Error(code);
}

function buildHistoricalReplaySnapshot({ schema, marker, ledger, relationship }) {
  return Object.freeze({
    version: RESULT_SNAPSHOT_VERSION,
    schema,
    marker,
    provenance_complete: false,
    provenance_note: "Execution predated durable entity-disposition snapshots; live UUID bindings are verified but original create/reuse dispositions are unknown.",
    entities: Object.freeze({
      person: Object.freeze({ id: String(ledger.person_id), disposition: "historical_unknown" }),
      polity: Object.freeze({ id: String(relationship.polity_id), disposition: "historical_unknown" }),
      role: Object.freeze({
        id: relationship.role_id == null ? null : String(relationship.role_id),
        disposition: relationship.role_id == null ? "not_applicable" : "historical_unknown"
      }),
      period_basis: Object.freeze({ id: String(relationship.period_basis_id), disposition: "historical_unknown" }),
      activity: Object.freeze({ id: String(relationship.id), disposition: "historical_unknown" })
    })
  });
}

function assertSnapshotMatchesLive({ snapshot, ledger, relationship }) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    throw new Error("AUTHORING_LEDGER_RESULT_INVALID");
  }
  if (Number(snapshot.version) !== RESULT_SNAPSHOT_VERSION) {
    throw new Error("AUTHORING_LEDGER_RESULT_VERSION_UNSUPPORTED");
  }
  const entities = snapshot.entities;
  if (!entities || typeof entities !== "object" || Array.isArray(entities)) {
    throw new Error("AUTHORING_LEDGER_RESULT_INVALID");
  }
  assertExactId(entities.person?.id, ledger.person_id, "AUTHORING_LEDGER_PERSON_DRIFT");
  assertExactId(entities.activity?.id, ledger.relationship_id, "AUTHORING_LEDGER_ACTIVITY_DRIFT");
  assertExactId(entities.polity?.id, relationship.polity_id, "AUTHORING_LEDGER_POLITY_DRIFT");
  assertExactId(entities.role?.id, relationship.role_id, "AUTHORING_LEDGER_ROLE_DRIFT");
  assertExactId(entities.period_basis?.id, relationship.period_basis_id, "AUTHORING_LEDGER_PERIOD_BASIS_DRIFT");
}

function outcomeFromSnapshot({ marker, requestId, replay, snapshot }) {
  return Object.freeze({
    marker,
    request_id: requestId,
    committed: true,
    replay,
    person_id: snapshot.entities.person.id,
    relationship_id: snapshot.entities.activity.id,
    polity_id: snapshot.entities.polity.id,
    ...(snapshot.entities.role.id ? { role_id: snapshot.entities.role.id } : {}),
    result: snapshot
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
          if (replay.manifest_schema && replay.manifest_schema !== schema) {
            throw new Error("AUTHORING_LEDGER_SCHEMA_MISMATCH");
          }
          const relationship = await loadRelationshipIdentity(client, replay.relationship_id);
          assertExactId(relationship.person_id, replay.person_id, "AUTHORING_LEDGER_PERSON_RELATIONSHIP_DRIFT");

          let snapshot = replay.result_snapshot;
          if (snapshot) {
            assertSnapshotMatchesLive({ snapshot, ledger: replay, relationship });
          } else {
            snapshot = buildHistoricalReplaySnapshot({ schema, marker, ledger: replay, relationship });
            await client.query(
              `update atlas_v2.authoring_manifest_runs
                  set manifest_schema=coalesce(manifest_schema,$2),
                      result_snapshot=$3::jsonb
                where request_id=$1`,
              [requestId, schema, JSON.stringify(snapshot)]
            );
          }

          await client.query("commit");
          return outcomeFromSnapshot({ marker, requestId, replay: true, snapshot });
        }

        throw new Error("AUTHORING_LEGACY_MANIFEST_NEW_WRITE_RETIRED_USE_NATIVE_V2");
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
  RESULT_SNAPSHOT_VERSION,
  createAuthoringManifestService,
  manifestHash,
  requireManifest,
  markerForSchema,
  validateDeclaredIdentityReferences,
  readLedger,
  loadRelationshipIdentity,
  buildHistoricalReplaySnapshot,
  assertSnapshotMatchesLive,
  outcomeFromSnapshot
});
