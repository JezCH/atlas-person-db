"use strict";

const { createCorrectionManifestV2Service } = require("./atlas-correction-manifest-v2-service.js");
const {
  OPERATION_TYPE: POLITY_RETIRE_OPERATION_TYPE,
  createCorrectionPolityRetireV2Service
} = require("./atlas-correction-polity-retire-v2-service.js");
const {
  OPERATION_TYPE: POLITY_NAME_OPERATION_TYPE,
  createCorrectionPolityNameV2Service
} = require("./atlas-correction-polity-name-v2-service.js");
const {
  OPERATION_TYPE: POLITY_RESTORE_OPERATION_TYPE,
  createCorrectionPolityRestoreV2Service
} = require("./atlas-correction-polity-restore-v2-service.js");
const {
  OPERATION_TYPE: SOURCE_CITATION_OPERATION_TYPE,
  createCorrectionSourceCitationV2Service
} = require("./atlas-correction-source-citation-v2-service.js");
const {
  OPERATION_TYPE: POLITY_DESIGNATION_RETIRE_OPERATION_TYPE,
  createCorrectionPolityDesignationRetireV2Service
} = require("./atlas-correction-polity-designation-retire-v2-service.js");
const {
  OPERATION_TYPE: PERSON_DOMAIN_OPERATION_TYPE,
  createCorrectionPersonDomainV2Service
} = require("./atlas-correction-person-domain-v2-service.js");

function operationTypes(rawManifest) {
  return Array.isArray(rawManifest?.operations)
    ? rawManifest.operations.map((operation) => String(operation?.type || "").trim())
    : [];
}

function createCorrectionManifestV2DispatchService({ client } = {}) {
  const standardService = createCorrectionManifestV2Service({ client });
  const polityRetireService = createCorrectionPolityRetireV2Service({ client });
  const polityNameService = createCorrectionPolityNameV2Service({ client });
  const polityRestoreService = createCorrectionPolityRestoreV2Service({ client });
  const sourceCitationService = createCorrectionSourceCitationV2Service({ client });
  const polityDesignationRetireService = createCorrectionPolityDesignationRetireV2Service({ client });
  const personDomainService = createCorrectionPersonDomainV2Service({ client });

  return Object.freeze({
    execute(rawManifest, options) {
      const types = operationTypes(rawManifest);
      const hasPolityRetire = types.includes(POLITY_RETIRE_OPERATION_TYPE);
      const hasPolityName = types.includes(POLITY_NAME_OPERATION_TYPE);
      const hasPolityRestore = types.includes(POLITY_RESTORE_OPERATION_TYPE);
      const hasSourceCitation = types.includes(SOURCE_CITATION_OPERATION_TYPE);
      const hasPolityDesignationRetire = types.includes(POLITY_DESIGNATION_RETIRE_OPERATION_TYPE);
      const hasPersonDomain = types.includes(PERSON_DOMAIN_OPERATION_TYPE);

      if (hasPolityRetire && !types.every((type) => type === POLITY_RETIRE_OPERATION_TYPE)) {
        throw new Error("CORRECTION_V2_POLITY_RETIRE_MIXED_OPERATION_FAMILY_FORBIDDEN");
      }
      if (hasPolityName && !types.every((type) => type === POLITY_NAME_OPERATION_TYPE)) {
        throw new Error("CORRECTION_V2_POLITY_NAME_MIXED_OPERATION_FAMILY_FORBIDDEN");
      }
      if (hasPolityRestore && !types.every((type) => type === POLITY_RESTORE_OPERATION_TYPE)) {
        throw new Error("CORRECTION_V2_POLITY_RESTORE_MIXED_OPERATION_FAMILY_FORBIDDEN");
      }
      if (hasSourceCitation && !types.every((type) => type === SOURCE_CITATION_OPERATION_TYPE)) {
        throw new Error("CORRECTION_V2_SOURCE_CITATION_MIXED_OPERATION_FAMILY_FORBIDDEN");
      }
      if (hasPolityDesignationRetire && !types.every((type) => type === POLITY_DESIGNATION_RETIRE_OPERATION_TYPE)) {
        throw new Error("CORRECTION_V2_POLITY_DESIGNATION_RETIRE_MIXED_OPERATION_FAMILY_FORBIDDEN");
      }
      if (hasPersonDomain && !types.every((type) => type === PERSON_DOMAIN_OPERATION_TYPE)) {
        throw new Error("CORRECTION_V2_PERSON_DOMAIN_MIXED_OPERATION_FAMILY_FORBIDDEN");
      }

      if (hasPolityRetire) return polityRetireService.execute(rawManifest, options);
      if (hasPolityName) return polityNameService.execute(rawManifest, options);
      if (hasPolityRestore) return polityRestoreService.execute(rawManifest, options);
      if (hasSourceCitation) return sourceCitationService.execute(rawManifest, options);
      if (hasPolityDesignationRetire) return polityDesignationRetireService.execute(rawManifest, options);
      if (hasPersonDomain) return personDomainService.execute(rawManifest, options);
      return standardService.execute(rawManifest, options);
    }
  });
}

module.exports = Object.freeze({
  POLITY_RETIRE_OPERATION_TYPE,
  POLITY_NAME_OPERATION_TYPE,
  POLITY_RESTORE_OPERATION_TYPE,
  SOURCE_CITATION_OPERATION_TYPE,
  POLITY_DESIGNATION_RETIRE_OPERATION_TYPE,
  PERSON_DOMAIN_OPERATION_TYPE,
  operationTypes,
  createCorrectionManifestV2DispatchService
});
