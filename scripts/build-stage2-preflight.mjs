import fs from 'node:fs';
import path from 'node:path';
import { stage2DomainContract } from './stage2-domain-contract.mjs';

const args = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};

const inputs = {
  master: arg('--master-summary'),
  relation: arg('--relation-summary'),
  readiness: arg('--readiness-summary'),
  direct: arg('--direct-summary'),
  governance: arg('--governance-summary'),
  polityRelation: arg('--polity-relation-summary'),
  polityIdentity: arg('--polity-identity-summary'),
  continuity: arg('--continuity-summary'),
  japan: arg('--japan-summary'),
  temporal: arg('--temporal-summary')
};
const outPath = arg('--out', 'artifacts/stage2-preflight.json');
const summaryPath = arg('--summary', 'artifacts/stage2-preflight-summary.json');

for (const [name, value] of Object.entries(inputs)) {
  if (!value) throw new Error(`--${name.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}-summary is required`);
}

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const master = readJson(inputs.master);
const relation = readJson(inputs.relation);
const readiness = readJson(inputs.readiness);
const direct = readJson(inputs.direct);
const governance = readJson(inputs.governance);
const polityRelation = readJson(inputs.polityRelation);
const polityIdentity = readJson(inputs.polityIdentity);
const continuity = readJson(inputs.continuity);
const japan = readJson(inputs.japan);
const temporal = readJson(inputs.temporal);

const allInputs = { master, relation, readiness, direct, governance, polityRelation, polityIdentity, continuity, japan, temporal };
const expectedSchemas = {
  master: 'atlas-polity-semantic-master-ledger-summary/v1',
  relation: 'atlas-relation-semantics-audit-summary/v1',
  readiness: 'atlas-relation-backfill-readiness-summary/v1',
  direct: 'atlas-direct-relation-review-summary/v1',
  governance: 'atlas-governance-context-audit-summary/v1',
  polityRelation: 'atlas-polity-relation-audit-summary/v1',
  polityIdentity: 'atlas-polity-identity-audit-summary/v1',
  continuity: 'atlas-polity-continuity-decisions-summary/v1',
  japan: 'atlas-japan-layered-authority-decisions-summary/v1',
  temporal: 'atlas-temporal-contract-audit-summary/v1'
};
for (const [name, schema] of Object.entries(expectedSchemas)) {
  const actual = allInputs[name]?.schema;
  if (actual !== schema) throw new Error(`${name} summary schema drift: ${actual}`);
}

const requireEq = (actual, expected, label) => {
  if (actual !== expected) throw new Error(`${label} drift: expected ${expected}, got ${actual}`);
};

requireEq(master.baseline?.relationship_count, 346, 'Production relationship baseline');
requireEq(master.ledger_rows, 346, 'master ledger rows');
requireEq(master.unique_activity_ids, 346, 'master unique Activity UUIDs');
requireEq(master.r0_keep_count, 6, 'R0 keep count');
requireEq(master.r0_drop_count, 6, 'R0 drop count');
requireEq(master.r1_ready_count, 3, 'R1 ready count');
requireEq(relation.baseline_relationships, 346, 'Relation baseline');
requireEq(relation.candidate_rows, 280, 'conservative Relation candidates');
requireEq(relation.review_required_rows, 66, 'conservative Relation review rows');
requireEq(readiness.original_review_required, 66, 'readiness input review rows');
requireEq(direct.reviewed_queue_rows, 14, 'direct Relation review queue');
requireEq(direct.unresolved_direct_relation_queue, 0, 'unresolved direct Relation review');
requireEq(direct.final_66_disposition_counts?.reviewed_relation_ready, 14, 'reviewed Relation-ready rows from original 66');
requireEq(direct.final_66_disposition_counts?.structural_correction_first, 35, 'structural-first rows from original 66');
requireEq(direct.final_66_disposition_counts?.identity_reconciliation_first, 6, 'identity-first rows from original 66');
requireEq(direct.final_66_disposition_counts?.historical_research_first, 11, 'research-first rows from original 66');
requireEq(governance.old_dependency_signal_rows, 7, 'old Governance planning signals');
requireEq(governance.old_signal_governance_required, 3, 'true old Governance cases');
requireEq(governance.old_signal_false_or_not_primary, 4, 'false/not-primary old Governance signals');
requireEq(polityRelation.old_dependency_signal_rows, 26, 'old Polity-relation planning signals');
requireEq(polityRelation.model_relevant_rows, 18, 'Polity-relation model relevant rows');
requireEq(polityRelation.no_core_relation_proven_rows, 8, 'Polity-relation not-proven rows');
requireEq(polityIdentity.old_dependency_signal_rows, 28, 'old Polity-identity planning signals');
requireEq(polityIdentity.temporal_designation_rows, 7, 'temporal designation rows');
requireEq(polityIdentity.duplicate_alias_rows, 5, 'duplicate/alias identity rows');
requireEq(polityIdentity.continuity_review_rows, 13, 'legacy continuity-review rows');
requireEq(polityIdentity.distinct_union_constituent_rows, 2, 'union/constituent identity rows');
requireEq(polityIdentity.false_or_not_primary_rows, 1, 'false/not-primary identity rows');
requireEq(continuity.reviewed_continuity_rows, 13, 'source-backed continuity decisions');
requireEq(continuity.reviewed_continuity_groups, 4, 'source-backed continuity groups');
requireEq(continuity.unresolved_continuity_model_rows, 0, 'unresolved continuity model rows');
requireEq(continuity.newly_identified_exact_transition_cases, 2, 'new exact temporal transition cases');
requireEq(japan.reviewed_japan_rows, 8, 'reviewed Japan authority rows');
requireEq(japan.old_polity_relation_model_rows, 4, 'old Japan layered-authority relation rows');
requireEq(japan.resolved_old_polity_relation_model_rows, 4, 'resolved Japan layered-authority relation rows');
requireEq(japan.unresolved_old_polity_relation_model_rows, 0, 'unresolved Japan layered-authority relation rows');
requireEq(japan.remaining_sengoku_territorial_or_split_research_rows, 4, 'remaining Sengoku territorial/split research rows');
requireEq(temporal.explicit_sub_year_blockers, 1, 'legacy explicit sub-year blockers');
requireEq(temporal.reviewed_split_intervals, 2, 'reviewed Yoshida replacement intervals');

