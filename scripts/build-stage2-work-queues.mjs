import fs from 'node:fs';
import path from 'node:path';

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const ledgerPath = arg('--ledger');
const outPath = arg('--out', 'artifacts/stage2-work-queues.json');
const summaryPath = arg('--summary', 'artifacts/stage2-work-queues-summary.json');
if (!ledgerPath) throw new Error('missing --ledger');

const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
if (ledger?.schema !== 'atlas-polity-semantic-master-ledger/v1') throw new Error('unsupported master ledger schema');
if (!Array.isArray(ledger?.rows) || ledger.rows.length !== 346) throw new Error(`expected 346 master-ledger rows, got ${ledger?.rows?.length ?? 'invalid'}`);

const uniqueIds = new Set(ledger.rows.map((row) => row.activity_id));
if (uniqueIds.size !== ledger.rows.length) throw new Error('master ledger contains duplicate Activity UUIDs');

const dependencyNames = [
  'relation_type',
  'historical_research',
  'chronology_correction',
  'polity_identity_model',
  'polity_relation_model',
  'governance_context',
  'sub_year_precision',
];

const compact = (row) => ({
  activity_id: row.activity_id,
  person: row.person?.canonical ?? null,
  polity: row.polity?.canonical ?? null,
  start_year: row.activity?.start_year ?? null,
  end_year: row.activity?.end_year ?? null,
  role: row.activity?.role ?? null,
  decision: row.audit?.decision ?? null,
  execution_class: row.audit?.execution_class ?? null,
  dependencies: row.audit?.dependencies ?? [],
  decision_source: row.audit?.primary_source ?? null,
});

const sortRows = (rows) => [...rows].sort((a, b) =>
  (a.start_year ?? 0) - (b.start_year ?? 0)
  || (a.end_year ?? 0) - (b.end_year ?? 0)
  || String(a.person).localeCompare(String(b.person))
  || String(a.activity_id).localeCompare(String(b.activity_id))
);

const dependencyQueues = Object.fromEntries(dependencyNames.map((dep) => [
  dep,
  sortRows(ledger.rows.filter((row) => row.audit.dependencies.includes(dep)).map(compact)),
]));

const executionClasses = [...new Set(ledger.rows.map((row) => row.audit.execution_class))].sort();
const executionQueues = Object.fromEntries(executionClasses.map((cls) => [
  cls,
  sortRows(ledger.rows.filter((row) => row.audit.execution_class === cls).map(compact)),
]));

const actionable = {
  r0_keep_representatives: executionQueues.R0_KEEP_REPRESENTATIVE ?? [],
  r0_coalesce_drops: executionQueues.R0_COALESCE_DROP ?? [],
  r1_ready_after_r0: executionQueues.R1_READY_AFTER_R0 ?? [],
  r1_blocked_schema: executionQueues.R1_BLOCKED_SCHEMA ?? [],
  direct_stage2_chronology: executionQueues.STAGE2_CHRONOLOGY_CORRECTION ?? [],
  direct_stage2_relink: executionQueues.STAGE2_RELINK ?? [],
};

const dependencyCounts = Object.fromEntries(dependencyNames.map((dep) => [dep, dependencyQueues[dep].length]));
const executionCounts = Object.fromEntries(executionClasses.map((cls) => [cls, executionQueues[cls].length]));

const summary = {
  schema: 'atlas-stage2-work-queues-summary/v1',
  baseline_relationships: ledger.rows.length,
  unique_activity_ids: uniqueIds.size,
  dependency_counts: dependencyCounts,
  execution_class_counts: executionCounts,
  gates: {
    r0_keep_representatives: actionable.r0_keep_representatives.length,
    r0_coalesce_drops: actionable.r0_coalesce_drops.length,
    r1_ready_after_r0: actionable.r1_ready_after_r0.length,
    r1_blocked_schema: actionable.r1_blocked_schema.length,
  },
};

const expectedDependencyCounts = ledger.summary?.dependency_counts ?? {};
for (const dep of dependencyNames) {
  if (Number(expectedDependencyCounts[dep] ?? 0) !== dependencyCounts[dep]) {
    throw new Error(`dependency queue drift for ${dep}: ledger=${expectedDependencyCounts[dep] ?? 0} derived=${dependencyCounts[dep]}`);
  }
}
if (actionable.r0_keep_representatives.length !== 6 || actionable.r0_coalesce_drops.length !== 6) {
  throw new Error('R0 work queues must remain exactly 6 keep / 6 drop on the reviewed baseline');
}
if (actionable.r1_ready_after_r0.length !== 3) throw new Error('R1 ready queue must remain exactly 3 on the reviewed baseline');
if (actionable.r1_blocked_schema.length !== 4) throw new Error('R1 blocked-schema queue must remain exactly 4 on the reviewed baseline');

const result = {
  schema: 'atlas-stage2-work-queues/v1',
  status: 'AUDIT_ONLY_NO_PRODUCTION_MUTATION',
  derived_from: {
    ledger_schema: ledger.schema,
    baseline: ledger.baseline,
  },
  summary,
  actionable,
  by_dependency: dependencyQueues,
  by_execution_class: executionQueues,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);
fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(`ATLAS_STAGE2_WORK_QUEUES_OK rows=${ledger.rows.length} r0=${actionable.r0_coalesce_drops.length} r1_ready=${actionable.r1_ready_after_r0.length} r1_blocked=${actionable.r1_blocked_schema.length}`);
console.log(JSON.stringify(summary, null, 2));
