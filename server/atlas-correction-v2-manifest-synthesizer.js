"use strict";

const crypto = require("node:crypto");

const FINAL_SCHEMA = "atlas-correction-manifest/v2";
const PLAN_SCHEMA = "atlas-stage2-correction-v2-execution-plan/v1";
const SNAPSHOT_SCHEMA = "atlas-correction-v2-target-snapshot/v1";
const RETIRE_SOURCE_TRANSFER_POLICY = "COPY_ALL_RETIRED_NORMALIZED_SOURCE_LINKS_AND_LOCATORS_TO_REVIEWED_SURVIVORS_DEDUP_BY_NORMALIZED_LINK_IDENTITY_BEFORE_DELETE";
const BASELINE_FIELDS = Object.freeze([
  "person_id","polity_id","role_id","period_basis_id","activity_start","activity_end",
  "confidence","chronology_status","legacy_source_key"
]);

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

function sha256(value) {
  return `sha256:${crypto.createHash("sha256").update(JSON.stringify(canonicalize(value)), "utf8").digest("hex")}`;
}

function groupBy(rows, key) {
  const map = new Map();
  for (const row of rows || []) {
    const value = row[key];
    if (!map.has(value)) map.set(value, []);
    map.get(value).push(row);
  }
  return map;
}

function assertBaselineTuple(planOperation, live) {
  const expected = planOperation.baseline_before;
  for (const field of BASELINE_FIELDS) {
    const left = live[field] == null ? null : live[field];
    const right = expected[field] == null ? null : expected[field];
    if (left !== right) throw new Error(`CORRECTION_V2_LIVE_BASELINE_DRIFT:${planOperation.case_id}:${field}`);
  }
  if (Number(planOperation.baseline_before.source_count) < 0) throw new Error(`CORRECTION_V2_BASELINE_SOURCE_COUNT_INVALID:${planOperation.case_id}`);
}

function boundaryColumns(detail) {
  if (detail == null) return Object.freeze({ month:null, day:null, granularity:null, certainty:null, calendar:null });
  return Object.freeze({
    month: detail.month ?? null,
    day: detail.day ?? null,
    granularity: detail.granularity ?? null,
    certainty: detail.certainty ?? null,
    calendar: detail.calendar ?? null
  });
}

function resolveActivityNotes(live, template) {
  const policy = String(template?.notes_policy || "PRESERVE_EXACT_LIVE_NOTES").trim();
  if (policy === "REPLACE_WITH_REVIEWED_NOTES") {
    const reviewed = typeof template?.reviewed_notes === "string" ? template.reviewed_notes.trim() : "";
    if (!reviewed) throw new Error("CORRECTION_V2_REVIEWED_NOTES_REQUIRED");
    return reviewed;
  }
  return live.notes;
}

function applyActivityTemplate(live, template, { newFragment = false } = {}) {
  const start = boundaryColumns(template.activity_start_detail);
  const end = boundaryColumns(template.activity_end_detail);
  const out = {
    ...live,
    id: template.activity_id,
    person_id: template.person_id,
    polity_id: template.polity_id,
    relation_type_id: template.relation_type_id,
    role_id: template.role_id,
    period_basis_id: template.period_basis_id,
    activity_start: template.activity_start,
    activity_start_month: start.month,
    activity_start_day: start.day,
    activity_start_granularity: start.granularity,
    activity_start_certainty: start.certainty,
    activity_start_calendar: start.calendar,
    activity_end: template.activity_end,
    activity_end_month: end.month,
    activity_end_day: end.day,
    activity_end_granularity: end.granularity,
    activity_end_certainty: end.certainty,
    activity_end_calendar: end.calendar,
    confidence: template.confidence,
    chronology_status: template.chronology_status,
    legacy_source_key: newFragment ? null : template.legacy_source_key,
    notes: resolveActivityNotes(live, template),
    source_locator: live.source_locator,
    content_hash: live.content_hash
  };
  if (newFragment && out.legacy_source_key !== null) throw new Error("CORRECTION_V2_NEW_FRAGMENT_FAKE_LEGACY_KEY_FORBIDDEN");
  return out;
}

function sourceLinkForActivity(activityId, raw) {
  return {
    person_politics_id: activityId,
    source_id: String(raw.source_id || "").trim().toLowerCase(),
    source_locator_key: String(raw.source_locator_key || "").trim()
  };
}

