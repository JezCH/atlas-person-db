import fs from 'node:fs';

const [ledgerPath, intakePath, handoffPath, summaryPath] = process.argv.slice(2);
if (!ledgerPath || !intakePath || !handoffPath || !summaryPath) {
  throw new Error('usage: node scripts/verify-stage2-p5-p6-execution-handoff.mjs <ledger> <intake> <handoff> <summary>');
}
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const intake = JSON.parse(fs.readFileSync(intakePath, 'utf8'));
const handoff = JSON.parse(fs.readFileSync(handoffPath, 'utf8'));
const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
const expectedDigest = 'sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27';
const expectedDeployment = 'ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79';

if (handoff.schema !== 'atlas-stage2-p5-p6-execution-handoff/v1') throw new Error('handoff schema drift');
if (summary.schema !== 'atlas-stage2-p5-p6-execution-handoff-summary/v1') throw new Error('handoff summary schema drift');
if (handoff.status !== 'P4_CLOSED_P5_P6_BRANCH_ONLY_EXECUTION_PREP') throw new Error('handoff status drift');
if (handoff.baseline?.baseline_digest !== expectedDigest || summary.baseline_digest !== expectedDigest || ledger.baseline?.baseline_digest !== expectedDigest || intake.baseline_digest !== expectedDigest) throw new Error('Baseline A digest drift');
if (handoff.baseline?.deployment_sha !== expectedDeployment || summary.deployment_sha !== expectedDeployment || ledger.baseline?.deployment_sha !== expectedDeployment || intake.deployment_sha !== expectedDeployment) throw new Error('Baseline A deployment SHA drift');
if (Number(ledger.summary?.p4_polity_identity_decisions_applied) !== 49 || Number(ledger.summary?.p4_polity_identity_decisions_unresolved) !== 0) throw new Error('P4 closure prerequisite failed');
if (handoff.invariants?.p4_polity_identity_closed !== true || handoff.invariants?.p4_person_identity_closed !== true) throw new Error('identity closure invariants missing');
if (handoff.invariants?.person_physical_merge_performed !== false || handoff.invariants?.production_mutation_authorized !== false) throw new Error('destructive or Production mutation boundary drift');
if (handoff.invariants?.new_polity_uuid_must_be_authored_not_invented !== true || handoff.invariants?.correction_v2_required_for_all_p4_execution_rows !== true || handoff.invariants?.p5_is_additive_before_p9_cutover !== true) throw new Error('P5/P6 safety invariant drift');
if (!Array.isArray(handoff.entries) || handoff.entries.length !== 49) throw new Error('handoff must contain 49 entries');

const ledgerByActivity = new Map((ledger.rows || []).filter((row) => row.audit?.polity_identity_decision).map((row) => [row.activity_id, row]));
const polityIds = new Set((intake.identity_catalogs?.polities || []).map((row) => row.id));
const seenActivities = new Set();
const seenDecisions = new Set();
const exec = {};
const disp = {};
const prereq = {};
const residual = {};
let newRows = 0;
let newTargets = 0;
let splitRows = 0;
let splitTargets = 0;

