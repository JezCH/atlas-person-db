"use strict";

const { createPerson, createPolity, createRole } = require("./atlas-identity-service.js");
const { createStage2NativeActivityTx, loadStage2NativeActivity } = require("./atlas-stage2-native-activity-service.js");
const { requiredUuid } = require("./atlas-activity-semantic-key-v2.js");
const { manifestHash, readLedger } = require("./atlas-authoring-manifest-service.js");

const MANIFEST_V2 = "atlas-authoring-manifest/v2";
const SNAPSHOT_VERSION = 2;
const SEMANTIC_VERSION = "v2-relation-full-temporal";

function requireBinding(raw, kind) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`AUTHORING_V2_${kind}_BINDING_REQUIRED`);
  const mode = String(raw.mode || "").trim();
  if (!new Set(["declared","existing","none"]).has(mode)) throw new Error(`AUTHORING_V2_${kind}_BINDING_MODE_INVALID`);
  if (kind === "POLITY" && mode === "none") throw new Error("AUTHORING_V2_POLITY_BINDING_NONE_FORBIDDEN");
  if (mode === "existing") return Object.freeze({ mode, id: requiredUuid(raw.id, `${kind.toLowerCase()}_binding.id`) });
  if (raw.id != null) throw new Error(`AUTHORING_V2_${kind}_BINDING_ID_FORBIDDEN`);
  return Object.freeze({ mode });
}

function requireNativeManifest(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("AUTHORING_MANIFEST_OBJECT_REQUIRED");
  if (raw.schema !== MANIFEST_V2) throw new Error("AUTHORING_V2_SCHEMA_REQUIRED");
  if (String(raw.review_status || "").toLowerCase() !== "approved") throw new Error("AUTHORING_MANIFEST_NOT_APPROVED");
  const requestId = String(raw.request_id || "").trim();
  if (!requestId) throw new Error("AUTHORING_REQUEST_ID_REQUIRED");
  if (!raw.person || typeof raw.person !== "object" || Array.isArray(raw.person)) throw new Error("AUTHORING_PERSON_REQUIRED");
  if (!raw.activity || typeof raw.activity !== "object" || Array.isArray(raw.activity)) throw new Error("AUTHORING_ACTIVITY_REQUIRED");
  if (raw.activity.person_id != null || raw.activity.person_name != null || raw.activity.politic_name != null || raw.activity.polity_name != null || raw.activity.role != null || raw.activity.period_basis != null) {
    throw new Error("AUTHORING_V2_ACTIVITY_NAME_OR_PERSON_ID_BINDING_FORBIDDEN");
  }
  const polityBinding = requireBinding(raw.activity.polity_binding, "POLITY");
  const roleBinding = requireBinding(raw.activity.role_binding, "ROLE");
  if (polityBinding.mode === "declared" && (!raw.polity_identity || typeof raw.polity_identity !== "object" || Array.isArray(raw.polity_identity))) throw new Error("AUTHORING_V2_DECLARED_POLITY_IDENTITY_REQUIRED");
  if (polityBinding.mode !== "declared" && raw.polity_identity != null) throw new Error("AUTHORING_V2_UNUSED_POLITY_IDENTITY_FORBIDDEN");
  if (roleBinding.mode === "declared" && (!raw.role_identity || typeof raw.role_identity !== "object" || Array.isArray(raw.role_identity))) throw new Error("AUTHORING_V2_DECLARED_ROLE_IDENTITY_REQUIRED");
  if (roleBinding.mode !== "declared" && raw.role_identity != null) throw new Error("AUTHORING_V2_UNUSED_ROLE_IDENTITY_FORBIDDEN");
  return Object.freeze({ requestId, person:raw.person, polityIdentity:raw.polity_identity || null, roleIdentity:raw.role_identity || null, polityBinding, roleBinding, activity:raw.activity });
}

function bindActivity({ activity, personId, polityId, roleId }) {
  const { polity_binding, role_binding, ...fields } = activity;
  return Object.freeze({ ...fields, person_id:personId, polity_id:polityId, role_id:roleId });
}

function buildSnapshot({ personResult, polityId, polityDisposition, roleId, roleDisposition, activityResult }) {
  return Object.freeze({
    version: SNAPSHOT_VERSION,
    schema: MANIFEST_V2,
    semantic_version: SEMANTIC_VERSION,
    entities: Object.freeze({
      person: Object.freeze({ id:String(personResult.id).toLowerCase(), disposition:personResult.replay ? "reused" : "created" }),
      polity: Object.freeze({ id:String(polityId).toLowerCase(), disposition:polityDisposition }),
      role: Object.freeze({ id:roleId ? String(roleId).toLowerCase() : null, disposition:roleDisposition }),
      activity: Object.freeze({
        id: activityResult.id,
        disposition: "created",
        semantic_key: activityResult.semantic_key,
        semantic_hash: activityResult.semantic_hash,
        relation_type_id: activityResult.row.relation_type_id,
        period_basis_id: activityResult.row.period_basis_id,
        start: Object.freeze({ year:activityResult.row.activity_start, month:activityResult.row.activity_start_month, day:activityResult.row.activity_start_day, granularity:activityResult.row.activity_start_granularity, certainty:activityResult.row.activity_start_certainty, calendar:activityResult.row.activity_start_calendar }),
        end: Object.freeze({ year:activityResult.row.activity_end, month:activityResult.row.activity_end_month, day:activityResult.row.activity_end_day, granularity:activityResult.row.activity_end_granularity, certainty:activityResult.row.activity_end_certainty, calendar:activityResult.row.activity_end_calendar })
      })
    })
  });
}

