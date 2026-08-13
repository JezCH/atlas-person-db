"use strict";

const { deterministicActivityId, deterministicAssertionId } = require("./atlas-p6-prebinding-execution-compiler.js");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PLAN_SCHEMA = "atlas-stage2-correction-v2-execution-plan/v1";

function requiredUuid(value, code) {
  const id = String(value || "").trim().toLowerCase();
  if (!UUID_RE.test(id)) throw new Error(code);
  return id;
}

function nonblank(value, code) {
  const text = String(value || "").trim();
  if (!text) throw new Error(code);
  return text;
}

function tupleObject(batch, item) {
  if (!Array.isArray(batch.before_tuple_fields) || !Array.isArray(item.expected_before) || batch.before_tuple_fields.length !== item.expected_before.length) {
    throw new Error(`P6_MATERIALIZER_BEFORE_TUPLE_INVALID:${item.id}`);
  }
  return Object.fromEntries(batch.before_tuple_fields.map((field, index) => [field, item.expected_before[index]]));
}

function buildMaps({ allocations, reviewedSources, rolePrerequisites, relationCatalog, relationDecisions, relationSourcePackage }) {
  const relationSourceByDecision = new Map();
  for (const link of relationSourcePackage?.links || []) {
    const decisionId = nonblank(link.relation_decision_id, "P6_MATERIALIZER_RELATION_SOURCE_DECISION_REQUIRED");
    const sourceKey = nonblank(link.source_candidate_key, `P6_MATERIALIZER_RELATION_SOURCE_CANDIDATE_REQUIRED:${decisionId}`);
    const locator = nonblank(link.source_locator_key, `P6_MATERIALIZER_RELATION_SOURCE_LOCATOR_REQUIRED:${decisionId}:${sourceKey}`);
    const list = relationSourceByDecision.get(decisionId) || [];
    list.push(Object.freeze({ source_candidate_key: sourceKey, source_locator_key: locator, relation_type: link.relation_type || null }));
    relationSourceByDecision.set(decisionId, list);
  }

  const relationDecisionByActivity = new Map();
  for (const decision of relationDecisions?.decisions || []) {
    if (!decision?.activity_id || !Array.isArray(decision.relation_assertions) || decision.relation_assertions.length === 0) continue;
    const activityId = requiredUuid(decision.activity_id, `P6_MATERIALIZER_RELATION_DECISION_ACTIVITY_INVALID:${decision.id}`);
    const list = relationDecisionByActivity.get(activityId) || [];
    list.push(decision);
    relationDecisionByActivity.set(activityId, list);
  }

  return Object.freeze({
    polity: new Map((allocations?.polities || []).map((row) => [row.identity_class, requiredUuid(row.polity_uuid, `P6_MATERIALIZER_POLITY_UUID_INVALID:${row.identity_class}`)])),
    source: new Map((reviewedSources || []).map((row) => [row.candidate_key, requiredUuid(row.source_uuid, `P6_MATERIALIZER_SOURCE_UUID_INVALID:${row.candidate_key}`)])),
    role: new Map((rolePrerequisites?.roles || []).map((row) => [row.identity_class, requiredUuid(row?.role?.id, `P6_MATERIALIZER_ROLE_UUID_INVALID:${row.identity_class}`)])),
    polityRelationType: new Map((relationCatalog?.polity_relation_types || []).map((row) => [row.code, requiredUuid(row.id, `P6_MATERIALIZER_POLITY_RELATION_UUID_INVALID:${row.code}`)])),
    relationDecisionByActivity,
    relationSourceByDecision
  });
}

function resolvePolity(node, maps, caseId) {
  const literal = node?.polity_id ?? node?.target_polity_uuid ?? node?.subject_polity_id ?? node?.object_polity_id;
  if (literal != null) return requiredUuid(literal, `P6_MATERIALIZER_POLITY_UUID_INVALID:${caseId}`);
  const identityClass = node?.polity_identity_class ?? node?.target_identity_class ?? node?.subject_identity_class ?? node?.object_identity_class;
  if (identityClass && maps.polity.has(identityClass)) return maps.polity.get(identityClass);
  throw new Error(`P6_MATERIALIZER_POLITY_UNRESOLVED:${caseId}:${identityClass || "<none>"}`);
}