if (stage2DomainContract.production_migration_authorized !== false) {
  throw new Error('Stage 2 domain contract unexpectedly authorizes Production migration');
}

const temporalCorrectionCases = temporal.explicit_sub_year_blockers + continuity.newly_identified_exact_transition_cases;
const remainingPolityRelationResearchRows = polityRelation.model_relevant_rows - japan.resolved_old_polity_relation_model_rows;
if (remainingPolityRelationResearchRows !== 14) {
  throw new Error(`remaining Polity relation research drift: ${remainingPolityRelationResearchRows}`);
}

const blockerFamilies = [
  {
    code: 'PRODUCTION_MIGRATION_NOT_AUTHORIZED',
    severity: 'HARD',
    count: 1,
    basis: 'The machine-readable Stage 2 domain contract explicitly keeps Production migration authorization false.'
  },
  {
    code: 'CURRENT_ACTIVITY_STRUCTURAL_CORRECTIONS_FIRST',
    severity: 'HARD',
    count: direct.final_66_disposition_counts.structural_correction_first,
    basis: 'These current Activity rows are known to require split/relink/retire/authority-target correction before Relation backfill.'
  },
  {
    code: 'IDENTITY_RECONCILIATION_FIRST',
    severity: 'HARD',
    count: direct.final_66_disposition_counts.identity_reconciliation_first,
    basis: 'The surviving Person/Polity/Activity UUID must be determined before semantic backfill.'
  },
  {
    code: 'HISTORICAL_RESEARCH_FIRST',
    severity: 'HARD',
    count: direct.final_66_disposition_counts.historical_research_first,
    basis: 'Current reviewed evidence is insufficient to harden the final Relation on these rows.'
  },
  {
    code: 'POLITY_CONTINUITY_CORRECTIONS_PENDING',
    severity: 'HARD',
    count: continuity.reviewed_continuity_rows,
    basis: 'The Roman/East-Roman, Yuan/Northern-Yuan, Russia-1721 and Portugal-1815 continuity models are source-backed and machine-checked, but exact UUID relink/retire/coalesce/designation/relation corrections are intentionally not applied to Production.'
  },
  {
    code: 'JAPAN_LAYERED_AUTHORITY_CORRECTIONS_PENDING',
    severity: 'HARD',
    count: japan.resolved_old_polity_relation_model_rows,
    basis: 'Kamakura/Tokugawa layered-authority semantics are source-backed and resolved, but Hōjō/Tokugawa exact Activity relinks, Governance Context creation/reuse, and compressed-row retirement are intentionally not applied to Production.'
  },
  {
    code: 'SENGOKU_TERRITORIAL_AUTHORITY_RESEARCH_PENDING',
    severity: 'HARD',
    count: japan.remaining_sengoku_territorial_or_split_research_rows,
    basis: 'Oda, Uesugi and pre-1590 Hideyoshi authority still require source-backed territorial Polity/interval reconstruction. Clan labels are not accepted as automatic Polities and Japan-wide direct control is not back-projected.'
  },
  {
    code: 'POLITY_STRUCTURAL_RELATION_BACKFILL_RESEARCH',
    severity: 'HARD',
    count: remainingPolityRelationResearchRows,
    basis: 'Four Japan layered-authority model rows are now historically resolved; the remaining model-relevant structural-relation rows still require source-reviewed target/relation work.'
  },
  {
    code: 'TEMPORAL_SUB_YEAR_DATA_CORRECTION_PENDING',
    severity: 'HARD',
    count: temporalCorrectionCases,
    basis: 'The shared temporal schema can represent the reviewed cases, but Production still has Yoshida plus source-fixed Russia-1721 and Portugal-1815 transition cases in year-level form.'
  },
  {
    code: 'NEW_ASSERTION_PROVENANCE_BACKFILL_PENDING',
    severity: 'HARD',
    count: 4,
    basis: 'Normalized provenance joins are designed and rehearsed, but every future Governance/Polity-relation/Designation/Identity-transition assertion must still be inserted with reviewed Source links during historical backfill.'
  },
  {
    code: 'ACTIVITY_SEMANTIC_BACKFILL_AND_ACTIVE_PATH_CUTOVER_PENDING',
    severity: 'HARD',
    count: 1,
    basis: 'Stage 2 Activity semantic identity and database uniqueness are rehearsed, but Production rows are not yet Relation/sub-year complete and planner/transaction/authoring replay/Phase 9 merge paths intentionally remain on the current v1 contract until one coherent cutover is reviewed.'
  }
];