function mergeReviewedSourceLinks(activityId, baseLinks, additions, label) {
  const bySource = new Map();
  for (const raw of baseLinks || []) {
    const link = sourceLinkForActivity(activityId, raw);
    if (!link.source_id || !link.source_locator_key) throw new Error(`CORRECTION_V2_${label}_LIVE_SOURCE_LINK_INVALID`);
    const existing = bySource.get(link.source_id);
    if (existing && existing.source_locator_key !== link.source_locator_key) throw new Error(`CORRECTION_V2_${label}_SOURCE_LOCATOR_CONFLICT:${link.source_id}`);
    bySource.set(link.source_id, link);
  }
  for (const raw of additions || []) {
    const locator = String(raw?.source_locator_key || "").trim();
    if (!locator) continue;
    const link = sourceLinkForActivity(activityId, raw);
    if (!link.source_id) throw new Error(`CORRECTION_V2_${label}_SOURCE_ID_REQUIRED`);
    const existing = bySource.get(link.source_id);
    if (existing && existing.source_locator_key !== link.source_locator_key) throw new Error(`CORRECTION_V2_${label}_SOURCE_LOCATOR_CONFLICT:${link.source_id}`);
    bySource.set(link.source_id, link);
  }
  return [...bySource.values()].sort((a,b)=>a.source_id.localeCompare(b.source_id) || a.source_locator_key.localeCompare(b.source_locator_key));
}

function exactBundleForActivity(id, liveById, sourceLinksByActivity, claimsByActivity, descriptionsByActivity, label) {
  const live = liveById.get(id);
  if (!live) throw new Error(`CORRECTION_V2_LIVE_ACTIVITY_MISSING:${label}`);
  return {
    activity: live,
    normalized_source_links: sourceLinksByActivity.get(id) || [],
    chronology_claims: claimsByActivity.get(id) || [],
    relationship_descriptions: descriptionsByActivity.get(id) || []
  };
}

function requiredSnapshotActivityIds(plan) {
  const mutationIds = new Set();
  const dependencyIds = new Set();
  for (const operation of plan?.operations || []) {
    mutationIds.add(String(operation.activity_id || "").toLowerCase());
    if (operation.type === "retire_activity") {
      for (const replacementId of operation.replacement_activity_ids || []) dependencyIds.add(String(replacementId || "").toLowerCase());
    }
  }
  for (const id of dependencyIds) {
    if (mutationIds.has(id)) throw new Error(`CORRECTION_V2_RETIRE_REPLACEMENT_IS_MUTATION_TARGET:${id}`);
  }
  return [...new Set([...mutationIds, ...dependencyIds])].sort();
}

function normalizePolityRelationSourceLinkForExecution(relationId, raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("CORRECTION_V2_RELATION_SOURCE_LINK_REQUIRED");
  const sourceId = String(raw.source_id || "").trim().toLowerCase();
  const locator = String(raw.source_locator_key || "").trim();
  if (!sourceId || !locator) throw new Error("CORRECTION_V2_RELATION_SOURCE_LINK_INVALID");
  return {
    polity_relation_id: relationId,
    source_id: sourceId,
    source_locator_key: locator
  };
}

function relationOperationFromLegacy(relation) {
  const relationId = String(relation.id || "").toLowerCase();
  const { source_links: rawLinks = [], ...relationRow } = relation;
  const sourceLinks = rawLinks.map((link) => normalizePolityRelationSourceLinkForExecution(relationId, link));
  return {
    decision_id: relation.decision_id,
    type: "assert_polity_relation",
    exact_before: { relation_absent_id: relationId },
    exact_after: { relation: relationRow, source_links: sourceLinks }
  };
}

function relationOperationFromCompanion(assertion) {
  const relationId = String(assertion.assertion_id || "").toLowerCase();
  const start = assertion.start_detail || null;
  const end = assertion.end_detail || null;
  const sourceLinks = (assertion.source_links || []).map((link) => normalizePolityRelationSourceLinkForExecution(relationId, link));
  return {
    decision_id: assertion.relation_decision_id,
    type: "assert_polity_relation",
    exact_before: { relation_absent_id: relationId },
    exact_after: {
      relation: {
        id: relationId,
        subject_polity_id: assertion.subject_polity_id,
        object_polity_id: assertion.object_polity_id,
        relation_type_id: assertion.relation_type_id,
        valid_from_year: start?.year ?? assertion.start_year ?? null,
        valid_from_month: start?.month ?? null,
        valid_from_day: start?.day ?? null,
        valid_from_granularity: start?.granularity ?? null,
        valid_from_certainty: start?.certainty ?? null,
        valid_from_calendar: start?.calendar ?? null,
        valid_to_year: end?.year ?? assertion.end_year ?? null,
        valid_to_month: end?.month ?? null,
        valid_to_day: end?.day ?? null,
        valid_to_granularity: end?.granularity ?? null,
        valid_to_certainty: end?.certainty ?? null,
        valid_to_calendar: end?.calendar ?? null,
        confidence: assertion.confidence || "unknown",
        notes: assertion.notes || `Reviewed structural polity relation decision ${assertion.relation_decision_id}; confidence intentionally not upgraded beyond reviewed interval semantics.`
      },
      source_links: sourceLinks
    }
  };
}