function resolveRelationEndpoint(endpoint, maps, label) {
  if (endpoint?.polity_uuid != null) return requiredUuid(endpoint.polity_uuid, `P6_MATERIALIZER_ASSERTION_POLITY_UUID_INVALID:${label}`);
  if (endpoint?.identity_class && maps.polity.has(endpoint.identity_class)) return maps.polity.get(endpoint.identity_class);
  throw new Error(`P6_MATERIALIZER_ASSERTION_POLITY_UNRESOLVED:${label}:${endpoint?.identity_class || "<none>"}`);
}

function relationUuid(node) {
  if (node?.relation_type_uuid != null) return requiredUuid(node.relation_type_uuid, "P6_MATERIALIZER_RELATION_UUID_INVALID");
  if (Array.isArray(node?.relation) && node.relation[1] != null) return requiredUuid(node.relation[1], "P6_MATERIALIZER_RELATION_UUID_INVALID");
  return null;
}

function boundaryDetail(boundary, fallbackYear) {
  if (!boundary) return null;
  const year = Number(boundary.year ?? fallbackYear);
  if (!Number.isInteger(year) || year === 0) throw new Error("P6_MATERIALIZER_BOUNDARY_YEAR_INVALID");

  const month = boundary.month == null ? null : Number(boundary.month);
  const day = boundary.day == null ? null : Number(boundary.day);
  if (month != null && (!Number.isInteger(month) || month < 1 || month > 12)) throw new Error("P6_MATERIALIZER_BOUNDARY_MONTH_INVALID");
  if (day != null && (!Number.isInteger(day) || day < 1 || day > 31 || month == null)) throw new Error("P6_MATERIALIZER_BOUNDARY_DAY_INVALID");

  const granularity = String(boundary.granularity || (day != null ? "day" : month != null ? "month" : "year")).toLowerCase();
  const certainty = String(boundary.certainty || "exact").toLowerCase();
  const calendar = String(boundary.calendar || "unspecified_historical").toLowerCase();
  if (granularity === "year" && (month != null || day != null)) throw new Error("P6_MATERIALIZER_BOUNDARY_GRANULARITY_MISMATCH");
  if (granularity === "month" && (month == null || day != null)) throw new Error("P6_MATERIALIZER_BOUNDARY_GRANULARITY_MISMATCH");
  if (granularity === "day" && (month == null || day == null)) throw new Error("P6_MATERIALIZER_BOUNDARY_GRANULARITY_MISMATCH");

  return Object.freeze({ year, month, day, granularity, certainty, calendar });
}

function sourceIdsForCase(item, maps) {
  const keys = Array.isArray(item.normalized_source_candidate_keys) ? item.normalized_source_candidate_keys : [];
  return keys.map((key) => {
    const sourceId = maps.source.get(key);
    if (!sourceId) throw new Error(`P6_MATERIALIZER_SOURCE_UNRESOLVED:${item.id}:${key}`);
    return Object.freeze({ source_id: sourceId, source_locator_key: null });
  });
}

function normalizedAfter(item, before, maps) {
  const node = item.proposed_after || item.after || item.effective_politic_resolution || item;
  const relation = relationUuid(node) || relationUuid(item);
  const polity = resolvePolity(node, maps, item.id);
  return Object.freeze({
    activity_id: requiredUuid(node.activity_uuid || item.activity_id, `P6_MATERIALIZER_ACTIVITY_UUID_INVALID:${item.id}`),
    person_id: requiredUuid(node.person_id || before.person_id, `P6_MATERIALIZER_PERSON_UUID_INVALID:${item.id}`),
    polity_id: polity,
    relation_type_id: relation,
    role_id: requiredUuid(node.role_id || before.role_id, `P6_MATERIALIZER_ROLE_UUID_INVALID:${item.id}`),
    period_basis_id: requiredUuid(node.period_basis_id || before.period_basis_id, `P6_MATERIALIZER_PERIOD_UUID_INVALID:${item.id}`),
    activity_start: Number(node.activity_start ?? node.start_year ?? before.activity_start),
    activity_end: Number(node.activity_end ?? node.end_year ?? before.activity_end),
    activity_start_detail: boundaryDetail(node.start_boundary, node.activity_start ?? node.start_year ?? before.activity_start),
    activity_end_detail: boundaryDetail(node.end_boundary, node.activity_end ?? node.end_year ?? before.activity_end),
    confidence: before.confidence,
    chronology_status: node.chronology_status || before.chronology_status,
    legacy_source_key: before.legacy_source_key,
    notes_policy: node.notes_policy || "PRESERVE_EXACT_LIVE_NOTES",
    source_links_policy: "PRESERVE_ALL_EXISTING_NORMALIZED_SOURCE_LINKS_AND_LOCATORS",
    add_source_links: sourceIdsForCase(item, maps)
  });
}

