"use strict";

const {
  sha256,
  synthesizeCorrectionV2Manifest
} = require("./atlas-correction-v2-manifest-synthesizer.js");
const {
  STAGE2_ASSERTION_TYPES,
  normalizeStage2AssertionOperation
} = require("./atlas-correction-v2-stage2-assertions.js");

function stripFinalEnvelope(manifest) {
  const { manifest_sha256, production_executable, ...core } = manifest;
  return core;
}

function synthesizeUnifiedCorrectionV2Manifest(plan, snapshot) {
  const base = synthesizeCorrectionV2Manifest(plan, snapshot);
  const baseCore = stripFinalEnvelope(base);
  const rawAssertions = plan?.stage2_assertions || [];
  if (!Array.isArray(rawAssertions)) throw new Error("CORRECTION_V2_STAGE2_ASSERTIONS_ARRAY_REQUIRED");

  const operations = [...baseCore.operations];
  for (const raw of rawAssertions) {
    const type = String(raw?.type || "").trim();
    if (!STAGE2_ASSERTION_TYPES.has(type)) throw new Error("CORRECTION_V2_STAGE2_ASSERTION_OPERATION_UNSUPPORTED");
    operations.push(normalizeStage2AssertionOperation(raw, operations.length + 1));
  }
  if (operations.length === 0) throw new Error("CORRECTION_V2_UNIFIED_PLAN_OPERATIONS_REQUIRED");

  const manifestCore = { ...baseCore, operations };
  return Object.freeze({
    ...manifestCore,
    manifest_sha256: sha256(manifestCore),
    production_executable: true
  });
}

module.exports = Object.freeze({
  stripFinalEnvelope,
  synthesizeUnifiedCorrectionV2Manifest
});
