import fs from 'node:fs';

const [manifestPath, packagePath] = process.argv.slice(2);
if (!manifestPath || !packagePath) throw new Error('usage: node verify <p5p6-manifest> <authoring-package>');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
if (manifest?.schema !== 'atlas-stage2-baseline-a-p5p6-execution-manifest/v2') throw new Error('P5/P6 manifest v2 required');
if (pkg?.schema !== 'atlas-stage2-p5-polity-authoring-package/v1') throw new Error('unsupported authoring package schema');
if (pkg.status !== 'REVIEWED_AUTHORING_PREP_NO_UUID_NO_PRODUCTION_MUTATION') throw new Error('unexpected authoring package status');
if (pkg.rules?.uuid_is_identity !== true || pkg.rules?.polity_uuid_must_remain_null_until_authoring !== true || pkg.rules?.name_only_binding_forbidden !== true || pkg.rules?.editorial_catalog_label_is_historical_self_designation !== false || pkg.rules?.production_mutation_authorized !== false) throw new Error('authoring safety rule drift');
if (!Array.isArray(pkg.targets) || pkg.targets.length !== 9) throw new Error('expected 9 batch-1 Polity targets');

const expected = new Set([
  'GONGSUN_ZAN_REGIONAL_POLITICAL_ACTOR',
  'SOURCE_BACKED_YI_REGIONAL_POLITY',
  'SOURCE_BACKED_XU_TAO_QIAN_REGIONAL_POLITY',
  'SOURCE_BACKED_YOU_LIU_YU_REGIONAL_POLITY',
  'SOURCE_BACKED_JI_CENTERED_YUAN_SHAO_REGIONAL_POLITY',
  'SOURCE_BACKED_WESTERN_REGIONAL_POLITY',
  'SOURCE_BACKED_JING_REGIONAL_POLITY',
  'YAN_TERRITORIAL_AUTHORITY',
  'XU_TERRITORIAL_AUTHORITY'
]);
const manifestTargets = new Set((manifest.new_polity_targets || []).map((target) => target.identity_class));
const relationDecisionIds = new Set((manifest.polity_relation_decisions || []).map((row) => row.decision?.id));
const seen = new Set();
const labels = new Set();
for (const target of pkg.targets) {
  if (!expected.has(target.identity_class) || seen.has(target.identity_class)) throw new Error(`unexpected/duplicate identity class ${target.identity_class}`);
  seen.add(target.identity_class);
  if (!manifestTargets.has(target.identity_class)) throw new Error(`${target.identity_class}: absent from authoritative P5/P6 manifest`);
  if (target.polity_uuid !== null || target.baseline_absence_verified !== true) throw new Error(`${target.identity_class}: UUID must remain unassigned before P5 authoring`);
  if (target.polity_type !== 'historical_polity' || target.historicity !== 'historical') throw new Error(`${target.identity_class}: Polity type/historicity drift`);
  if (target.locale !== 'en' || target.semantic_name_kind !== 'editorial_catalog_label' || target.historical_name_claim !== false) throw new Error(`${target.identity_class}: editorial label semantics drift`);
  if (!target.proposed_catalog_label || labels.has(target.proposed_catalog_label)) throw new Error(`${target.identity_class}: missing/duplicate catalog label`);
  labels.add(target.proposed_catalog_label);
  if (!target.source_contract || !fs.existsSync(target.source_contract)) throw new Error(`${target.identity_class}: source contract missing`);
  if (!target.relation_decision_id || !relationDecisionIds.has(target.relation_decision_id)) throw new Error(`${target.identity_class}: relation decision linkage missing`);
  if (target.territory_geometry_status !== 'P14_DEFERRED') throw new Error(`${target.identity_class}: geometry must stay deferred`);
}
if (seen.size !== expected.size) throw new Error('batch-1 target set incomplete');
if (Number(manifest.summary?.new_polity_target_count) !== 24) throw new Error('combined P5 new Polity frontier drift');
if (Number(pkg.result?.batch_target_count) !== 9 || Number(pkg.result?.combined_manifest_new_polity_target_count) !== 24 || Number(pkg.result?.remaining_new_polity_targets_after_batch) !== 15 || Number(pkg.result?.uuid_assignments) !== 0 || Number(pkg.result?.historical_official_name_claims) !== 0 || Number(pkg.result?.editorial_catalog_labels) !== 9 || pkg.result?.production_mutation_authorized !== false) throw new Error('batch-1 authoring package summary drift');

console.log(JSON.stringify({
  marker: 'ATLAS_P5_POLITY_AUTHORING_BATCH1_OK',
  prepared_targets: 9,
  total_new_polity_frontier: 24,
  remaining_after_batch: 15,
  uuid_assignments: 0,
  editorial_catalog_labels: 9,
  production_mutation_authorized: false
}, null, 2));