function compileRewrite(batch, item, maps) {
  const before = tupleObject(batch, item);
  const after = normalizedAfter(item, before, maps);
  return Object.freeze({
    case_id: item.id,
    type: "rewrite_activity",
    activity_id: requiredUuid(item.activity_id, `P6_MATERIALIZER_ACTIVITY_UUID_INVALID:${item.id}`),
    baseline_before: before,
    live_before: "SYNTHESIZE_FROM_EXACT_SAME_SHA_SNAPSHOT_BEFORE_DRY_RUN",
    after
  });
}

function fragmentNode(fragment, item, before, maps, adapter, batch) {
  const id = fragment.id || "fragment";
  const activityId = fragment.activity_uuid || fragment.activity_id || deterministicActivityId(item.id, id);
  const survivor = activityId === item.activity_id || id === item.survivor_fragment_id || id === adapter?.survivor_fragment_id;
  const relation = relationUuid(fragment);
  if (!survivor && relation == null) throw new Error(`P6_MATERIALIZER_NEW_FRAGMENT_RELATION_REQUIRED:${item.id}:${id}`);
  const personId = fragment.person_id || before.person_id;
  const polityId = resolvePolity(fragment, maps, `${item.id}:${id}`);
  const roleId = fragment.role_uuid || fragment.role_id || before.role_id;
  const periodId = fragment.period_basis_uuid || fragment.period_basis_id || before.period_basis_id;
  const start = Number(fragment.activity_start ?? fragment.start_year);
  const end = Number(fragment.activity_end ?? fragment.end_year);
  if (!Number.isInteger(start) || start === 0 || !Number.isInteger(end) || end === 0 || start > end) throw new Error(`P6_MATERIALIZER_FRAGMENT_INTERVAL_INVALID:${item.id}:${id}`);
  const explicitCopy = fragment.copy_legacy_source_links;
  const policyText = JSON.stringify(batch?.source_preservation_policy || {});
  const copyExisting = explicitCopy != null ? Boolean(explicitCopy) : survivor || /COPY_ALL_EXISTING.*ALL_FRAGMENTS/i.test(policyText);
  const added = sourceIdsForCase(item, maps);
  if (adapter?.source_uuid) added.push(Object.freeze({ source_id: requiredUuid(adapter.source_uuid, `P6_MATERIALIZER_ADAPTER_SOURCE_INVALID:${item.id}`), source_locator_key: fragment.source_locator_key || null }));
  return Object.freeze({
    survivor,
    activity_id: requiredUuid(activityId, `P6_MATERIALIZER_FRAGMENT_UUID_INVALID:${item.id}:${id}`),
    person_id: requiredUuid(personId, `P6_MATERIALIZER_FRAGMENT_PERSON_INVALID:${item.id}:${id}`),
    polity_id: polityId,
    relation_type_id: relation,
    role_id: requiredUuid(roleId, `P6_MATERIALIZER_FRAGMENT_ROLE_INVALID:${item.id}:${id}`),
    period_basis_id: requiredUuid(periodId, `P6_MATERIALIZER_FRAGMENT_PERIOD_INVALID:${item.id}:${id}`),
    activity_start: start,
    activity_end: end,
    activity_start_detail: boundaryDetail(fragment.start_boundary, start),
    activity_end_detail: boundaryDetail(fragment.end_boundary, end),
    confidence: before.confidence,
    chronology_status: before.chronology_status,
    legacy_source_key: survivor ? before.legacy_source_key : null,
    notes_policy: survivor ? "PRESERVE_EXACT_LIVE_NOTES" : "COPY_EXACT_LIVE_NOTES_FROM_SOURCE_ACTIVITY",
    source_copy_policy: copyExisting ? "COPY_EXISTING" : "DO_NOT_COPY_EXISTING",
    add_source_links: [...new Map(added.map((row) => [row.source_id, row])).values()]
  });
}

