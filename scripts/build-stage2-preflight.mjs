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
  kublai: arg('--kublai-summary'),
  modern: arg('--modern-summary'),
  regional: arg('--regional-summary'),
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
const kublai = readJson(inputs.kublai);
const modern = readJson(inputs.modern);
const regional = readJson(inputs.regional);
const temporal = readJson(inputs.temporal);

const allInputs = { master, relation, readiness, direct, governance, polityRelation, polityIdentity, continuity, japan, kublai, modern, regional, temporal };
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
  kublai: 'atlas-kublai-authority-decisions-summary/v1',
  modern: 'atlas-modern-dependent-polity-decisions-summary/v1',
  regional: 'atlas-regional-authority-decisions-summary/v1',
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
requireEq(kublai.reviewed_kublai_rows, 3, 'reviewed Kublai authority rows');
requireEq(kublai.retained_rows, 2, 'retained Kublai rows');
requireEq(kublai.retire_competing_rows, 1, 'retired competing Kublai rows');
requireEq(kublai.unresolved_person_polity_authority_semantics_rows, 0, 'unresolved Kublai Person-Polity authority rows');
requireEq(kublai.mongol_empire_relation, 'claims_rule', 'Kublai Mongol Empire relation');
requireEq(kublai.yuan_1271_relation, 'rules', 'Kublai Yuan relation');
requireEq(kublai.fabricated_pre_yuan_polity_created, false, 'fabricated pre-Yuan Polity');
requireEq(modern.reviewed_current_activity_rows, 4, 'reviewed modern dependent/union Activity rows');
requireEq(modern.reviewed_structural_relation_signal_rows, 4, 'modern structural-relation signal rows');
requireEq(modern.resolved_structural_relation_model_rows, 4, 'resolved modern structural-relation rows');
requireEq(modern.unresolved_structural_relation_model_rows_in_this_cluster, 0, 'unresolved modern structural-relation rows');
requireEq(modern.gandhi_replacement_phase_count, 3, 'Gandhi replacement phases');
requireEq(modern.lenin_simultaneous_constituent_and_union_offices_supported, true, 'Lenin simultaneous constituent/union offices');
requireEq(modern.newly_identified_exact_temporal_correction_groups, 2, 'modern exact temporal correction groups');
requireEq(modern.new_polity_identity_required, false, 'modern new Polity identity requirement');
requireEq(regional.reviewed_remaining_structural_signal_rows, 10, 'reviewed remaining regional structural rows');
requireEq(regional.historical_model_classified_rows, 10, 'regional model-classified rows');
requireEq(regional.unresolved_structural_relation_model_classification_rows, 0, 'unresolved regional model classification rows');
requireEq(regional.source_named_dependent_kingdom_rows, 1, 'source-named dependent kingdom rows');
requireEq(regional.central_polity_no_new_regional_polity_rows, 3, 'central-parent Polity rows');
requireEq(regional.regional_authority_target_or_phase_research_rows, 6, 'regional authority target/phase research rows');
requireEq(regional.nominal_subordination_candidate_rows, 6, 'nominal-subordination candidate rows');
requireEq(regional.new_polity_relation_code_justified, 'nominally_subordinate_to', 'new Polity relation code');
requireEq(regional.new_polity_relation_code_count, 1, 'new Polity relation code count');
requireEq(regional.fabricated_regional_polity_names_created, false, 'fabricated regional Polity names');
requireEq(temporal.explicit_sub_year_blockers, 1, 'legacy explicit sub-year blockers');
requireEq(temporal.reviewed_split_intervals, 2, 'reviewed Yoshida replacement intervals');

if (stage2DomainContract.production_migration_authorized !== false) {
  throw new Error('Stage 2 domain contract unexpectedly authorizes Production migration');
}

const temporalCorrectionCases = temporal.explicit_sub_year_blockers
  + continuity.newly_identified_exact_transition_cases
  + modern.newly_identified_exact_temporal_correction_groups;
const structurallyClassifiedRows = japan.resolved_old_polity_relation_model_rows
  + modern.resolved_structural_relation_model_rows
  + regional.historical_model_classified_rows;
