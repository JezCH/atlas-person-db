import fs from 'node:fs';

const [ledgerPath, intakePath, manifestPath] = process.argv.slice(2);
if (!ledgerPath || !intakePath || !manifestPath) {
  throw new Error('usage: node scripts/verify-stage2-baseline-a-p5p6-execution-manifest.mjs <ledger> <intake> <manifest>');
}

const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const intake = JSON.parse(fs.readFileSync(intakePath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const expectedDigest = 'sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27';
const expectedDeployment = 'ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79';

if (ledger?.schema !== 'atlas-stage2-baseline-a-master-ledger/v2' || intake?.schema !== 'atlas-stage2-baseline-a-intake/v2') throw new Error('unsupported P5/P6 manifest input schema');
if (manifest?.schema !== 'atlas-stage2-baseline-a-p5p6-execution-manifest/v1') throw new Error('unsupported P5/P6 manifest schema');
if (manifest.status !== 'P5_P6_PREPRODUCTION_EXECUTION_PLAN_NO_PRODUCTION_MUTATION') throw new Error('unexpected P5/P6 manifest status');
if (manifest.production_execution_authorized !== false || manifest.summary?.production_mutation_authorized !== false) throw new Error('P5/P6 manifest must not authorize Production execution');
if (ledger.baseline?.baseline_digest !== expectedDigest || intake.baseline_digest !== expectedDigest || manifest.derived_from?.baseline?.baseline_digest !== expectedDigest) throw new Error('P5/P6 Baseline digest drift');
if (ledger.baseline?.deployment_sha !== expectedDeployment || intake.deployment_sha !== expectedDeployment || manifest.derived_from?.baseline?.deployment_sha !== expectedDeployment) throw new Error('P5/P6 deployment SHA drift');
if (Number(ledger.summary?.p4_polity_identity_decisions_applied) !== 49 || Number(ledger.summary?.p4_polity_identity_decisions_unresolved) !== 0) throw new Error('P4 must remain fully closed');
if (Number(ledger.summary?.p4_polity_identity_corrections_applied) !== 1) throw new Error('P4 correction count drift');

const decided = ledger.rows.filter((row) => row.audit?.polity_identity_decision?.status === 'P4_IDENTITY_DECIDED_IMPLEMENTATION_PENDING');
if (decided.length !== 49) throw new Error(`expected 49 P4 decided rows, got ${decided.length}`);
const decidedIds = [...decided.map((row) => row.activity_id)].sort();
const manifestIds = [...(manifest.activities || []).map((row) => row.activity_id)].sort();
if (JSON.stringify(decidedIds) !== JSON.stringify(manifestIds)) throw new Error('P5/P6 manifest Activity coverage drift');
if (new Set(manifestIds).size !== 49) throw new Error('P5/P6 manifest duplicate Activity IDs');

const expectedExecution = {
  GOVERNANCE_MIGRATION_PENDING: 1,
  POLITY_AUTHORING_PENDING: 8,
  POLITY_IDENTITY_RECONCILIATION_PENDING: 7,
  POLITY_SEMANTIC_CORRECTION_PENDING: 28,
  POLITY_SPLIT_TARGET_AUTHORING_PENDING: 5
};
const expectedDisposition = {
  KEEP_DISTINCT: 7,
  MERGE_TO_EXISTING_SURVIVOR: 7,
  MIGRATE_TO_EVENT: 1,
  MIGRATE_TO_PEOPLE: 1,
  NEW_POLITY_REQUIRED: 8,
  REPLACE_WITH_GOVERNANCE: 1,
  REUSE_CURRENT_UUID: 24
};
const expectedDependencies = {
  CORRECTION_V2: 49,
  FULL_TEMPORAL_BOUNDARIES: 7,
  GOVERNANCE_CONTEXT: 3,
  HISTORICAL_EVENT: 3,
  LAYERED_AUTHORITY: 1,
  NORMALIZED_PROVENANCE: 25,
  PEOPLE_GROUP: 4,
  POLITY_AUTHORING: 13,
  POLITY_DESIGNATION_OR_NAME_KIND: 1,
  POLITY_DESIGNATION_OR_STATE_FORM: 17,
  POLITY_RELATION_SCHEMA: 9,
  POLITY_SEMANTIC_NAME_KIND: 9,
  RELATION_TYPE: 12
};
function same(actual, expected, label) {
  const a = JSON.stringify(Object.fromEntries(Object.entries(actual || {}).sort()));
  const e = JSON.stringify(Object.fromEntries(Object.entries(expected).sort()));
  if (a !== e) throw new Error(`${label} drift actual=${a} expected=${e}`);
}
same(manifest.summary?.execution_kind_counts, expectedExecution, 'execution kind counts');
same(manifest.summary?.target_disposition_counts, expectedDisposition, 'target disposition counts');
same(manifest.summary?.downstream_dependency_counts, expectedDependencies, 'downstream dependency counts');

if (Number(manifest.summary?.p4_decided_activity_count) !== 49 ||
    Number(manifest.summary?.p4_unresolved_identity_count) !== 0 ||
    Number(manifest.summary?.p4_corrections_applied) !== 1) throw new Error('P4 closure summary drift in P5/P6 manifest');
if (Number(manifest.summary?.new_polity_target_count) !== 15 ||
    Number(manifest.summary?.unique_new_polity_identity_classes) !== 15) throw new Error('new Polity authoring target count drift');
if (Number(manifest.summary?.existing_polity_target_binding_count) !== 46 ||
    Number(manifest.summary?.unique_existing_target_polity_uuids) !== 26) throw new Error('existing target binding count drift');
if (Number(manifest.summary?.merge_reconciliation_count) !== 7) throw new Error('merge reconciliation count drift');
if (Number(manifest.summary?.entity_migration_count) !== 3) throw new Error('entity migration count drift');
if (Number(manifest.summary?.correction_v2_activity_count) !== 49) throw new Error('Correction v2 coverage drift');

const newTargets = manifest.new_polity_targets || [];
if (newTargets.length !== 15) throw new Error('new Polity target list length drift');
if (newTargets.some((target) => target.target_polity_uuid !== null)) throw new Error('new Polity target must not have a UUID before P5 authoring');
if (new Set(newTargets.map((target) => target.identity_class)).size !== 15) throw new Error('new Polity identity classes must be unique');
if (newTargets.some((target) => target.p4_validation_status !== 'VALIDATED_NEW_IDENTITY_REQUIRED_NO_UUID_ASSIGNED')) throw new Error('new Polity target lacks P4 validation marker');

const polityIds = new Set((intake.identity_catalogs?.polities || []).map((polity) => polity.id));
const existingTargets = manifest.existing_polity_targets || [];
if (existingTargets.length !== 46) throw new Error('existing target binding list length drift');
for (const target of existingTargets) {
  if (!polityIds.has(target.target_polity_uuid)) throw new Error(`existing target UUID absent from Baseline A ${target.target_polity_uuid}`);
}

const migrations = manifest.entity_migrations || [];
const migrationKinds = [...migrations.map((row) => row.migration_disposition)].sort();
if (JSON.stringify(migrationKinds) !== JSON.stringify(['MIGRATE_TO_EVENT','MIGRATE_TO_PEOPLE','REPLACE_WITH_GOVERNANCE'].sort())) throw new Error('entity migration set drift');

for (const activity of manifest.activities || []) {
  if (!Array.isArray(activity.p5_p6_dependencies) || !activity.p5_p6_dependencies.includes('CORRECTION_V2')) throw new Error(`Activity missing Correction v2 dependency ${activity.activity_id}`);
  if (!Array.isArray(activity.required_later_actions) || activity.required_later_actions.length === 0) throw new Error(`Activity missing downstream actions ${activity.activity_id}`);
}

console.log(JSON.stringify({
  marker: 'ATLAS_BASELINE_A_P5P6_EXECUTION_MANIFEST_OK',
  baseline_digest: expectedDigest,
  p4_decided_activities: 49,
  p4_unresolved_identity: 0,
  new_polity_targets: 15,
  existing_target_bindings: 46,
  unique_existing_target_polities: 26,
  merge_reconciliations: 7,
  entity_migrations: 3,
  correction_v2_activities: 49,
  production_mutation_authorized: false
}, null, 2));
