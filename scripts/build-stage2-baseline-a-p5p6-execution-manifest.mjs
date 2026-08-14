import fs from 'node:fs';
import path from 'node:path';

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}
const ledgerPath = arg('--ledger');
const outPath = arg('--out', 'artifacts/stage2-baseline-a-p5p6-execution-manifest.json');
if (!ledgerPath) throw new Error('missing --ledger');
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
if (ledger?.schema !== 'atlas-stage2-baseline-a-master-ledger/v2' || !Array.isArray(ledger.rows) || ledger.rows.length !== 338) throw new Error('unsupported Baseline A ledger');
if (Number(ledger.summary?.p4_polity_identity_decisions_applied) !== 49 || Number(ledger.summary?.p4_polity_identity_decisions_unresolved) !== 0) throw new Error('P4 identity closure prerequisite failed');
if (Number(ledger.summary?.p3_polity_relation_decisions_applied) !== 14 || Number(ledger.summary?.p3_polity_relation_decisions_unresolved) !== 0) throw new Error('P3 Polity relation closure prerequisite failed');

const p4Rows = ledger.rows.filter((row) => row.audit?.polity_identity_decision?.status === 'P4_IDENTITY_DECIDED_IMPLEMENTATION_PENDING');
const relationRows = ledger.rows.filter((row) => row.audit?.polity_relation_decision?.status === 'P3_POLITY_RELATION_MODEL_DECIDED_IMPLEMENTATION_PENDING');
if (p4Rows.length !== 49 || relationRows.length !== 14) throw new Error(`handoff coverage drift p4=${p4Rows.length} relation=${relationRows.length}`);

const newTargetMap = new Map();
function addNewTarget(identityClass, origin) {
  if (!identityClass) throw new Error('new Polity identity class missing');
  const current = newTargetMap.get(identityClass) || { identity_class: identityClass, target_polity_uuid: null, origins: [] };
  current.origins.push(origin);
  newTargetMap.set(identityClass, current);
}
const existingPolityTargets = [];
const mergeReconciliations = [];
const entityMigrations = [];
const p4NewClasses = new Set();

for (const row of p4Rows) {
  const decision = row.audit.polity_identity_decision;
  if (decision.target_disposition === 'NEW_POLITY_REQUIRED') {
    p4NewClasses.add(decision.target_identity_class);
    addNewTarget(decision.target_identity_class, {source:'P4', activity_id:row.activity_id, decision_id:decision.id, origin:'top_level', source_contract:decision.source_contract});
  }
  if (decision.target_polity_uuid) existingPolityTargets.push({activity_id:row.activity_id, decision_id:decision.id, origin:'top_level', disposition:decision.target_disposition, target_polity_uuid:decision.target_polity_uuid, identity_class:decision.target_identity_class});
  for (const [index, target] of (decision.split_targets || []).entries()) {
    if (target.target_disposition === 'NEW_POLITY_REQUIRED') {
      p4NewClasses.add(target.identity_class);
      addNewTarget(target.identity_class, {source:'P4', activity_id:row.activity_id, decision_id:decision.id, origin:`split_target_${index}`, source_contract:decision.source_contract});
    } else if (target.polity_uuid) {
      existingPolityTargets.push({activity_id:row.activity_id, decision_id:decision.id, origin:`split_target_${index}`, disposition:target.target_disposition, target_polity_uuid:target.polity_uuid, identity_class:target.identity_class ?? null});
    }
  }
  if (decision.target_disposition === 'MERGE_TO_EXISTING_SURVIVOR') mergeReconciliations.push({activity_id:row.activity_id, decision_id:decision.id, current_polity_uuid:row.polity?.uuid ?? null, survivor_polity_uuid:decision.target_polity_uuid, source_contract:decision.source_contract});
  if (['REPLACE_WITH_GOVERNANCE','MIGRATE_TO_EVENT','MIGRATE_TO_PEOPLE'].includes(decision.target_disposition)) entityMigrations.push({activity_id:row.activity_id, decision_id:decision.id, migration_disposition:decision.target_disposition, current_polity_uuid:row.polity?.uuid ?? null, current_polity:row.polity?.canonical ?? null, target_identity_class:decision.target_identity_class, source_contract:decision.source_contract});
}
if (p4NewClasses.size !== 15) throw new Error(`P4 new Polity target drift ${p4NewClasses.size}`);

