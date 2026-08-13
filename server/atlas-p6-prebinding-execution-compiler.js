"use strict";

const crypto = require("node:crypto");

const PREBINDING_SCHEMA = "atlas-stage2-correction-v2-prebinding-plan/v1";
const PLAN_SCHEMA = "atlas-stage2-correction-v2-execution-plan/v1";
const PACKAGE_SCHEMA = "atlas-stage2-p6-execution-package/v1";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DNS_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const BASELINE_SHA = "ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79";
const BASELINE_DIGEST = "sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27";

function uuidBytes(id) {
  return Buffer.from(id.replaceAll("-", ""), "hex");
}

function formatUuid(bytes) {
  const hex = bytes.toString("hex");
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

function uuidV5(namespace, name) {
  const digest = crypto.createHash("sha1").update(Buffer.concat([uuidBytes(namespace), Buffer.from(String(name), "utf8")])).digest();
  const bytes = Buffer.from(digest.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return formatUuid(bytes);
}

const REPOSITORY_NAMESPACE = uuidV5(DNS_NAMESPACE, "atlas-person-db");

function deterministicActivityId(caseId, fragmentId) {
  return uuidV5(REPOSITORY_NAMESPACE, `p6:activity:${caseId}:${fragmentId}`);
}

function deterministicAssertionId(caseId, relationDecisionId) {
  return uuidV5(REPOSITORY_NAMESPACE, `p6:polity-relation:${caseId}:${relationDecisionId}`);
}

function requireUuid(value, code) {
  const id = String(value || "").trim().toLowerCase();
  if (!UUID_RE.test(id)) throw new Error(code);
  return id;
}

function assertBaseline(value, code) {
  if (value?.deployment_sha !== BASELINE_SHA || value?.baseline_digest !== BASELINE_DIGEST) throw new Error(code);
}

function expectedBeforeObject(batch, item) {
  if (!Array.isArray(batch.before_tuple_fields) || !Array.isArray(item.expected_before) || batch.before_tuple_fields.length !== item.expected_before.length) {
    throw new Error(`P6_COMPILER_BEFORE_TUPLE_INVALID:${item.id}`);
  }
  return Object.fromEntries(batch.before_tuple_fields.map((field, index) => [field, item.expected_before[index]]));
}

function collectPreparedIdentityClasses(item, out = []) {
  if (Array.isArray(item)) {
    for (const value of item) collectPreparedIdentityClasses(value, out);
    return out;
  }
  if (!item || typeof item !== "object") return out;
  for (const [key, value] of Object.entries(item)) {
    if (key.endsWith("identity_class") && typeof value === "string") out.push(value);
    collectPreparedIdentityClasses(value, out);
  }
  return out;
}

function compileCoverage({ goldenPlan, prebindingBatches, allocations, reviewedSources, rolePrerequisites, resolutionAdapters }) {
  if (goldenPlan?.schema !== PLAN_SCHEMA) throw new Error("P6_COMPILER_GOLDEN_PLAN_SCHEMA_INVALID");
  assertBaseline(goldenPlan.baseline, "P6_COMPILER_GOLDEN_BASELINE_DRIFT");
  if (!Array.isArray(prebindingBatches) || prebindingBatches.length !== 18) throw new Error("P6_COMPILER_PREBINDING_BATCH_COUNT_INVALID");
  for (let i = 0; i < prebindingBatches.length; i += 1) {
    const batch = prebindingBatches[i];
    if (batch?.schema !== PREBINDING_SCHEMA) throw new Error(`P6_COMPILER_BATCH_SCHEMA_INVALID:${i + 1}`);
    assertBaseline(batch.baseline, `P6_COMPILER_BATCH_BASELINE_DRIFT:${i + 1}`);
  }
  assertBaseline(allocations?.baseline, "P6_COMPILER_ALLOCATION_BASELINE_DRIFT");

  const polityByClass = new Map((allocations.polities || []).map((row) => [row.identity_class, requireUuid(row.polity_uuid, `P6_COMPILER_POLITY_UUID_INVALID:${row.identity_class}`)]));
  const sourceByKey = new Map((reviewedSources || []).map((row) => [row.candidate_key, requireUuid(row.source_uuid || row?.row?.id, `P6_COMPILER_SOURCE_UUID_INVALID:${row.candidate_key}`)]));
  const roleByClass = new Map((rolePrerequisites?.roles || []).map((row) => [row.identity_class, requireUuid(row?.role?.id, `P6_COMPILER_ROLE_UUID_INVALID:${row.identity_class}`)]));
  const adapterByCase = new Map((resolutionAdapters?.adapters || []).map((row) => [row.case_id, row]));

  const cases = prebindingBatches.flatMap((batch, batchIndex) => (batch.cases || []).map((item) => ({ batch, batchIndex: batchIndex + 1, item })));
  if (cases.length !== 54) throw new Error(`P6_COMPILER_EFFECTIVE_CASE_COUNT_INVALID:${cases.length}`);
  const caseIds = new Set();
  const activityIds = new Set();
  const blockers = [];
  const generatedActivityIds = [];
  const generatedAssertionIds = [];
  const classifications = [];

  for (const entry of cases) {
    const { batch, batchIndex, item } = entry;
    if (!item?.id || caseIds.has(item.id)) throw new Error(`P6_COMPILER_CASE_ID_REUSED:${item?.id || "<missing>"}`);
    caseIds.add(item.id);
    const activityId = requireUuid(item.activity_id, `P6_COMPILER_ACTIVITY_UUID_INVALID:${item.id}`);
    if (activityIds.has(activityId)) throw new Error(`P6_COMPILER_ACTIVITY_TARGET_REUSED:${activityId}`);
    activityIds.add(activityId);
    expectedBeforeObject(batch, item);

    const adapter = adapterByCase.get(item.id) || null;
    if (batchIndex === 10 || batchIndex === 11) {
      if (!adapter) blockers.push({ case_id:item.id, code:"REVIEWED_EXECUTION_ADAPTER_REQUIRED" });
      else {
        for (const fragment of adapter.fragments || []) {
          requireUuid(fragment.activity_uuid, `P6_COMPILER_ADAPTER_ACTIVITY_UUID_INVALID:${item.id}:${fragment.id}`);
          requireUuid(fragment.polity_uuid, `P6_COMPILER_ADAPTER_POLITY_UUID_INVALID:${item.id}:${fragment.id}`);
          requireUuid(fragment.relation_type_uuid, `P6_COMPILER_ADAPTER_RELATION_UUID_INVALID:${item.id}:${fragment.id}`);
          requireUuid(fragment.role_uuid, `P6_COMPILER_ADAPTER_ROLE_UUID_INVALID:${item.id}:${fragment.id}`);
          requireUuid(fragment.period_basis_uuid, `P6_COMPILER_ADAPTER_PERIOD_UUID_INVALID:${item.id}:${fragment.id}`);
        }
        const sourceUuid = requireUuid(adapter.source_uuid, `P6_COMPILER_ADAPTER_SOURCE_UUID_INVALID:${item.id}`);
        if (![...sourceByKey.values()].includes(sourceUuid)) blockers.push({ case_id:item.id, code:"ADAPTER_SOURCE_NOT_IN_REVIEWED_AUTHORING", source_uuid:sourceUuid });
      }
    }

    const classes = [...new Set(collectPreparedIdentityClasses(item))];
    for (const identityClass of classes) {
      const serialized = JSON.stringify(item);
      const needsAllocation = serialized.includes(`\"target_identity_class\":\"${identityClass}\"`) || serialized.includes(`\"subject_identity_class\":\"${identityClass}\"`) || serialized.includes(`\"object_identity_class\":\"${identityClass}\"`);
      if (needsAllocation && !polityByClass.has(identityClass) && serialized.includes(`\"${identityClass}\"`)) {
        const hasLiteralPair = serialized.includes(`\"target_polity_uuid\"`) && !serialized.includes(`\"target_polity_uuid\":null`);
        if (!hasLiteralPair && !adapter) blockers.push({ case_id:item.id, code:"PREPARED_POLITY_UUID_MISSING", identity_class:identityClass });
      }
    }

    const fragments = adapter?.fragments || item.fragments || item.phase_envelopes || [];
    for (const fragment of fragments) {
      if (fragment.activity_uuid == null) {
        const id = deterministicActivityId(item.id, fragment.id);
        generatedActivityIds.push({ case_id:item.id, fragment_id:fragment.id, activity_uuid:id });
      }
    }

    const handoffs = [item.polity_relation_handoff, item.structural_relation_handoff].filter(Boolean);
    for (const handoff of handoffs) {
      const relationDecisionId = handoff.relation_decision_id || handoff.research_relation_id;
      if (relationDecisionId && handoff.relation_type_uuid) {
        generatedAssertionIds.push({ case_id:item.id, relation_decision_id:relationDecisionId, assertion_uuid:deterministicAssertionId(item.id, relationDecisionId) });
      }
      if (handoff.source_candidate_key && !sourceByKey.has(handoff.source_candidate_key)) blockers.push({ case_id:item.id, code:"POLITY_RELATION_SOURCE_UUID_MISSING", source_candidate_key:handoff.source_candidate_key });
    }

    if (item.type === "retire_activity" && (!Array.isArray(item.replacement_activity_ids) || item.replacement_activity_ids.length === 0)) {
      blockers.push({ case_id:item.id, code:"RETIRE_REPLACEMENT_ACTIVITY_REQUIRED" });
    }
    classifications.push({ case_id:item.id, batch:batchIndex, type:item.type, adapter:Boolean(adapter) });
  }

  if (goldenPlan.operations.length !== 9) throw new Error("P6_COMPILER_GOLDEN_OPERATION_COUNT_DRIFT");
  const goldenActivityIds = new Set(goldenPlan.operations.map((row) => requireUuid(row.activity_id, "P6_COMPILER_GOLDEN_ACTIVITY_UUID_INVALID")));
  for (const id of goldenActivityIds) if (!activityIds.has(id)) throw new Error(`P6_COMPILER_GOLDEN_TARGET_OUTSIDE_FRONTIER:${id}`);

  const weiwei = roleByClass.get("HAN_WEIWEI_COURT_OFFICE");
  const maTengAdapter = adapterByCase.get("p6b10_ma_teng_multiphase_scaffold");
  if (maTengAdapter && !weiwei) blockers.push({ case_id:"p6b10_ma_teng_multiphase_scaffold", code:"WEIWEI_ROLE_PREREQUISITE_MISSING" });
  if (maTengAdapter && weiwei && !JSON.stringify(maTengAdapter).includes(weiwei)) blockers.push({ case_id:"p6b10_ma_teng_multiphase_scaffold", code:"WEIWEI_ROLE_PREREQUISITE_NOT_BOUND" });

  const uniqueBlockers = [...new Map(blockers.map((row) => [JSON.stringify(row), row])).values()];
  return Object.freeze({
    schema: PACKAGE_SCHEMA,
    baseline: { deployment_sha: BASELINE_SHA, baseline_digest: BASELINE_DIGEST },
    coverage: {
      prebinding_batches: 18,
      effective_activity_targets: activityIds.size,
      golden_literal_targets: goldenActivityIds.size,
      remaining_targets: activityIds.size - goldenActivityIds.size,
      reviewed_adapter_cases: adapterByCase.size,
      generated_activity_uuid_assignments: generatedActivityIds.length,
      generated_polity_relation_assertion_uuids: generatedAssertionIds.length,
      blockers: uniqueBlockers.length
    },
    generated_activity_ids: generatedActivityIds.sort((a,b) => `${a.case_id}:${a.fragment_id}`.localeCompare(`${b.case_id}:${b.fragment_id}`)),
    generated_assertion_ids: generatedAssertionIds.sort((a,b) => `${a.case_id}:${a.relation_decision_id}`.localeCompare(`${b.case_id}:${b.relation_decision_id}`)),
    blockers: uniqueBlockers,
    classifications,
    production_mutation_authorized: false
  });
}

module.exports = Object.freeze({
  PREBINDING_SCHEMA,
  PLAN_SCHEMA,
  PACKAGE_SCHEMA,
  BASELINE_SHA,
  BASELINE_DIGEST,
  REPOSITORY_NAMESPACE,
  uuidV5,
  deterministicActivityId,
  deterministicAssertionId,
  expectedBeforeObject,
  compileCoverage
});