const hardBlockerFamilies = blockerFamilies.filter((b) => b.severity === 'HARD' && b.count > 0);
if (hardBlockerFamilies.length === 0) {
  throw new Error('Stage 2 preflight unexpectedly became Production-migration-ready; explicit reviewed authorization is required before that state can exist');
}

const validated = {
  production_activity_coverage: '346/346',
  direct_relation_review_queue_closed: true,
  relation_taxonomy_extension_required: false,
  governance_model_reconciled: true,
  polity_relation_model_reconciled: true,
  polity_identity_signal_reconciled: true,
  polity_continuity_model_decisions_closed: true,
  unresolved_polity_continuity_model_rows: 0,
  japan_layered_authority_model_decisions_closed: true,
  unresolved_old_japan_layered_authority_model_rows: 0,
  temporal_contract_acceptance_case_proven: true,
  domain_contract_verified_by_prior_ci_step: true,
  fresh_postgresql_schema_rehearsal_verified_by_prior_ci_step: true,
  normalized_provenance_schema_rehearsal_verified_by_prior_ci_step: true,
  stage2_activity_semantic_identity_rehearsed_by_prior_ci_step: true,
  production_active_semantic_path_cutover_performed: false,
  production_mutation_performed: false,
  production_migration_registered: false
};

const canContinueWithoutVercel = [
  'prepare exact UUID-bound Roman/East-Roman, Yuan/Northern-Yuan, Russia-1721 and Portugal-1815 correction manifests without applying them',
  'prepare exact Hōjō/Tokugawa Japan + Governance Context correction manifests without applying them',
  'finish Oda/Uesugi/pre-1590 Hideyoshi territorial-authority research',
  'finish Kublai 1260–1271 Great-Khan authority target research',
  'finish remaining non-Japan Polity structural-relation research',
  'prepare normalized Source links alongside every reviewed new assertion backfill',
  'prepare the versioned Activity planner/transaction/authoring-replay/merge cutover without activating it',
  'continue shared Polity UUID integration design with civilization-map-project'
];

const requiresProductionDeployment = [
  'register/apply additive Production schema migration',
  'execute Production structural corrections or backfills',
  'activate Stage 2 Activity semantic identity across Production write/replay/merge paths',
  'execute R0/R1 correction manifests against Production',
  'perform exact deployed-SHA Production verification'
];

const summary = {
  schema: 'atlas-stage2-preflight-summary/v1',
  status: 'BLOCKED_WITH_KNOWN_WORK',
  production_migration_ready: false,
  reviewed_baseline_relationships: 346,
  reviewed_relation_ready_from_original_66: 14,
  structural_correction_first_from_original_66: 35,
  identity_reconciliation_first_from_original_66: 6,
  historical_research_first_from_original_66: 11,
  unresolved_direct_relation_review: 0,
  continuity_review_rows: 0,
  continuity_correction_rows: continuity.reviewed_continuity_rows,
  continuity_groups_closed: continuity.reviewed_continuity_groups,
  japan_layered_authority_old_relation_rows_resolved: japan.resolved_old_polity_relation_model_rows,
  japan_layered_authority_old_relation_rows_unresolved: 0,
  remaining_sengoku_territorial_or_split_research_rows: japan.remaining_sengoku_territorial_or_split_research_rows,
  polity_relation_model_relevant_rows_raw: polityRelation.model_relevant_rows,
  polity_relation_model_research_rows_remaining: remainingPolityRelationResearchRows,
  sub_year_correction_cases: temporalCorrectionCases,
  provenance_schema_rehearsed: true,
  stage2_activity_semantic_identity_rehearsed: true,
  production_active_semantic_path_cutover_performed: false,
  hard_blocker_family_count: hardBlockerFamilies.length,
  blocker_counts_overlap: true,
  production_mutation_performed: false,
  production_migration_registered: false
};

const payload = {
  schema: 'atlas-stage2-preflight/v1',
  status: summary.status,
  generated_from: expectedSchemas,
  validated,
  summary,
  blocker_families: blockerFamilies,
  can_continue_without_vercel: canContinueWithoutVercel,
  requires_production_deployment: requiresProductionDeployment,
  safety: {
    blocker_counts_are_not_unique_row_counts: true,
    no_generic_relation_backfill_default: true,
    no_placeholder_geometry: true,
    no_production_write: true
  }
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
