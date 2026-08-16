"use strict";

const { createCorrectionManifestV2Service } = require("./atlas-correction-manifest-v2-service.js");
const {
  OPERATION_TYPE: ROLE_MERGE_OPERATION_TYPE,
  createCorrectionRoleMergeV2Service
} = require("./atlas-correction-role-merge-v2-service.js");

function operationTypes(rawManifest) {
  return Array.isArray(rawManifest?.operations)
    ? rawManifest.operations.map((operation) => String(operation?.type || "").trim())
    : [];
}

function createCorrectionManifestV2DispatchService({ client } = {}) {
  const standardService = createCorrectionManifestV2Service({ client });
  const roleMergeService = createCorrectionRoleMergeV2Service({ client });

  return Object.freeze({
    execute(rawManifest, options) {
      const types = operationTypes(rawManifest);
      const hasRoleMerge = types.includes(ROLE_MERGE_OPERATION_TYPE);
      if (hasRoleMerge && !types.every((type) => type === ROLE_MERGE_OPERATION_TYPE)) {
        throw new Error("CORRECTION_V2_ROLE_MERGE_MIXED_OPERATION_FAMILY_FORBIDDEN");
      }
      return hasRoleMerge
        ? roleMergeService.execute(rawManifest, options)
        : standardService.execute(rawManifest, options);
    }
  });
}

module.exports = Object.freeze({
  ROLE_MERGE_OPERATION_TYPE,
  operationTypes,
  createCorrectionManifestV2DispatchService
});
