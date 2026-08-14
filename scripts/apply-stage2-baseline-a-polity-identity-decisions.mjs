import fs from 'node:fs';

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const ledgerPath = arg('--ledger');
const intakePath = arg('--intake');
const decisionsPath = arg('--decisions', 'stage2/integration/baseline-a-polity-identity-decisions.v1.json');
if (!ledgerPath) throw new Error('missing --ledger');
if (!intakePath) throw new Error('missing --intake');

const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const intake = JSON.parse(fs.readFileSync(intakePath, 'utf8'));
const decisions = JSON.parse(fs.readFileSync(decisionsPath, 'utf8'));

if (ledger?.schema !== 'atlas-stage2-baseline-a-master-ledger/v2') throw new Error('unsupported ledger schema');
if (intake?.schema !== 'atlas-stage2-baseline-a-intake/v2') throw new Error('unsupported Baseline A intake schema');
if (decisions?.schema !== 'atlas-stage2-baseline-a-polity-identity-decisions/v1') throw new Error('unsupported Polity identity decision schema');
if (decisions.status !== 'P4_POLITY_IDENTITY_HANDOFF_PARTIAL_NO_PRODUCTION_MUTATION') throw new Error('unexpected Polity identity decision status');
if (decisions.rules?.production_mutation_authorized !== false || decisions.result?.production_mutation_authorized !== false) throw new Error('P4 Polity identity overlay must remain non-mutating');
if (decisions.baseline?.baseline_digest !== intake.baseline_digest || decisions.baseline?.baseline_digest !== ledger.baseline?.baseline_digest) throw new Error('Polity identity decision Baseline digest mismatch');
if (decisions.baseline?.deployment_sha !== intake.deployment_sha || decisions.baseline?.deployment_sha !== ledger.baseline?.deployment_sha) throw new Error('Polity identity decision deployment SHA mismatch');
if (Number(decisions.baseline?.polity_identity_dependency_total) !== 49) throw new Error('P4 Polity identity dependency total drift');
if (!Array.isArray(decisions.decisions) || decisions.decisions.length !== Number(decisions.result?.decisions_recorded)) throw new Error('P4 Polity identity decision count drift');

const priorApplied = Number(ledger.summary?.p4_polity_identity_decisions_applied || 0);
const priorPending = Number(ledger.summary?.p4_polity_identity_decided_execution_pending || 0);
if (priorPending !== priorApplied) throw new Error(`P4 prior execution handoff drift ${priorPending} != ${priorApplied}`);
if (decisions.batch) {
  if (Number(decisions.batch.applied_before_batch) !== priorApplied) throw new Error(`P4 batch order drift: ledger applied=${priorApplied}, batch expects=${decisions.batch.applied_before_batch}`);
  if (Number(decisions.batch.expected_applied_after_batch) !== priorApplied + decisions.decisions.length) throw new Error('P4 batch expected-applied counter drift');
} else if (priorApplied !== 0) {
  throw new Error('unsequenced first P4 Polity identity batch may only run on a fresh P4 ledger');
}

const activities = intake.activity_rows || [];
const polities = intake.identity_catalogs?.polities || [];
const activityById = new Map(activities.map((row) => [row.activity_id, row]));
const polityById = new Map(polities.map((polity) => [polity.id, polity]));
const ledgerByActivity = new Map(ledger.rows.map((row) => [row.activity_id, row]));
const allowedDispositions = new Set(decisions.allowed_target_dispositions || []);
if (allowedDispositions.size < 8) throw new Error('P4 Polity identity target disposition contract incomplete');