const relationNewClasses = new Set();
const relationAssertions = [];
for (const row of relationRows) {
  const decision = row.audit.polity_relation_decision;
  for (const target of decision.new_polity_targets || []) {
    if (target.polity_uuid !== null || target.verified_absent_from_baseline_a !== true) throw new Error(`${decision.id}: invalid new Polity target`);
    relationNewClasses.add(target.identity_class);
    addNewTarget(target.identity_class, {source:'P3_POLITY_RELATION', activity_id:row.activity_id, decision_id:decision.id, origin:'relation_decision', source_contract:decision.source_contract});
  }
  for (const assertion of decision.relation_assertions || []) relationAssertions.push({activity_id:row.activity_id, decision_id:decision.id, source_contract:decision.source_contract, ...assertion});
}
const additionalRelationNewClasses = [...relationNewClasses].filter((identityClass) => !p4NewClasses.has(identityClass));
if (relationNewClasses.size !== 11 || additionalRelationNewClasses.length !== 9 || newTargetMap.size !== 24) throw new Error(`combined new Polity frontier drift relation=${relationNewClasses.size} additional=${additionalRelationNewClasses.length} combined=${newTargetMap.size}`);
if (relationAssertions.length !== 10) throw new Error(`reviewed Polity relation assertion drift ${relationAssertions.length}`);

const correctionActivityMap = new Map();
function ensureActivity(row) {
  let entry = correctionActivityMap.get(row.activity_id);
  if (!entry) {
    entry = {activity_id:row.activity_id, person_id:row.person?.uuid ?? null, person:row.person?.canonical ?? null, current_polity_uuid:row.polity?.uuid ?? null, current_polity:row.polity?.canonical ?? null, start_year:row.activity?.start_year ?? null, end_year:row.activity?.end_year ?? null, p4_identity_decision:null, p3_polity_relation_decision:null, p5_p6_dependencies:[], required_later_actions:[]};
    correctionActivityMap.set(row.activity_id, entry);
  }
  return entry;
}
for (const row of p4Rows) {
  const decision = row.audit.polity_identity_decision;
  const entry = ensureActivity(row);
  entry.p4_identity_decision = {id:decision.id, execution_kind:decision.execution_kind, target_disposition:decision.target_disposition, target_polity_uuid:decision.target_polity_uuid ?? null, target_identity_class:decision.target_identity_class, source_contract:decision.source_contract};
  entry.p5_p6_dependencies.push(...(decision.p5_p6_dependencies || []));
  entry.required_later_actions.push(...(decision.required_later_actions || []));
}
for (const row of relationRows) {
  const decision = row.audit.polity_relation_decision;
  if (decision.activity_correction_required !== true) continue;
  const entry = ensureActivity(row);
  entry.p3_polity_relation_decision = {id:decision.id, model_decision:decision.model_decision, source_contract:decision.source_contract, relation_assertion_count:(decision.relation_assertions || []).length, new_polity_target_count:(decision.new_polity_targets || []).length};
  entry.p5_p6_dependencies.push('CORRECTION_V2','NORMALIZED_PROVENANCE');
  if ((decision.new_polity_targets || []).length) entry.p5_p6_dependencies.push('POLITY_AUTHORING');
  if ((decision.relation_assertions || []).length || decision.relation_policy) entry.p5_p6_dependencies.push('POLITY_RELATION_SCHEMA');
  if ((decision.required_later_actions || []).some((action) => action.includes('RELATION_SET'))) entry.p5_p6_dependencies.push('RELATION_TYPE');
  entry.required_later_actions.push(...(decision.required_later_actions || []));
}
for (const entry of correctionActivityMap.values()) {
  entry.p5_p6_dependencies = [...new Set(entry.p5_p6_dependencies)].sort();
  entry.required_later_actions = [...new Set(entry.required_later_actions)];
  if (!entry.p5_p6_dependencies.includes('CORRECTION_V2')) throw new Error(`${entry.activity_id}: Correction v2 dependency missing`);
}
const correctionActivities = [...correctionActivityMap.values()].sort((a,b)=>a.activity_id.localeCompare(b.activity_id));
if (correctionActivities.length !== 57) throw new Error(`Correction v2 Activity frontier drift ${correctionActivities.length}`);
const relationCorrectionRows = relationRows.filter((row) => row.audit.polity_relation_decision.activity_correction_required === true);
const relationP4Overlap = relationCorrectionRows.filter((row) => row.audit.polity_identity_decision?.status === 'P4_IDENTITY_DECIDED_IMPLEMENTATION_PENDING');
if (relationCorrectionRows.length !== 12 || relationP4Overlap.length !== 4) throw new Error(`relation correction overlap drift total=${relationCorrectionRows.length} p4_overlap=${relationP4Overlap.length}`);