const structuralModelClassificationRemaining = polityRelation.model_relevant_rows - structurallyClassifiedRows;
const pendingStructuralRelationAssertions = modern.structural_relation_types.length
  + regional.source_named_dependent_kingdom_rows
  + regional.nominal_subordination_candidate_rows;

requireEq(structurallyClassifiedRows, 18, 'classified structural-model rows');
requireEq(structuralModelClassificationRemaining, 0, 'remaining structural-model classification rows');
requireEq(pendingStructuralRelationAssertions, 10, 'pending structural relation assertion/interval groups');
requireEq(temporalCorrectionCases, 5, 'exact/sub-year correction groups');

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
    basis: 'Roman/East-Roman, Yuan/Northern-Yuan, Russia-1721 and Portugal-1815 continuity models are source-backed and machine-checked, but exact UUID corrections remain non-Production.'
  },
  {
    code: 'JAPAN_LAYERED_AUTHORITY_CORRECTIONS_PENDING',
    severity: 'HARD',
    count: japan.resolved_old_polity_relation_model_rows,
    basis: 'Kamakura/Tokugawa layered-authority semantics are resolved, but exact Activity relinks, Governance Context writes and compressed-row retirement remain non-Production.'
  },
  {
    code: 'KUBLAI_ACTIVITY_CORRECTIONS_PENDING',
    severity: 'HARD',
    count: kublai.reviewed_kublai_rows,
    basis: 'Kublai authority semantics are source-backed, but exact claims_rule/retire/rules correction and backfill remain non-Production.'
  },
  {
    code: 'MODERN_DEPENDENT_POLITY_CORRECTIONS_PENDING',
    severity: 'HARD',
    count: modern.reviewed_current_activity_rows,
    basis: 'Canada, British Raj and Soviet union/constituent models plus Laurier/Gandhi/Lenin corrections are source-backed, but exact UUID-bound correction/backfill remains non-Production.'
  },
  {
    code: 'HUAINAN_DEPENDENT_KINGDOM_CORRECTION_PENDING',
    severity: 'HARD',
    count: regional.source_named_dependent_kingdom_rows,
    basis: 'Ying Bu must be relinked from Western Han to the source-named Kingdom of Huainan with Huainan vassal_of Western Han; exact identity reuse/creation and source-linked write remain pending.'
  },
  {
    code: 'CENTRAL_POLITY_REGIONAL_OFFICE_ACTIVITY_CORRECTIONS_PENDING',
    severity: 'HARD',
    count: regional.central_polity_no_new_regional_polity_rows,
    basis: 'Tao Qian, Liu Yu and Bolad Temur do not justify automatic new Polities, but their current coarse Person relation/role phases still require correction.'
  },
  {
    code: 'REGIONAL_AUTHORITY_TARGET_AND_PHASE_RESEARCH_PENDING',
    severity: 'HARD',
    count: regional.regional_authority_target_or_phase_research_rows,
    basis: 'Liu Yan, Yuan Shao, Ma Teng, Liu Biao, Lü Bu and Fang Guozhen require source-backed regional authority identities, phase boundaries and Territory research before exact Polity writes.'
  },
  {
    code: 'SENGOKU_TERRITORIAL_AUTHORITY_RESEARCH_PENDING',
    severity: 'HARD',
    count: japan.remaining_sengoku_territorial_or_split_research_rows,
    basis: 'Oda, Uesugi and pre-1590 Hideyoshi authority still require source-backed territorial Polity/interval reconstruction; clan labels and blanket Japan direct control remain prohibited.'
  },
  {
    code: 'POLITY_RELATION_ASSERTION_INTERVAL_AND_BACKFILL_PENDING',
    severity: 'HARD',
    count: pendingStructuralRelationAssertions,
    basis: 'All 18 structural-model rows are now classified, but ten reviewed structural relation assertion/interval groups still require exact source-backed intervals, target UUIDs and normalized provenance before Production backfill.'
  },
  {
    code: 'TEMPORAL_SUB_YEAR_DATA_CORRECTION_PENDING',
    severity: 'HARD',
    count: temporalCorrectionCases,
    basis: 'The shared temporal schema can represent the reviewed cases, but Production still has exact/sub-year correction groups for Yoshida, Russia-1721, Portugal-1815, Gandhi and Lenin.'
  },
  {
    code: 'NEW_ASSERTION_PROVENANCE_BACKFILL_PENDING',
    severity: 'HARD',
    count: 4,
    basis: 'Normalized provenance joins are designed and rehearsed, but future Governance/Polity-relation/Designation/Identity-transition assertions must be inserted with reviewed Source links.'
  },
  {
    code: 'ACTIVITY_SEMANTIC_BACKFILL_AND_ACTIVE_PATH_CUTOVER_PENDING',
    severity: 'HARD',
    count: 1,
    basis: 'Stage 2 Activity semantic identity is rehearsed, but Production rows and planner/transaction/authoring replay/Phase 9 merge paths intentionally remain on v1 until one coherent cutover is reviewed.'
  }
];

