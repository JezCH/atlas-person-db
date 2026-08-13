"use strict";

const crypto = require("node:crypto");

const FINAL_SCHEMA = "atlas-correction-manifest/v2";
const PLAN_SCHEMA = "atlas-stage2-correction-v2-execution-plan/v1";
const SNAPSHOT_SCHEMA = "atlas-correction-v2-target-snapshot/v1";
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

function applyActivityTemplate(live, template, { newFragment = false } = {}) {
  const out = {
    ...live,
    id: template.activity_id,
    person_id: template.person_id,
    polity_id: template.polity_id,
    relation_type_id: template.relation_type_id,
    role_id: template.role_id,
    period_basis_id: template.period_basis_id,
    activity_start: template.activity_start,
    activity_start_month: null,
    activity_start_day: null,
    activity_start_granularity: null,
    activity_start_certainty: null,
    activity_start_calendar: null,
    activity_end: template.activity_end,
    activity_end_month: null,
    activity_end_day: null,
    activity_end_granularity: null,
    activity_end_certainty: null,
    activity_end_calendar: null,
    confidence: template.confidence,
    chronology_status: template.chronology_status,
    legacy_source_key: newFragment ? null : template.legacy_source_key,
    notes: live.notes,
    source_locator: live.source_locator,
    content_hash: live.content_hash
  };
  if (newFragment && out.legacy_source_key !== null) throw new Error("CORRECTION_V2_NEW_FRAGMENT_FAKE_LEGACY_KEY_FORBIDDEN");
  return out;
}

function synthesizeCorrectionV2Manifest(plan, snapshot) {
  if (plan?.schema !== PLAN_SCHEMA) throw new Error("CORRECTION_V2_EXECUTION_PLAN_SCHEMA_INVALID");
  if (snapshot?.schema !== SNAPSHOT_SCHEMA) throw new Error("CORRECTION_V2_SNAPSHOT_SCHEMA_INVALID");
  if (plan?.execution_rules?.production_executable !== false || plan?.execution_rules?.production_mutation_authorized !== false) {
    throw new Error("CORRECTION_V2_PLAN_PREMATURE_PRODUCTION_AUTHORIZATION");
  }
  if (!/^sha256:[0-9a-f]{64}$/.test(String(snapshot.snapshot_digest || ""))) throw new Error("CORRECTION_V2_SNAPSHOT_DIGEST_REQUIRED");

  const expectedActivityIds = [...plan.operations.map((row) => row.activity_id)].sort();
  const actualActivityIds = [...snapshot.activity_ids].sort();
  if (JSON.stringify(expectedActivityIds) !== JSON.stringify(actualActivityIds)) throw new Error("CORRECTION_V2_SNAPSHOT_TARGET_SET_MISMATCH");

  const liveById = new Map(snapshot.activities.map((row) => [row.id, row]));
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

    const exactBefore = {
      activity: live,
      normalized_source_links: exactSourceLinks,
      chronology_claims: claimsByActivity.get(item.activity_id) || [],
      relationship_descriptions: descriptionsByActivity.get(item.activity_id) || []
    };

    if (item.type === "rewrite_activity") {
      operations.push({
        case_id: item.case_id,
        type: "rewrite_activity",
        activity_id: item.activity_id,
        exact_before: exactBefore,
        exact_after: {
          activity: applyActivityTemplate(live, item.after),
          normalized_source_links: exactSourceLinks,
          chronology_claims: exactBefore.chronology_claims,
          relationship_descriptions: exactBefore.relationship_descriptions
        },
        same_activity_uuid_preserved: true,
        source_links_preserved_by_default: true
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
      operations.push({
        case_id: item.case_id,
        type: "split_activity",
        activity_id: item.activity_id,
        exact_before: exactBefore,
        survivor_fragment: {
          activity: applyActivityTemplate(live, survivor),
          normalized_source_links: exactSourceLinks,
          chronology_claims: [],
          relationship_descriptions: []
        },
        new_fragments: created.map((fragment) => ({
          activity: applyActivityTemplate(live, fragment, { newFragment: true }),
          normalized_source_links: exactSourceLinks.map((link) => ({ ...link, person_politics_id: fragment.activity_id })),
          chronology_claims: [],
          relationship_descriptions: []
        })),
        survivor_fragment_preserves_original_activity_uuid: true,
        existing_source_link_copy_policy: "COPY_ALL_EXISTING_NORMALIZED_ACTIVITY_SOURCE_LINKS_AND_LOCATORS",
        gap_overlap_policy: item.gap_overlap_policy
      });
      continue;
    }

    throw new Error(`CORRECTION_V2_PLAN_OPERATION_UNSUPPORTED:${item.type}`);
  }

  for (const relation of plan.polity_relation_assertions || []) {
    operations.push({
      decision_id: relation.decision_id,
      type: "assert_polity_relation",
      exact_before: { relation_absent_id: relation.id, source_link_ids_absent: relation.source_links.map((row) => row.id) },
      exact_after: relation
    });
  }

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
  BASELINE_FIELDS,
  canonicalize,
  sha256,
  groupBy,
  assertBaselineTuple,
  applyActivityTemplate,
  synthesizeCorrectionV2Manifest
});
