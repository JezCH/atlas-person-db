import fs from 'node:fs';

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const ledgerPath = arg('--ledger');
const intakePath = arg('--intake');
const outPath = arg('--out');
const summaryPath = arg('--summary');
if (!ledgerPath || !intakePath || !outPath || !summaryPath) {
  throw new Error('usage: node scripts/build-stage2-p5-p6-execution-handoff.mjs --ledger <ledger> --intake <intake> --out <handoff> --summary <summary>');
}

const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const intake = JSON.parse(fs.readFileSync(intakePath, 'utf8'));
const expectedDigest = 'sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27';
const expectedDeployment = 'ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79';

if (ledger?.schema !== 'atlas-stage2-baseline-a-master-ledger/v2') throw new Error('unsupported Baseline A ledger schema');
if (intake?.schema !== 'atlas-stage2-baseline-a-intake/v2') throw new Error('unsupported Baseline A intake schema');
if (ledger.baseline?.baseline_digest !== expectedDigest || intake.baseline_digest !== expectedDigest) throw new Error('Baseline A digest drift');
if (ledger.baseline?.deployment_sha !== expectedDeployment || intake.deployment_sha !== expectedDeployment) throw new Error('Baseline A deployment SHA drift');
if (Number(ledger.summary?.p4_polity_identity_dependency_total) !== 49) throw new Error('P4 identity dependency total drift');
if (Number(ledger.summary?.p4_polity_identity_decisions_applied) !== 49) throw new Error('P4 identity closure not complete');
if (Number(ledger.summary?.p4_polity_identity_decisions_unresolved) !== 0) throw new Error('P4 identity unresolved work remains');
if (Number(ledger.summary?.p4_polity_identity_decided_execution_pending) !== 49) throw new Error('P4 execution handoff count drift');

const polityIds = new Set((intake.identity_catalogs?.polities || []).map((row) => row.id));
const entries = [];
const decisionIds = new Set();
const activityIds = new Set();

for (const row of ledger.rows || []) {
  const decision = row.audit?.polity_identity_decision;
  if (!decision) continue;
  if (decision.status !== 'P4_IDENTITY_DECIDED_IMPLEMENTATION_PENDING') throw new Error(`${row.activity_id}: unexpected P4 handoff status`);
  if (decision.production_mutation_authorized !== false) throw new Error(`${row.activity_id}: P4 decision must remain non-mutating`);
  if ((row.audit?.dependencies || []).includes('polity_identity_model')) throw new Error(`${row.activity_id}: closed P4 row still has polity_identity_model dependency`);
  if (!decision.id || decisionIds.has(decision.id)) throw new Error(`${row.activity_id}: duplicate/missing decision id`);
  if (!row.activity_id || activityIds.has(row.activity_id)) throw new Error(`${row.activity_id}: duplicate/missing Activity id`);
  decisionIds.add(decision.id);
  activityIds.add(row.activity_id);

  if (decision.target_polity_uuid !== null && decision.target_polity_uuid !== undefined && !polityIds.has(decision.target_polity_uuid)) {
    throw new Error(`${decision.id}: target Polity UUID absent from Baseline A`);
  }
  for (const [index, target] of (decision.split_targets || []).entries()) {
    if (target.target_disposition === 'NEW_POLITY_REQUIRED') {
      if (target.polity_uuid !== null || target.baseline_absence_verified !== true) throw new Error(`${decision.id}.split_targets[${index}]: invalid new-Polity handoff`);
    } else if (target.polity_uuid && !polityIds.has(target.polity_uuid)) {
      throw new Error(`${decision.id}.split_targets[${index}]: target UUID absent from Baseline A`);
    }
  }
  if (decision.target_disposition === 'NEW_POLITY_REQUIRED' && decision.target_polity_uuid !== null) {
    throw new Error(`${decision.id}: new Polity target must keep UUID null`);
  }
  if (!Array.isArray(decision.p5_p6_dependencies) || !decision.p5_p6_dependencies.includes('CORRECTION_V2')) {
    throw new Error(`${decision.id}: every P4 execution handoff must require Correction v2`);
  }
  if (!Array.isArray(decision.required_later_actions) || decision.required_later_actions.length === 0) {
    throw new Error(`${decision.id}: missing downstream actions`);
  }

  const newTargets = [];
  if (decision.target_disposition === 'NEW_POLITY_REQUIRED') {
    newTargets.push({ identity_class: decision.target_identity_class, source: 'primary_target' });
  }
  for (const target of decision.split_targets || []) {
    if (target.target_disposition === 'NEW_POLITY_REQUIRED') newTargets.push({ identity_class: target.identity_class, source: 'split_target' });
  }

  entries.push({
    activity_id: row.activity_id,
    person: { uuid: row.person?.uuid ?? null, canonical: row.person?.canonical ?? null },
    current_polity: { uuid: row.polity?.uuid ?? null, canonical: row.polity?.canonical ?? null },
    p4_decision: {
      id: decision.id,
      batch_id: decision.batch_id,
      batch_sequence: decision.batch_sequence,
      reviewed_decision: decision.reviewed_decision,
      target_disposition: decision.target_disposition,
      target_polity_uuid: decision.target_polity_uuid ?? null,
      target_identity_class: decision.target_identity_class,
      execution_kind: decision.execution_kind,
      correction_id: decision.correction_id ?? null,
      split_targets: decision.split_targets || []
    },
    schema_prerequisites: [...new Set(decision.p5_p6_dependencies)].sort(),
    correction_actions: [...decision.required_later_actions],
    residual_ledger_dependencies: [...(row.audit?.dependencies || [])].sort(),
    new_polity_targets: newTargets,
    source_contract: decision.source_contract,
    execution_boundary: {
      branch_only_preparation: true,
      production_mutation_authorized: false,
      p5_schema_required_before_execution: true,
      correction_v2_required_before_execution: true
    }
  });
}