const hardBlockerFamilies = blockerFamilies.filter((b) => b.severity === 'HARD' && b.count > 0);
if (hardBlockerFamilies.length === 0) {
  throw new Error('Stage 2 preflight unexpectedly became Production-migration-ready; explicit reviewed authorization is required before that state can exist');
}

const validated = {
  production_activity_coverage: '346/346',
  direct_relation_review_queue_closed: true,
  person_relation_taxonomy_extension_required: false,
  polity_relation_taxonomy_extension_count: regional.new_polity_relation_code_count,
  polity_relation_nominal_subordination_reviewed: regional.new_polity_relation_code_justified === 'nominally_subordinate_to',
  governance_model_reconciled: true,
  polity_relation_model_reconciled: true,
  polity_relation_model_classification_remaining: structuralModelClassificationRemaining,
  polity_identity_signal_reconciled: true,
  polity_continuity_model_decisions_closed: true,
  unresolved_polity_continuity_model_rows: 0,
  japan_layered_authority_model_decisions_closed: true,
  unresolved_old_japan_layered_authority_model_rows: 0,
  kublai_person_polity_authority_semantics_closed: true,
  unresolved_kublai_person_polity_authority_semantics_rows: 0,
  kublai_pre_1271_direct_territory_research_still_required: kublai.pre_1271_direct_territory_reconstruction_still_required,
  modern_dependent_union_polity_models_closed: true,
  unresolved_modern_structural_relation_model_rows: 0,
  regional_authority_structural_models_classified: true,
  unresolved_regional_structural_relation_model_rows: 0,
  no_fabricated_regional_polity_names: true,
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
  'prepare exact UUID-bound correction manifests for all already source-closed Activity decisions without applying them',
  'resolve/reuse or prepare source-backed Kingdom of Huainan identity and vassal relation',
  'research Liu Yan, Yuan Shao, Ma Teng, Liu Biao, Lü Bu and Fang Guozhen exact regional-authority identities and phases',
  'research the six nominally_subordinate_to intervals and the remaining reviewed structural-relation intervals',
  'research Qubilai pre-1271 direct territorial extent without fabricating a Person-owned polygon',
  'finish Oda/Uesugi/pre-1590 Hideyoshi territorial-authority research',
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
  kublai_authority_rows_reviewed: kublai.reviewed_kublai_rows,
  kublai_authority_semantics_unresolved_rows: 0,
  kublai_pre_1271_direct_territory_research_pending: kublai.pre_1271_direct_territory_reconstruction_still_required,
  modern_structural_relation_rows_resolved: modern.resolved_structural_relation_model_rows,
  modern_structural_relation_rows_unresolved: modern.unresolved_structural_relation_model_rows_in_this_cluster,
  regional_structural_relation_rows_classified: regional.historical_model_classified_rows,
  regional_structural_relation_model_rows_unresolved: regional.unresolved_structural_relation_model_classification_rows,
  regional_authority_target_or_phase_research_rows: regional.regional_authority_target_or_phase_research_rows,
  source_named_dependent_kingdom_rows: regional.source_named_dependent_kingdom_rows,
  central_polity_no_new_regional_polity_rows: regional.central_polity_no_new_regional_polity_rows,
  nominal_subordination_candidate_rows: regional.nominal_subordination_candidate_rows,
  polity_relation_model_relevant_rows_raw: polityRelation.model_relevant_rows,
  polity_relation_model_classified_rows: structurallyClassifiedRows,
  polity_relation_model_classification_remaining: structuralModelClassificationRemaining,
  pending_structural_relation_assertion_interval_groups: pendingStructuralRelationAssertions,
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