function countBy(getter) {
  return Object.fromEntries([...ledger.rows.reduce((map, row) => {
    const key = getter(row);
    map.set(key, (map.get(key) || 0) + 1);
    return map;
  }, new Map()).entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
}

function executionKind(decision) {
  const splitNeedsNew = Array.isArray(decision.split_targets) && decision.split_targets.some((target) => target?.target_disposition === 'NEW_POLITY_REQUIRED');
  if (decision.target_disposition === 'NEW_POLITY_REQUIRED') return 'POLITY_AUTHORING_PENDING';
  if (decision.target_disposition === 'MERGE_TO_EXISTING_SURVIVOR') return 'POLITY_IDENTITY_RECONCILIATION_PENDING';
  if (splitNeedsNew) return 'POLITY_SPLIT_TARGET_AUTHORING_PENDING';
  if (decision.target_disposition === 'REPLACE_WITH_GOVERNANCE') return 'GOVERNANCE_MIGRATION_PENDING';
  if (decision.target_disposition === 'MIGRATE_TO_PEOPLE') return 'PEOPLE_MIGRATION_PENDING';
  if (decision.target_disposition === 'MIGRATE_TO_EVENT') return 'EVENT_MIGRATION_PENDING';
  if (decision.target_disposition === 'TEMPORAL_DESIGNATION_ONLY') return 'DESIGNATION_AUTHORING_PENDING';
  return 'POLITY_SEMANTIC_CORRECTION_PENDING';
}

const alreadyAppliedDecisionIds = new Set(
  ledger.rows.map((row) => row.audit?.polity_identity_decision?.id).filter(Boolean)
);
const seen = new Set();
let appliedThisBatch = 0;
for (const decision of decisions.decisions) {
  if (!decision?.id || seen.has(decision.id) || alreadyAppliedDecisionIds.has(decision.id)) throw new Error(`invalid, duplicate, or already-applied P4 Polity identity decision id ${decision?.id}`);
  seen.add(decision.id);
  if (!allowedDispositions.has(decision.target_disposition)) throw new Error(`unsupported P4 target disposition ${decision.target_disposition}`);

  const activity = activityById.get(decision.activity_id);
  const ledgerRow = ledgerByActivity.get(decision.activity_id);
  if (!activity || !ledgerRow) throw new Error(`P4 decision Activity missing ${decision.activity_id}`);
  if (activity.person_id !== decision.person_id || ledgerRow.person?.uuid !== decision.person_id) throw new Error(`P4 Person UUID mismatch ${decision.id}`);
  if (activity.person_name_en !== decision.person || ledgerRow.person?.canonical !== decision.person) throw new Error(`P4 Person canonical mismatch ${decision.id}`);
  if (activity.polity_id !== decision.current_polity?.uuid || ledgerRow.polity?.uuid !== decision.current_polity?.uuid) throw new Error(`P4 current Polity UUID mismatch ${decision.id}`);
  if (activity.polity_name_en !== decision.current_polity?.canonical_key || ledgerRow.polity?.canonical !== decision.current_polity?.canonical_key) throw new Error(`P4 current Polity canonical mismatch ${decision.id}`);
  if (!(ledgerRow.audit?.dependencies || []).includes('polity_identity_model')) throw new Error(`P4 decision ${decision.id} does not replace a polity_identity_model blocker`);
  if (ledgerRow.audit?.execution_class !== 'BLOCKED_POLITY_IDENTITY') throw new Error(`P4 decision ${decision.id} expected BLOCKED_POLITY_IDENTITY, got ${ledgerRow.audit?.execution_class}`);
  if (!decision.source_contract || !Array.isArray(decision.required_later_actions) || !Array.isArray(decision.p5_p6_dependencies)) throw new Error(`P4 downstream handoff incomplete ${decision.id}`);

  if (decision.target_polity_uuid) {
    const target = polityById.get(decision.target_polity_uuid);
    if (!target) throw new Error(`P4 target Polity UUID absent from Baseline A ${decision.id}`);
  } else if (decision.target_disposition === 'NEW_POLITY_REQUIRED' && decision.baseline_absence_verified !== true) {
    throw new Error(`P4 NEW_POLITY_REQUIRED missing verified Baseline absence ${decision.id}`);
  }

  const previous = {
    execution_class: ledgerRow.audit.execution_class,
    dependencies: [...ledgerRow.audit.dependencies],
    decision: ledgerRow.audit.decision,
    primary_source: ledgerRow.audit.primary_source
  };
  ledgerRow.audit.dependencies = ledgerRow.audit.dependencies.filter((dep) => dep !== 'polity_identity_model').sort();
  ledgerRow.audit.execution_class = 'P4_POLITY_IDENTITY_DECIDED_EXECUTION_PENDING';
  ledgerRow.audit.pre_polity_identity_decision = previous;
  ledgerRow.audit.polity_identity_decision = {
    id: decision.id,
    batch_id: decisions.batch?.id ?? 'p4_polity_identity_batch_1',
    batch_sequence: Number(decisions.batch?.sequence || 1),
    status: 'P4_IDENTITY_DECIDED_IMPLEMENTATION_PENDING',
    reviewed_decision: decision.reviewed_decision,
    target_disposition: decision.target_disposition,
    target_polity_uuid: decision.target_polity_uuid ?? null,
    target_identity_class: decision.target_identity_class ?? null,
    execution_kind: executionKind(decision),
    source_contract: decision.source_contract,
    required_later_actions: [...decision.required_later_actions],
    p5_p6_dependencies: [...decision.p5_p6_dependencies],
    production_mutation_authorized: false
  };
  if (Array.isArray(decision.split_targets)) ledgerRow.audit.polity_identity_decision.split_targets = decision.split_targets;
  appliedThisBatch += 1;
}

const dependencyCounts = {};
for (const row of ledger.rows) {
  for (const dep of row.audit?.dependencies || []) dependencyCounts[dep] = (dependencyCounts[dep] || 0) + 1;
}
const totalApplied = priorApplied + appliedThisBatch;
const unresolved = Number(decisions.baseline.polity_identity_dependency_total) - totalApplied;
if (unresolved < 0) throw new Error('P4 Polity identity decisions exceed dependency total');
if (Number(dependencyCounts.polity_identity_model || 0) !== unresolved) throw new Error(`P4 Polity identity unresolved count mismatch: dependencies=${dependencyCounts.polity_identity_model || 0}, expected=${unresolved}`);
const executionPending = ledger.rows.filter((row) => row.audit?.polity_identity_decision?.status === 'P4_IDENTITY_DECIDED_IMPLEMENTATION_PENDING').length;
if (executionPending !== totalApplied) throw new Error(`P4 Polity identity execution handoff count drift: ${executionPending} != ${totalApplied}`);

ledger.summary.execution_class_counts = countBy((row) => row.audit.execution_class);
ledger.summary.dependency_counts = Object.fromEntries(Object.entries(dependencyCounts).sort((a, b) => a[0].localeCompare(b[0])));
ledger.summary.p4_polity_identity_dependency_total = Number(decisions.baseline.polity_identity_dependency_total);
ledger.summary.p4_polity_identity_decisions_applied = totalApplied;
ledger.summary.p4_polity_identity_decisions_unresolved = unresolved;
ledger.summary.p4_polity_identity_decided_execution_pending = executionPending;
const generated = ledger.generated_from.polity_identity_decisions;
ledger.generated_from.polity_identity_decisions = Array.isArray(generated)
  ? [...generated, decisionsPath]
  : generated ? [generated, decisionsPath] : [decisionsPath];

fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
console.log(JSON.stringify({
  marker: 'ATLAS_BASELINE_A_POLITY_IDENTITY_DECISIONS_APPLIED',
  baseline_digest: ledger.baseline.baseline_digest,
  ledger_rows: ledger.rows.length,
  batch_id: decisions.batch?.id ?? 'p4_polity_identity_batch_1',
  batch_sequence: Number(decisions.batch?.sequence || 1),
  p4_polity_identity_dependency_total: Number(decisions.baseline.polity_identity_dependency_total),
  decisions_applied_this_batch: appliedThisBatch,
  decisions_applied_total: totalApplied,
  decisions_unresolved: unresolved,
  decided_execution_pending: executionPending,
  production_mutation_authorized: false
}, null, 2));