entries.sort((a, b) => a.activity_id.localeCompare(b.activity_id));
if (entries.length !== 49) throw new Error(`P4 execution handoff must contain 49 rows, got ${entries.length}`);

function countBy(values) {
  const counts = {};
  for (const value of values) counts[value] = (counts[value] || 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0])));
}

const executionKindCounts = countBy(entries.map((entry) => entry.p4_decision.execution_kind));
const targetDispositionCounts = countBy(entries.map((entry) => entry.p4_decision.target_disposition));
const schemaPrerequisiteCounts = countBy(entries.flatMap((entry) => entry.schema_prerequisites));
const residualDependencyCounts = countBy(entries.flatMap((entry) => entry.residual_ledger_dependencies));
const newPolityActivityRows = entries.filter((entry) => entry.new_polity_targets.length > 0).length;
const newPolityTargetCount = entries.reduce((sum, entry) => sum + entry.new_polity_targets.length, 0);
const splitActivityRows = entries.filter((entry) => entry.p4_decision.split_targets.length > 0).length;
const splitTargetCount = entries.reduce((sum, entry) => sum + entry.p4_decision.split_targets.length, 0);

const summary = {
  schema: 'atlas-stage2-p5-p6-execution-handoff-summary/v1',
  baseline_digest: expectedDigest,
  deployment_sha: expectedDeployment,
  p4_identity_decisions_closed: entries.length,
  p4_identity_decisions_unresolved: 0,
  p4_execution_pending: entries.length,
  execution_kind_counts: executionKindCounts,
  target_disposition_counts: targetDispositionCounts,
  schema_prerequisite_counts: schemaPrerequisiteCounts,
  residual_dependency_counts_for_p4_rows: residualDependencyCounts,
  new_polity_activity_rows: newPolityActivityRows,
  new_polity_targets: newPolityTargetCount,
  split_activity_rows: splitActivityRows,
  split_targets: splitTargetCount,
  correction_v2_required_rows: schemaPrerequisiteCounts.CORRECTION_V2 || 0,
  production_mutation_authorized: false
};

const handoff = {
  schema: 'atlas-stage2-p5-p6-execution-handoff/v1',
  as_of: '2026-08-13',
  status: 'P4_CLOSED_P5_P6_BRANCH_ONLY_EXECUTION_PREP',
  baseline: {
    deployment_sha: expectedDeployment,
    baseline_digest: expectedDigest,
    activity_count: Number(intake.row_count)
  },
  invariants: {
    p4_polity_identity_closed: true,
    p4_person_identity_closed: Number(ledger.summary?.person_identity_decisions_unresolved || 0) === 0,
    person_physical_merge_performed: false,
    new_polity_uuid_must_be_authored_not_invented: true,
    correction_v2_required_for_all_p4_execution_rows: true,
    p5_is_additive_before_p9_cutover: true,
    production_mutation_authorized: false
  },
  summary,
  entries
};

fs.writeFileSync(outPath, `${JSON.stringify(handoff, null, 2)}\n`);
fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify({ marker: 'ATLAS_P5_P6_EXECUTION_HANDOFF_BUILT', ...summary }, null, 2));