async function verifyReplay(client, ledger) {
  const snapshot = ledger?.result_snapshot;
  if (Number(snapshot?.version) !== SNAPSHOT_VERSION || snapshot?.semantic_version !== SEMANTIC_VERSION) throw new Error("AUTHORING_V2_LEDGER_SNAPSHOT_INVALID");
  const activityId = requiredUuid(snapshot?.entities?.activity?.id, "ledger.activity.id");
  const activity = await loadStage2NativeActivity(client, activityId, { forUpdate:true });
  if (!activity) throw new Error("AUTHORING_V2_REPLAY_ACTIVITY_NOT_FOUND");
  if (String(activity.person_id) !== String(ledger.person_id) || String(activityId) !== String(ledger.relationship_id)) throw new Error("AUTHORING_V2_REPLAY_LEDGER_DRIFT");
  if (activity.legacy_source_key != null) throw new Error("AUTHORING_V2_REPLAY_LEGACY_ACTIVITY_DRIFT");
  if (String(activity.relation_type_id) !== String(snapshot.entities.activity.relation_type_id) || String(activity.period_basis_id) !== String(snapshot.entities.activity.period_basis_id)) throw new Error("AUTHORING_V2_REPLAY_SEMANTIC_DRIFT");
  return snapshot;
}

function outcome(requestId, replay, snapshot) {
  return Object.freeze({
    marker: "ATLAS_AUTHORING_MANIFEST_V2_STAGE2_NATIVE",
    request_id: requestId,
    committed: true,
    replay,
    person_id: snapshot.entities.person.id,
    relationship_id: snapshot.entities.activity.id,
    polity_id: snapshot.entities.polity.id,
    ...(snapshot.entities.role.id ? { role_id:snapshot.entities.role.id } : {}),
    result: snapshot
  });
}

function createNativeAuthoringManifestV2Service({ client } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  return Object.freeze({
    async apply(rawManifest) {
      const manifest = requireNativeManifest(rawManifest);
      const hash = manifestHash(rawManifest);
      await client.query("begin isolation level serializable");
      try {
        await client.query("select pg_advisory_xact_lock(hashtext($1))", [`atlas-authoring-manifest:${manifest.requestId}`]);
        const ledger = await readLedger(client, manifest.requestId);
        if (ledger) {
          if (ledger.manifest_hash !== hash) throw new Error("AUTHORING_REQUEST_ID_COLLISION");
          if (ledger.manifest_schema !== MANIFEST_V2) throw new Error("AUTHORING_LEDGER_SCHEMA_MISMATCH");
          const snapshot = await verifyReplay(client, ledger);
          await client.query("commit");
          return outcome(manifest.requestId, true, snapshot);
        }

        const personResult = await createPerson(client, manifest.person);
        let polityId;
        let polityDisposition;
        if (manifest.polityBinding.mode === "declared") {
          const result = await createPolity(client, manifest.polityIdentity);
          polityId = result.id;
          polityDisposition = result.replay ? "reused" : "created";
        } else {
          polityId = manifest.polityBinding.id;
          polityDisposition = "existing_uuid";
        }

        let roleId = null;
        let roleDisposition = "none";
        if (manifest.roleBinding.mode === "declared") {
          const result = await createRole(client, manifest.roleIdentity);
          roleId = result.id;
          roleDisposition = result.replay ? "reused" : "created";
        } else if (manifest.roleBinding.mode === "existing") {
          roleId = manifest.roleBinding.id;
          roleDisposition = "existing_uuid";
        }

        const activityPayload = bindActivity({ activity:manifest.activity, personId:personResult.id, polityId, roleId });
        const activityResult = await createStage2NativeActivityTx(client).create(activityPayload, { requestId:manifest.requestId });
        const snapshot = buildSnapshot({ personResult, polityId, polityDisposition, roleId, roleDisposition, activityResult });
        await client.query(`insert into atlas_v2.authoring_manifest_runs(request_id,manifest_hash,manifest_schema,person_id,relationship_id,result_snapshot) values($1,$2,$3,$4::uuid,$5::uuid,$6::jsonb)`, [manifest.requestId,hash,MANIFEST_V2,personResult.id,activityResult.id,JSON.stringify(snapshot)]);
        await client.query("commit");
        return outcome(manifest.requestId, false, snapshot);
      } catch (error) {
        try { await client.query("rollback"); } catch {}
        throw error;
      }
    }
  });
}

module.exports = Object.freeze({
  MANIFEST_V2,
  SNAPSHOT_VERSION,
  SEMANTIC_VERSION,
  requireBinding,
  requireNativeManifest,
  bindActivity,
  buildSnapshot,
  verifyReplay,
  createNativeAuthoringManifestV2Service
});
