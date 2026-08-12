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
if (ledger?.schema !== 'atlas-stage2-baseline-a-master-ledger/v2') throw new Error('unsupported ledger schema');
if (!Array.isArray(ledger.rows) || ledger.rows.length !== 338) throw new Error('Baseline A ledger row count drift');
if (Number(ledger.summary?.p4_polity_identity_dependency_total) !== 49 ||
    Number(ledger.summary?.p4_polity_identity_decisions_applied) !== 49 ||
    Number(ledger.summary?.p4_polity_identity_decisions_unresolved) !== 0 ||
    Number(ledger.summary?.p4_polity_identity_decided_execution_pending) !== 49) {
  throw new Error('P4 Polity identity must be fully closed before P5/P6 execution manifest generation');
}

const rows = ledger.rows
  .filter((row) => row.audit?.polity_identity_decision?.status === 'P4_IDENTITY_DECIDED_IMPLEMENTATION_PENDING')
  .sort((a, b) => String(a.activity_id).localeCompare(String(b.activity_id)));
if (rows.length !== 49) throw new Error(`expected 49 P4 decided rows, got ${rows.length}`);
if (new Set(rows.map((row) => row.activity_id)).size !== 49) throw new Error('duplicate Activity in P4 decided rows');

const executionKindCounts = {};
const targetDispositionCounts = {};
const downstreamDependencyCounts = {};
const activities = [];
const newPolityTargets = [];
const existingPolityTargets = [];
const mergeReconciliations = [];
const entityMigrations = [];

function inc(map, key) {
  map[key] = (map[key] || 0) + 1;
}

for (const row of rows) {
  const decision = row.audit.polity_identity_decision;
  inc(executionKindCounts, decision.execution_kind);
  inc(targetDispositionCounts, decision.target_disposition);
  for (const dep of decision.p5_p6_dependencies || []) inc(downstreamDependencyCounts, dep);

  activities.push({
    activity_id: row.activity_id,
    person_id: row.person?.uuid ?? null,
    person: row.person?.canonical ?? null,
    current_polity_uuid: row.polity?.uuid ?? null,
    current_polity: row.polity?.canonical ?? null,
    start_year: row.activity?.start_year ?? null,
    end_year: row.activity?.end_year ?? null,
    decision_id: decision.id,
    correction_id: decision.correction_id ?? null,
    execution_kind: decision.execution_kind,
    target_disposition: decision.target_disposition,
    target_polity_uuid: decision.target_polity_uuid ?? null,
    target_identity_class: decision.target_identity_class ?? null,
    source_contract: decision.source_contract,
    required_later_actions: [...(decision.required_later_actions || [])],
    p5_p6_dependencies: [...(decision.p5_p6_dependencies || [])].sort(),
    split_targets: decision.split_targets ?? []
  });

  if (decision.target_disposition === 'NEW_POLITY_REQUIRED') {
    newPolityTargets.push({
      activity_id: row.activity_id,
      decision_id: decision.id,
      origin: 'top_level',
      identity_class: decision.target_identity_class,
      relation: null,
      target_polity_uuid: null,
      p4_validation_status: 'VALIDATED_NEW_IDENTITY_REQUIRED_NO_UUID_ASSIGNED',
      source_contract: decision.source_contract
    });
  }
  if (decision.target_polity_uuid) {
    existingPolityTargets.push({
      activity_id: row.activity_id,
      decision_id: decision.id,
      origin: 'top_level',
      disposition: decision.target_disposition,
      target_polity_uuid: decision.target_polity_uuid,
      identity_class: decision.target_identity_class,
      relation: null
    });
  }

  for (const [index, target] of (decision.split_targets || []).entries()) {
    if (target.target_disposition === 'NEW_POLITY_REQUIRED') {
      newPolityTargets.push({
        activity_id: row.activity_id,
        decision_id: decision.id,
        origin: `split_target_${index}`,
        identity_class: target.identity_class,
        relation: target.relation ?? null,
        target_polity_uuid: null,
        p4_validation_status: 'VALIDATED_NEW_IDENTITY_REQUIRED_NO_UUID_ASSIGNED',
        source_contract: decision.source_contract
      });
    } else if (target.polity_uuid) {
      existingPolityTargets.push({
        activity_id: row.activity_id,
        decision_id: decision.id,
        origin: `split_target_${index}`,
        disposition: target.target_disposition,
        target_polity_uuid: target.polity_uuid,
        identity_class: target.identity_class ?? null,
        relation: target.relation ?? null
      });
    }
  }

  if (decision.target_disposition === 'MERGE_TO_EXISTING_SURVIVOR') {
    mergeReconciliations.push({
      activity_id: row.activity_id,
      decision_id: decision.id,
      current_polity_uuid: row.polity?.uuid ?? null,
      survivor_polity_uuid: decision.target_polity_uuid,
      source_contract: decision.source_contract
    });
  }

  if (['REPLACE_WITH_GOVERNANCE', 'MIGRATE_TO_EVENT', 'MIGRATE_TO_PEOPLE'].includes(decision.target_disposition)) {
    entityMigrations.push({
      activity_id: row.activity_id,
      decision_id: decision.id,
      migration_disposition: decision.target_disposition,
      current_polity_uuid: row.polity?.uuid ?? null,
      current_polity: row.polity?.canonical ?? null,
      target_identity_class: decision.target_identity_class,
      source_contract: decision.source_contract
    });
  }
}