const manifest = {
  schema:'atlas-stage2-baseline-a-p5p6-execution-manifest/v2',
  status:'P3_P4_CLOSED_P5_P6_PREPRODUCTION_EXECUTION_PLAN_NO_PRODUCTION_MUTATION',
  derived_from:{ledger_schema:ledger.schema, baseline:ledger.baseline, p3_polity_relation_closed:true, p4_polity_identity_closed:true},
  summary:{
    p4_decided_activity_count:49,
    p4_unresolved_identity_count:0,
    p3_polity_relation_decision_count:14,
    p3_polity_relation_unresolved_count:0,
    p3_reviewed_polity_relation_assertion_count:10,
    p3_polity_relation_activity_correction_count:12,
    p3_polity_relation_p4_overlap_count:4,
    correction_v2_activity_count:57,
    p4_new_polity_target_count:15,
    p3_relation_new_polity_class_count:11,
    additional_p3_relation_new_polity_target_count:9,
    new_polity_target_count:24,
    existing_p4_target_binding_count:existingPolityTargets.length,
    unique_existing_p4_target_polity_uuids:new Set(existingPolityTargets.map((target)=>target.target_polity_uuid)).size,
    merge_reconciliation_count:mergeReconciliations.length,
    entity_migration_count:entityMigrations.length,
    production_mutation_authorized:false
  },
  correction_activities:correctionActivities,
  new_polity_targets:[...newTargetMap.values()].sort((a,b)=>a.identity_class.localeCompare(b.identity_class)),
  existing_p4_polity_targets:existingPolityTargets.sort((a,b)=>a.target_polity_uuid.localeCompare(b.target_polity_uuid)||a.activity_id.localeCompare(b.activity_id)),
  merge_reconciliations:mergeReconciliations.sort((a,b)=>a.activity_id.localeCompare(b.activity_id)),
  entity_migrations:entityMigrations.sort((a,b)=>a.activity_id.localeCompare(b.activity_id)),
  polity_relation_decisions:relationRows.map((row)=>({activity_id:row.activity_id, person:row.person?.canonical ?? null, decision:row.audit.polity_relation_decision})).sort((a,b)=>a.activity_id.localeCompare(b.activity_id)),
  polity_relation_assertions:relationAssertions.sort((a,b)=>a.activity_id.localeCompare(b.activity_id)||a.relation_type.localeCompare(b.relation_type)),
  production_execution_authorized:false
};
if (manifest.summary.existing_p4_target_binding_count !== 46 || manifest.summary.unique_existing_p4_target_polity_uuids !== 26 || manifest.summary.merge_reconciliation_count !== 7 || manifest.summary.entity_migration_count !== 3) throw new Error('P4 execution projection count drift');
fs.mkdirSync(path.dirname(outPath), {recursive:true});
fs.writeFileSync(outPath, `${JSON.stringify(manifest,null,2)}\n`);
console.log(JSON.stringify({marker:'ATLAS_BASELINE_A_P5P6_EXECUTION_MANIFEST_V2_BUILT', ...manifest.summary}, null, 2));