function synthesizeCorrectionV2Manifest(plan, snapshot) {
  if (plan?.schema !== PLAN_SCHEMA) throw new Error("CORRECTION_V2_EXECUTION_PLAN_SCHEMA_INVALID");
  if (snapshot?.schema !== SNAPSHOT_SCHEMA) throw new Error("CORRECTION_V2_SNAPSHOT_SCHEMA_INVALID");
  if (plan?.execution_rules?.production_executable !== false || plan?.execution_rules?.production_mutation_authorized !== false) {
    throw new Error("CORRECTION_V2_PLAN_PREMATURE_PRODUCTION_AUTHORIZATION");
  }
  if (!/^sha256:[0-9a-f]{64}$/.test(String(snapshot.snapshot_digest || ""))) throw new Error("CORRECTION_V2_SNAPSHOT_DIGEST_REQUIRED");

  const expectedActivityIds = requiredSnapshotActivityIds(plan);
  const actualActivityIds = [...snapshot.activity_ids].map((id)=>String(id).toLowerCase()).sort();
  if (JSON.stringify(expectedActivityIds) !== JSON.stringify(actualActivityIds)) throw new Error("CORRECTION_V2_SNAPSHOT_TARGET_SET_MISMATCH");

  const liveById = new Map(snapshot.activities.map((row) => [String(row.id).toLowerCase(), row]));
  const sourceLinksByActivity = groupBy(snapshot.normalized_activity_source_links, "person_politics_id");
  const claimsByActivity = groupBy(snapshot.chronology_claims, "person_politics_id");
  const descriptionsByActivity = groupBy(snapshot.relationship_descriptions, "person_politics_id");
  const operations = [];

  for (const item of plan.operations) {
    const live = liveById.get(item.activity_id);
    if (!live) throw new Error(`CORRECTION_V2_LIVE_ACTIVITY_MISSING:${item.case_id}`);
    assertBaselineTuple(item, live);
    const exactSourceLinks = sourceLinksByActivity.get(item.activity_id) || [];
    if (exactSourceLinks.length !== item.baseline_before.source_count) {
      throw new Error(`CORRECTION_V2_LIVE_SOURCE_COUNT_DRIFT:${item.case_id}`);
    }

    const exactBefore = exactBundleForActivity(item.activity_id, liveById, sourceLinksByActivity, claimsByActivity, descriptionsByActivity, item.case_id);

    if (item.type === "rewrite_activity") {
      const afterSources = mergeReviewedSourceLinks(item.activity_id, exactSourceLinks, item.after.add_source_links, `${item.case_id}_REWRITE`);
      const preservesSources = JSON.stringify(afterSources) === JSON.stringify(exactSourceLinks);
      operations.push({
        case_id: item.case_id,
        type: "rewrite_activity",
        activity_id: item.activity_id,
        exact_before: exactBefore,
        exact_after: {
          activity: applyActivityTemplate(live, item.after),
          normalized_source_links: afterSources,
          chronology_claims: exactBefore.chronology_claims,
          relationship_descriptions: exactBefore.relationship_descriptions
        },
        same_activity_uuid_preserved: true,
        source_links_preserved_by_default: preservesSources
      });
      continue;
    }

    if (item.type === "split_activity") {
      if (exactBefore.chronology_claims.length !== 0 || exactBefore.relationship_descriptions.length !== 0) {
        throw new Error(`CORRECTION_V2_SPLIT_CHILD_POLICY_REQUIRED:${item.case_id}`);
      }
      const survivor = item.fragments.find((row) => row.survivor === true);
      const created = item.fragments.filter((row) => row.survivor === false);
      if (!survivor || survivor.activity_id !== item.activity_id || created.length === 0) {
        throw new Error(`CORRECTION_V2_SPLIT_SURVIVOR_INVALID:${item.case_id}`);
      }
      const survivorSources = mergeReviewedSourceLinks(item.activity_id, exactSourceLinks, survivor.add_source_links, `${item.case_id}_SURVIVOR`);
      const newFragments = created.map((fragment) => {
        const copyPolicy = fragment.source_copy_policy || "COPY_EXISTING";
        if (!new Set(["COPY_EXISTING","DO_NOT_COPY_EXISTING"]).has(copyPolicy)) throw new Error(`CORRECTION_V2_SPLIT_SOURCE_COPY_POLICY_INVALID:${item.case_id}`);
        const base = copyPolicy === "COPY_EXISTING"
          ? exactSourceLinks.map((link) => ({ ...link, person_politics_id: fragment.activity_id }))
          : [];
        return {
          activity: applyActivityTemplate(live, fragment, { newFragment: true }),
          normalized_source_links: mergeReviewedSourceLinks(fragment.activity_id, base, fragment.add_source_links, `${item.case_id}_${fragment.activity_id}`),
          chronology_claims: [],
          relationship_descriptions: [],
          source_copy_policy: copyPolicy
        };
      });
      operations.push({
        case_id: item.case_id,
        type: "split_activity",
        activity_id: item.activity_id,
        exact_before: exactBefore,
        survivor_fragment: {
          activity: applyActivityTemplate(live, survivor),
          normalized_source_links: survivorSources,
          chronology_claims: [],
          relationship_descriptions: []
        },
        new_fragments: newFragments,
        survivor_fragment_preserves_original_activity_uuid: true,
        survivor_source_links_preserved_by_default: JSON.stringify(survivorSources) === JSON.stringify(exactSourceLinks),
        gap_overlap_policy: item.gap_overlap_policy
      });
      continue;
    }

    if (item.type === "retire_activity") {
      if (item.source_transfer_policy !== RETIRE_SOURCE_TRANSFER_POLICY || item.silent_source_drop_forbidden !== true) {
        throw new Error(`CORRECTION_V2_RETIRE_SOURCE_TRANSFER_POLICY_INVALID:${item.case_id}`);
      }
      if (exactBefore.chronology_claims.length !== 0 || exactBefore.relationship_descriptions.length !== 0) {
        throw new Error(`CORRECTION_V2_RETIRE_CHILD_POLICY_REQUIRED:${item.case_id}`);
      }
      const replacements = (item.replacement_activity_ids || []).map((replacementId) => {
        const before = exactBundleForActivity(replacementId, liveById, sourceLinksByActivity, claimsByActivity, descriptionsByActivity, `${item.case_id}:${replacementId}`);
        const transferred = mergeReviewedSourceLinks(replacementId, before.normalized_source_links, exactSourceLinks, `${item.case_id}_RETIRE_TRANSFER_${replacementId}`);
        return {
          activity_id: replacementId,
          exact_before: before,
          exact_after: { ...before, normalized_source_links: transferred }
        };
      });
      if (replacements.length === 0) throw new Error(`CORRECTION_V2_RETIRE_SURVIVOR_REQUIRED:${item.case_id}`);
      operations.push({
        case_id: item.case_id,
        type: "retire_activity",
        activity_id: item.activity_id,
        exact_before: exactBefore,
        replacement_survivors: replacements,
        source_transfer_policy: RETIRE_SOURCE_TRANSFER_POLICY,
        silent_source_drop_forbidden: true
      });
      continue;
    }

    throw new Error(`CORRECTION_V2_PLAN_OPERATION_UNSUPPORTED:${item.type}`);
  }

  for (const relation of plan.polity_relation_assertions || []) operations.push(relationOperationFromLegacy(relation));
  for (const assertion of plan.companion_assertions || []) operations.push(relationOperationFromCompanion(assertion));

  const manifestCore = {
    schema: FINAL_SCHEMA,
    request_id: plan.batch_id,
    review_status: "approved",
    baseline: plan.baseline,
    exact_live_snapshot_digest: snapshot.snapshot_digest,
    exact_live_snapshot_activity_ids: [...snapshot.activity_ids],
    execution_guards: {
      serializable_required: true,
      advisory_lock_required: true,
      manifest_hash_idempotency_required: true,
      immutable_audit_required: true,
      dry_run_before_apply_required: true,
      partial_commit_forbidden: true,
      exact_before_state_required: true,
      no_runtime_name_or_semantic_identity_resolution: true,
      no_silent_source_loss: true,
      no_fake_legacy_source_key: true,
      provenance_link_identity_is_composite: true,
      synthetic_provenance_link_uuid_forbidden: true,
      retire_source_transfer_before_delete_required: true,
      territory_geometry_mutation_forbidden: true,
      physical_person_merge_forbidden: true
    },
    operations
  };

  return Object.freeze({
    ...manifestCore,
    manifest_sha256: sha256(manifestCore),
    production_executable: true
  });
}

module.exports = Object.freeze({
  FINAL_SCHEMA,
  PLAN_SCHEMA,
  SNAPSHOT_SCHEMA,
  RETIRE_SOURCE_TRANSFER_POLICY,
  BASELINE_FIELDS,
  canonicalize,
  sha256,
  groupBy,
  assertBaselineTuple,
  boundaryColumns,
  resolveActivityNotes,
  applyActivityTemplate,
  sourceLinkForActivity,
  mergeReviewedSourceLinks,
  exactBundleForActivity,
  requiredSnapshotActivityIds,
  normalizePolityRelationSourceLinkForExecution,
  relationOperationFromLegacy,
  relationOperationFromCompanion,
  synthesizeCorrectionV2Manifest
});