function compileSplit(batch, item, maps, adapter) {
  const before = tupleObject(batch, item);
  const sourceFragments = adapter?.fragments || item.fragments || item.phase_envelopes;
  if (!Array.isArray(sourceFragments) || sourceFragments.length < 2) throw new Error(`P6_MATERIALIZER_SPLIT_FRAGMENTS_INVALID:${item.id}`);
  const fragments = sourceFragments.map((fragment) => fragmentNode(fragment, item, before, maps, adapter, batch));
  if (fragments.filter((row) => row.survivor).length !== 1) throw new Error(`P6_MATERIALIZER_SPLIT_SURVIVOR_INVALID:${item.id}`);
  return Object.freeze({
    case_id: item.id,
    type: "split_activity",
    activity_id: requiredUuid(item.activity_id, `P6_MATERIALIZER_ACTIVITY_UUID_INVALID:${item.id}`),
    baseline_before: before,
    live_before: "SYNTHESIZE_FROM_EXACT_SAME_SHA_SNAPSHOT_BEFORE_DRY_RUN",
    fragments,
    gap_overlap_policy: item.overlap_gap_policy || item.split_boundary_policy || item.overlap_policy || item.gap_overlap_policy || adapter?.gap_overlap_policy || null
  });
}

function compileRetire(batch, item) {
  const before = tupleObject(batch, item);
  const replacements = Array.isArray(item.replacement_activity_ids) ? item.replacement_activity_ids : item.survivor_activity_id ? [item.survivor_activity_id] : [];
  if (replacements.length === 0) throw new Error(`P6_MATERIALIZER_RETIRE_SURVIVOR_REQUIRED:${item.id}`);
  return Object.freeze({
    case_id: item.id,
    type: "retire_activity",
    activity_id: requiredUuid(item.activity_id, `P6_MATERIALIZER_ACTIVITY_UUID_INVALID:${item.id}`),
    baseline_before: before,
    live_before: "SYNTHESIZE_FROM_EXACT_SAME_SHA_SNAPSHOT_BEFORE_DRY_RUN",
    replacement_activity_ids: replacements.map((id, index) => requiredUuid(id, `P6_MATERIALIZER_RETIRE_REPLACEMENT_INVALID:${item.id}:${index}`)),
    source_transfer_policy: "COPY_ALL_RETIRED_NORMALIZED_SOURCE_LINKS_AND_LOCATORS_TO_REVIEWED_SURVIVORS_DEDUP_BY_NORMALIZED_LINK_IDENTITY_BEFORE_DELETE",
    silent_source_drop_forbidden: true
  });
}

function compileAssertions(item, maps) {
  const activityId = requiredUuid(item.activity_id, `P6_MATERIALIZER_ACTIVITY_UUID_INVALID:${item.id}`);
  const decisions = maps.relationDecisionByActivity.get(activityId) || [];
  return decisions.flatMap((decision) => {
    const sourceAuthority = maps.relationSourceByDecision.get(decision.id) || [];
    if (sourceAuthority.length === 0) throw new Error(`P6_MATERIALIZER_ASSERTION_SOURCE_LINKS_REQUIRED:${decision.id}`);
    return decision.relation_assertions.map((assertion, index) => {
      const relationType = maps.polityRelationType.get(assertion.relation_type);
      if (!relationType) throw new Error(`P6_MATERIALIZER_ASSERTION_RELATION_UNRESOLVED:${decision.id}:${assertion.relation_type}`);
      const subject = resolveRelationEndpoint(assertion.subject, maps, `${decision.id}:subject`);
      const object = resolveRelationEndpoint(assertion.object, maps, `${decision.id}:object`);
      const sourceLinks = sourceAuthority
        .filter((link) => !link.relation_type || link.relation_type === assertion.relation_type)
        .map((link) => {
          const sourceId = maps.source.get(link.source_candidate_key);
          if (!sourceId) throw new Error(`P6_MATERIALIZER_ASSERTION_SOURCE_UNRESOLVED:${decision.id}:${link.source_candidate_key}`);
          return Object.freeze({ source_id: sourceId, source_locator_key: link.source_locator_key });
        });
      if (sourceLinks.length === 0) throw new Error(`P6_MATERIALIZER_ASSERTION_SOURCE_LINKS_REQUIRED:${decision.id}:${assertion.relation_type}`);
      return Object.freeze({
        type: "assert_polity_relation",
        assertion_id: deterministicAssertionId(item.id, `${decision.id}:${index}`),
        relation_decision_id: decision.id,
        subject_polity_id: subject,
        object_polity_id: object,
        relation_type_id: relationType,
        start_year: assertion.start?.year ?? null,
        end_year: assertion.end?.year ?? null,
        start_detail: boundaryDetail(assertion.start, assertion.start?.year),
        end_detail: boundaryDetail(assertion.end, assertion.end?.year),
        source_links: sourceLinks
      });
    });
  });
}

