import fs from 'node:fs';

function arg(name, fallback = null) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : fallback; }
const ledgerPath = arg('--ledger');
const closurePath = arg('--closures', 'stage2/integration/baseline-a-reviewed-research-closures.v1.json');
if (!ledgerPath) throw new Error('missing --ledger');

const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const closures = JSON.parse(fs.readFileSync(closurePath, 'utf8'));
if (ledger?.schema !== 'atlas-stage2-baseline-a-master-ledger/v2') throw new Error('unsupported ledger schema');
if (closures?.schema !== 'atlas-stage2-baseline-a-reviewed-research-closures/v1') throw new Error('unsupported research closure schema');
if (closures.status !== 'P3_REVIEWED_MODEL_CLOSURE_NO_PRODUCTION_MUTATION') throw new Error('unexpected closure status');
if (closures.rules?.activity_uuid_exact_match_required !== true || closures.rules?.name_only_override_forbidden !== true) throw new Error('closure exact-binding rules missing');
if (closures.rules?.production_mutation_authorized !== false || closures.result?.production_mutation_authorized !== false) throw new Error('closure artifact must remain non-mutating');
if (closures.baseline_digest !== ledger.baseline?.baseline_digest) throw new Error('closure Baseline digest mismatch');

const allowedDependencies = new Set([
  'relation_type','historical_research','chronology_correction','polity_identity_model','person_identity_review',
  'polity_relation_model','governance_context','sub_year_precision','provenance_backfill','entity_model_migration'
]);
const byActivity = new Map();
for (const entry of closures.closures || []) {
  if (!entry?.activity_id) throw new Error('closure missing activity_id');
  if (byActivity.has(entry.activity_id)) throw new Error(`duplicate closure Activity ${entry.activity_id}`);
  if ((entry.dependencies || []).includes('historical_research')) throw new Error(`closure ${entry.activity_id} cannot preserve generic historical_research`);
  for (const dep of entry.dependencies || []) if (!allowedDependencies.has(dep)) throw new Error(`closure ${entry.activity_id} has unsupported dependency ${dep}`);
  byActivity.set(entry.activity_id, entry);
}
if (byActivity.size !== Number(closures.result?.reviewed_generic_research_labels_closed || 0)) throw new Error('closure count drift');

const ledgerIds = new Set(ledger.rows.map((row) => row.activity_id));
for (const id of byActivity.keys()) if (!ledgerIds.has(id)) throw new Error(`closure Activity absent from Baseline A ledger: ${id}`);

let applied = 0;
for (const row of ledger.rows) {
  const closure = byActivity.get(row.activity_id);
  if (!closure) continue;
  if (closure.person && row.person?.canonical !== closure.person) throw new Error(`closure Person mismatch for ${row.activity_id}`);
  const previousDecision = row.audit?.decision ?? null;
  const previousDependencies = [...(row.audit?.dependencies || [])];
  if (!previousDependencies.includes('historical_research')) throw new Error(`closure ${row.activity_id} does not replace a generic historical research dependency`);
  row.audit.pre_reviewed_closure = {
    decision: previousDecision,
    execution_class: row.audit?.execution_class ?? null,
    dependencies: previousDependencies,
    primary_source: row.audit?.primary_source ?? null
  };
  row.audit.decision = closure.decision;
  row.audit.relation_hint = closure.relation_hint ?? null;
  row.audit.execution_class = closure.execution_class;
  row.audit.dependencies = [...new Set(closure.dependencies || [])].sort();
  row.audit.primary_source = closure.source;
  row.audit.reviewed_research_closure = {
    status: 'GENERIC_RESEARCH_CLOSED_BY_LATER_REVIEWED_CONTRACT',
    source: closure.source,
    closure_artifact: closurePath
  };
  applied += 1;
}
if (applied !== byActivity.size) throw new Error(`expected ${byActivity.size} closures, applied ${applied}`);

function countBy(getter) {
  return Object.fromEntries([...ledger.rows.reduce((map, row) => {
    const key = getter(row); map.set(key, (map.get(key) || 0) + 1); return map;
  }, new Map()).entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
}
const dependencyCounts = {};
for (const row of ledger.rows) for (const dep of row.audit?.dependencies || []) dependencyCounts[dep] = (dependencyCounts[dep] || 0) + 1;
ledger.summary.execution_class_counts = countBy((row) => row.audit.execution_class);
ledger.summary.primary_decision_counts = countBy((row) => row.audit.decision);
ledger.summary.dependency_counts = Object.fromEntries(Object.entries(dependencyCounts).sort((a, b) => a[0].localeCompare(b[0])));
ledger.summary.reviewed_research_closures_applied = applied;
ledger.generated_from.reviewed_research_closures = closurePath;
fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
console.log(JSON.stringify({
  marker: 'ATLAS_BASELINE_A_REVIEWED_RESEARCH_CLOSURES_OK',
  baseline_digest: ledger.baseline.baseline_digest,
  ledger_rows: ledger.rows.length,
  closures_applied: applied,
  remaining_generic_historical_research: ledger.summary.dependency_counts.historical_research || 0,
  production_mutation_authorized: false
}, null, 2));