function bump(target, key) { target[key] = (target[key] || 0) + 1; }
for (const entry of handoff.entries) {
  if (!entry.activity_id || seenActivities.has(entry.activity_id)) throw new Error(`duplicate/missing Activity ${entry.activity_id}`);
  seenActivities.add(entry.activity_id);
  const row = ledgerByActivity.get(entry.activity_id);
  if (!row) throw new Error(`${entry.activity_id}: P4 ledger row missing`);
  const decision = row.audit.polity_identity_decision;
  if (entry.p4_decision?.id !== decision.id || seenDecisions.has(decision.id)) throw new Error(`${entry.activity_id}: decision id drift`);
  seenDecisions.add(decision.id);
  if (entry.person?.uuid !== row.person?.uuid || entry.current_polity?.uuid !== row.polity?.uuid) throw new Error(`${entry.activity_id}: exact identity binding drift`);
  if (entry.p4_decision.target_disposition !== decision.target_disposition || entry.p4_decision.execution_kind !== decision.execution_kind || (entry.p4_decision.target_polity_uuid ?? null) !== (decision.target_polity_uuid ?? null)) throw new Error(`${entry.activity_id}: P4 decision projection drift`);
  if (entry.source_contract !== decision.source_contract || !fs.existsSync(entry.source_contract)) throw new Error(`${entry.activity_id}: source contract drift`);
  if (entry.execution_boundary?.branch_only_preparation !== true || entry.execution_boundary?.production_mutation_authorized !== false || entry.execution_boundary?.p5_schema_required_before_execution !== true || entry.execution_boundary?.correction_v2_required_before_execution !== true) throw new Error(`${entry.activity_id}: execution boundary drift`);
  if (!entry.schema_prerequisites.includes('CORRECTION_V2')) throw new Error(`${entry.activity_id}: Correction v2 prerequisite missing`);
  if (entry.residual_ledger_dependencies.includes('polity_identity_model')) throw new Error(`${entry.activity_id}: closed identity dependency resurfaced`);
  if (entry.p4_decision.target_polity_uuid && !polityIds.has(entry.p4_decision.target_polity_uuid)) throw new Error(`${entry.activity_id}: target Polity UUID absent from Baseline A`);
  if (entry.p4_decision.target_disposition === 'NEW_POLITY_REQUIRED' && entry.p4_decision.target_polity_uuid !== null) throw new Error(`${entry.activity_id}: invented top-level new Polity UUID`);
  for (const target of entry.p4_decision.split_targets || []) {
    if (target.target_disposition === 'NEW_POLITY_REQUIRED' && target.polity_uuid !== null) throw new Error(`${entry.activity_id}: invented split new Polity UUID`);
    if (target.polity_uuid && !polityIds.has(target.polity_uuid)) throw new Error(`${entry.activity_id}: split target UUID absent from Baseline A`);
  }
  bump(exec, entry.p4_decision.execution_kind);
  bump(disp, entry.p4_decision.target_disposition);
  for (const key of entry.schema_prerequisites) bump(prereq, key);
  for (const key of entry.residual_ledger_dependencies) bump(residual, key);
  if (entry.new_polity_targets.length) newRows += 1;
  newTargets += entry.new_polity_targets.length;
  if ((entry.p4_decision.split_targets || []).length) splitRows += 1;
  splitTargets += (entry.p4_decision.split_targets || []).length;
}

const sortObj = (obj) => Object.fromEntries(Object.entries(obj).sort((a,b) => a[0].localeCompare(b[0])));
const expected = {
  p4_identity_decisions_closed: 49,
  p4_identity_decisions_unresolved: 0,
  p4_execution_pending: 49,
  execution_kind_counts: sortObj(exec),
  target_disposition_counts: sortObj(disp),
  schema_prerequisite_counts: sortObj(prereq),
  residual_dependency_counts_for_p4_rows: sortObj(residual),
  new_polity_activity_rows: newRows,
  new_polity_targets: newTargets,
  split_activity_rows: splitRows,
  split_targets: splitTargets,
  correction_v2_required_rows: prereq.CORRECTION_V2 || 0,
  production_mutation_authorized: false
};
for (const [key, value] of Object.entries(expected)) {
  if (JSON.stringify(summary[key]) !== JSON.stringify(value)) throw new Error(`handoff summary drift at ${key}`);
  if (JSON.stringify(handoff.summary?.[key]) !== JSON.stringify(value)) throw new Error(`embedded handoff summary drift at ${key}`);
}
if (newRows !== 13 || newTargets !== 15 || splitRows !== 7 || splitTargets !== 15) throw new Error(`reviewed P4 authoring/split frontier drift: rows=${newRows}, newTargets=${newTargets}, splitRows=${splitRows}, splitTargets=${splitTargets}`);
if ((prereq.CORRECTION_V2 || 0) !== 49) throw new Error('not every P4 row is gated by Correction v2');

console.log(JSON.stringify({
  marker: 'ATLAS_P5_P6_EXECUTION_HANDOFF_OK',
  p4_closed: 49,
  p4_unresolved: 0,
  new_polity_activity_rows: newRows,
  new_polity_targets: newTargets,
  split_activity_rows: splitRows,
  split_targets: splitTargets,
  correction_v2_required_rows: prereq.CORRECTION_V2 || 0,
  production_mutation_authorized: false
}, null, 2));