function materializeBatch({ batch, maps, adapterByCase }) {
  const operations = [];
  const companion_assertions = [];
  for (const item of batch.cases || []) {
    const adapter = adapterByCase.get(item.id) || null;
    const type = item.type || (adapter || Array.isArray(item.fragments) || Array.isArray(item.phase_envelopes) ? "split_activity" : "rewrite_activity");
    if (type === "rewrite_activity") operations.push(compileRewrite(batch, item, maps));
    else if (type === "split_activity") operations.push(compileSplit(batch, item, maps, adapter));
    else if (type === "retire_activity") operations.push(compileRetire(batch, item));
    else throw new Error(`P6_MATERIALIZER_OPERATION_TYPE_UNSUPPORTED:${item.id}:${type}`);
    companion_assertions.push(...compileAssertions(item, maps));
  }
  return Object.freeze({
    schema: PLAN_SCHEMA,
    batch_id: `${batch.batch_id}_literal_execution`,
    as_of: "2026-08-14",
    status: "LITERAL_OPERANDS_COMPLETE_LIVE_BEFORE_SNAPSHOT_REQUIRED",
    contract: batch.contract,
    prebinding_authority: batch.batch_id,
    baseline: batch.baseline,
    execution_rules: Object.freeze({
      uuid_only_runtime_operands: true,
      runtime_name_identity_class_and_source_key_resolution_forbidden: true,
      exact_same_sha_live_snapshot_required: true,
      existing_legacy_relation_may_remain_null_only_when_review_explicitly_deferred: true,
      new_fragment_relation_required: true,
      silent_source_drop_forbidden: true,
      reviewed_assertion_locator_required: true,
      production_executable: false,
      production_mutation_authorized: false
    }),
    operations,
    companion_assertions
  });
}

function materializePackage({ prebindingBatches, allocations, reviewedSources, rolePrerequisites, resolutionAdapters, relationCatalog, relationDecisions, relationSourcePackage }) {
  const maps = buildMaps({ allocations, reviewedSources, rolePrerequisites, relationCatalog, relationDecisions, relationSourcePackage });
  const adapterByCase = new Map((resolutionAdapters?.adapters || []).map((row) => [row.case_id, row]));
  const plans = prebindingBatches.map((batch) => materializeBatch({ batch, maps, adapterByCase }));
  const operations = plans.flatMap((plan) => plan.operations);
  const ids = operations.map((row) => row.activity_id);
  if (ids.length !== 45 || new Set(ids).size !== 45) throw new Error(`P6_MATERIALIZER_REMAINING_TARGET_COUNT_INVALID:${ids.length}:${new Set(ids).size}`);
  return Object.freeze({
    schema: "atlas-stage2-p6-literal-execution-package/v1",
    as_of: "2026-08-14",
    baseline: plans[0]?.baseline,
    plans,
    result: Object.freeze({
      compiled_activity_targets: operations.length,
      companion_assertions: plans.reduce((sum, plan) => sum + plan.companion_assertions.length, 0),
      runtime_name_resolution_operands: 0,
      production_mutation_authorized: false
    })
  });
}

module.exports = Object.freeze({
  PLAN_SCHEMA,
  tupleObject,
  buildMaps,
  resolvePolity,
  boundaryDetail,
  normalizedAfter,
  compileRewrite,
  compileSplit,
  compileRetire,
  compileAssertions,
  materializeBatch,
  materializePackage
});
