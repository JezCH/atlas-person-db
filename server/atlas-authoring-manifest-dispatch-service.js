"use strict";

const {
  MANIFEST_V1,
  MANIFEST_V2,
  createAuthoringManifestService
} = require("./atlas-authoring-manifest-service.js");
const {
  SNAPSHOT_VERSION,
  SEMANTIC_VERSION,
  createNativeAuthoringManifestV2Service
} = require("./atlas-authoring-manifest-v2-native-service.js");

async function existingLedgerKind(client, requestId) {
  const result = await client.query(`select manifest_schema,result_snapshot from atlas_v2.authoring_manifest_runs where request_id=$1 limit 1`, [requestId]);
  if (!result.rowCount) return null;
  const row = result.rows[0];
  const strictV2 = row.manifest_schema === MANIFEST_V2
    && Number(row.result_snapshot?.version) === SNAPSHOT_VERSION
    && row.result_snapshot?.semantic_version === SEMANTIC_VERSION;
  return Object.freeze({ schema:row.manifest_schema, strict_v2:strictV2 });
}

function createAuthoringManifestDispatchService({ client } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");
  const legacy = createAuthoringManifestService({ client });
  const nativeV2 = createNativeAuthoringManifestV2Service({ client });

  return Object.freeze({
    async apply(rawManifest) {
      if (!rawManifest || typeof rawManifest !== "object" || Array.isArray(rawManifest)) throw new Error("AUTHORING_MANIFEST_OBJECT_REQUIRED");
      const schema = String(rawManifest.schema || "").trim();
      const requestId = String(rawManifest.request_id || "").trim();
      if (!requestId) throw new Error("AUTHORING_REQUEST_ID_REQUIRED");
      const existing = await existingLedgerKind(client, requestId);
      if (existing) {
        if (existing.strict_v2) return nativeV2.apply(rawManifest);
        return legacy.apply(rawManifest);
      }
      if (schema === MANIFEST_V1) throw new Error("AUTHORING_MANIFEST_V1_NEW_WRITE_RETIRED");
      if (schema !== MANIFEST_V2) throw new Error("UNSUPPORTED_AUTHORING_MANIFEST_SCHEMA");
      return nativeV2.apply(rawManifest);
    }
  });
}

module.exports = Object.freeze({ existingLedgerKind, createAuthoringManifestDispatchService });
