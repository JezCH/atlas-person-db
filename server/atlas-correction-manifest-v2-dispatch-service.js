"use strict";

const { createCorrectionManifestV2Service } = require("./atlas-correction-manifest-v2-service.js");
const {
  OPERATION_TYPE: ROLE_MERGE_OPERATION_TYPE,
  createCorrectionRoleMergeV2Service
} = require("./atlas-correction-role-merge-v2-service.js");
const {
  OPERATION_TYPE: ROLE_SCOPE_OPERATION_TYPE,
  createCorrectionRoleScopeV2Service
} = require("./atlas-correction-role-scope-v2-service.js");
const {
  OPERATION_TYPE: POLITY_RETIRE_OPERATION_TYPE,
  createCorrectionPolityRetireV2Service
} = require("./atlas-correction-polity-retire-v2-service.js");

function operationTypes(rawManifest) {
  return Array.isArray(rawManifest?.operations)
    ? rawManifest.operations.map((operation) => String(operation?.type || "").trim())
    : [];
}

function createCorrectionManifestV2DispatchService({ client } = {}) {
  const standardService = createCorrectionManifestV2Service({ client });
  const roleMergeService = createCorrectionRoleMergeV2Service({ client });
  const roleScopeService = createCorrectionRoleScopeV2Service({ client });
  const polityRetireService = createCorrectionPolityRetireV2Service({ client });

  return Object.freeze({
    execute(rawManifest, options) {
      const types = operationTypes(rawManifest);
      const hasCaseMerge = types.includes(ROLE_MERGE_OPERATION_TYPE);
      const hasScopeMerge = types.includes(ROLE_SCOPE_OPERATION_TYPE);
      const hasPolityRetire = types.includes(POLITY_RETIRE_OPERATION_TYPE);
      const hasRoleCatalogMutation = hasCaseMerge || hasScopeMerge;

      if (hasCaseMerge && !types.every((type) => type === ROLE_MERGE_OPERATION_TYPE)) {
        throw new Error("CORRECTION_V2_ROLE_MERGE_MIXED_OPERATION_FAMILY_FORBIDDEN");
      }
      if (hasScopeMerge && !types.every((type) => type === ROLE_SCOPE_OPERATION_TYPE)) {
        throw new Error("CORRECTION_V2_ROLE_SCOPE_MIXED_OPERATION_FAMILY_FORBIDDEN");
      }
      if (hasPolityRetire && !types.every((type) => type === POLITY_RETIRE_OPERATION_TYPE)) {
        throw new Error("CORRECTION_V2_POLITY_RETIRE_MIXED_OPERATION_FAMILY_FORBIDDEN");
      }
      if (hasRoleCatalogMutation && hasCaseMerge && hasScopeMerge) {
        throw new Error("CORRECTION_V2_ROLE_CATALOG_MIXED_OPERATION_FAMILY_FORBIDDEN");
      }

      if (hasCaseMerge) return roleMergeService.execute(rawManifest, options);
      if (hasScopeMerge) return roleScopeService.execute(rawManifest, options);
      if (hasPolityRetire) return polityRetireService.execute(rawManifest, options);
      return standardService.execute(rawManifest, options);
    }
  });
}

module.exports = Object.freeze({
  ROLE_MERGE_OPERATION_TYPE,
  ROLE_SCOPE_OPERATION_TYPE,
  POLITY_RETIRE_OPERATION_TYPE,
  operationTypes,
  createCorrectionManifestV2DispatchService
});