newPolityTargets.sort((a, b) => a.identity_class.localeCompare(b.identity_class) || a.activity_id.localeCompare(b.activity_id));
existingPolityTargets.sort((a, b) => a.target_polity_uuid.localeCompare(b.target_polity_uuid) || a.activity_id.localeCompare(b.activity_id) || a.origin.localeCompare(b.origin));
mergeReconciliations.sort((a, b) => a.activity_id.localeCompare(b.activity_id));
entityMigrations.sort((a, b) => a.activity_id.localeCompare(b.activity_id));

const uniqueNewIdentityClasses = new Set(newPolityTargets.map((target) => target.identity_class));
if (newPolityTargets.some((target) => target.target_polity_uuid !== null)) throw new Error('P5 new Polity target received a fabricated UUID');
if (uniqueNewIdentityClasses.size !== newPolityTargets.length) throw new Error('new Polity authoring targets contain duplicate identity classes');

const summary = {
  p4_decided_activity_count: rows.length,
  p4_unresolved_identity_count: 0,
  p4_corrections_applied: Number(ledger.summary?.p4_polity_identity_corrections_applied || 0),
  execution_kind_counts: Object.fromEntries(Object.entries(executionKindCounts).sort()),
  target_disposition_counts: Object.fromEntries(Object.entries(targetDispositionCounts).sort()),
  downstream_dependency_counts: Object.fromEntries(Object.entries(downstreamDependencyCounts).sort()),
  new_polity_target_count: newPolityTargets.length,
  unique_new_polity_identity_classes: uniqueNewIdentityClasses.size,
  existing_polity_target_binding_count: existingPolityTargets.length,
  unique_existing_target_polity_uuids: new Set(existingPolityTargets.map((target) => target.target_polity_uuid)).size,
  merge_reconciliation_count: mergeReconciliations.length,
  entity_migration_count: entityMigrations.length,
  correction_v2_activity_count: downstreamDependencyCounts.CORRECTION_V2 || 0,
  production_mutation_authorized: false
};

const manifest = {
  schema: 'atlas-stage2-baseline-a-p5p6-execution-manifest/v1',
  status: 'P5_P6_PREPRODUCTION_EXECUTION_PLAN_NO_PRODUCTION_MUTATION',
  derived_from: {
    ledger_schema: ledger.schema,
    baseline: ledger.baseline,
    p4_polity_identity_closed: true
  },
  summary,
  activities,
  new_polity_targets: newPolityTargets,
  existing_polity_targets: existingPolityTargets,
  merge_reconciliations: mergeReconciliations,
  entity_migrations: entityMigrations,
  production_execution_authorized: false
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({
  marker: 'ATLAS_BASELINE_A_P5P6_EXECUTION_MANIFEST_BUILT',
  ...summary
}, null, 2));
