import fs from 'node:fs';

function arg(name, fallback = null) { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : fallback; }
const ledgerPath = arg('--ledger');
const closurePath = arg('--closures', 'stage2/integration/baseline-a-reviewed-research-closures.v1.json');
const residualPath = arg('--residual', 'research/residual/stage2-baseline-a-residual-22-resolution.v1.json');
const parserResidualPath = arg('--parser-residual', 'research/residual/stage2-baseline-a-parser-residual-6-resolution.v1.json');
if (!ledgerPath) throw new Error('missing --ledger');

const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const closures = JSON.parse(fs.readFileSync(closurePath, 'utf8'));
const residual = JSON.parse(fs.readFileSync(residualPath, 'utf8'));
const parserResidual = JSON.parse(fs.readFileSync(parserResidualPath, 'utf8'));
if (ledger?.schema !== 'atlas-stage2-baseline-a-master-ledger/v2') throw new Error('unsupported ledger schema');
if (closures?.schema !== 'atlas-stage2-baseline-a-reviewed-research-closures/v1') throw new Error('unsupported research closure schema');
if (residual?.schema !== 'atlas-stage2-baseline-a-residual-research-resolution/v1') throw new Error('unsupported residual research schema');
if (parserResidual?.schema !== 'atlas-stage2-baseline-a-parser-residual-research-resolution/v1') throw new Error('unsupported exact-parser residual research schema');
if (closures.status !== 'P3_REVIEWED_MODEL_CLOSURE_NO_PRODUCTION_MUTATION') throw new Error('unexpected closure status');
if (residual.status !== 'P3_HISTORICAL_RESEARCH_CLOSED_NO_PRODUCTION_MUTATION') throw new Error('unexpected residual research status');
if (parserResidual.status !== 'P3_EXACT_PARSER_RESIDUAL_RESEARCH_CLOSED_NO_PRODUCTION_MUTATION') throw new Error('unexpected exact-parser residual status');
if (closures.rules?.activity_uuid_exact_match_required !== true || closures.rules?.name_only_override_forbidden !== true) throw new Error('closure exact-binding rules missing');
if (residual.rules?.activity_uuid_exact_binding_required !== true || residual.rules?.name_only_identity_binding_forbidden !== true) throw new Error('residual exact-binding rules missing');
if (parserResidual.rules?.activity_uuid_exact_binding_required !== true || parserResidual.rules?.name_only_identity_binding_forbidden !== true) throw new Error('exact-parser residual exact-binding rules missing');
if (closures.rules?.production_mutation_authorized !== false || closures.result?.production_mutation_authorized !== false || residual.rules?.production_mutation_authorized !== false || residual.result?.production_mutation_authorized !== false || parserResidual.rules?.production_mutation_authorized !== false || parserResidual.result?.production_mutation_authorized !== false) throw new Error('research closure artifacts must remain non-mutating');
if (closures.baseline_digest !== ledger.baseline?.baseline_digest || residual.baseline_digest !== ledger.baseline?.baseline_digest || parserResidual.baseline_digest !== ledger.baseline?.baseline_digest) throw new Error('research closure Baseline digest mismatch');
if (Number(residual.result?.residual_cases_total) !== 22 || Number(residual.result?.remaining_generic_historical_research) !== 0) throw new Error('residual 22 review counts drifted');
if (Number(parserResidual.result?.exact_parser_residual_cases_total) !== 6 || Number(parserResidual.result?.generic_historical_research_closed) !== 6 || Number(parserResidual.result?.remaining_generic_historical_research_from_this_set) !== 0) throw new Error('exact-parser residual 6 review counts drifted');

const allowedDependencies = new Set([
  'relation_type','historical_research','chronology_correction','polity_identity_model','person_identity_review',
  'polity_relation_model','governance_context','sub_year_precision','provenance_backfill','entity_model_migration'
]);
const normalizedEntries = [
  ...(closures.closures || []).map((entry) => ({ ...entry, closure_artifact: closurePath })),
  ...(residual.cases || []).map((entry) => ({
    activity_id: entry.activity_id,
    person: entry.person,
    source: residualPath,
    decision: entry.decision,
    relation_hint: entry.relation_hint ?? null,
    execution_class: entry.execution_class,
    dependencies: entry.dependencies || [],
    closure_artifact: residualPath
  }))
];

const parserResidualByActivity = new Map((parserResidual.cases || []).map((entry) => [entry.activity_id, entry]));
if (parserResidualByActivity.size !== 6) throw new Error('exact-parser residual Activity set must contain six unique UUIDs');
const closureEntriesByActivity = new Map((closures.closures || []).map((entry) => [entry.activity_id, entry]));
for (const [activityId, reviewed] of parserResidualByActivity) {
  const bound = closureEntriesByActivity.get(activityId);
  if (!bound) throw new Error(`exact-parser residual Activity missing from reviewed closure manifest: ${activityId}`);
  if (bound.person !== reviewed.person || bound.decision !== reviewed.decision || (bound.relation_hint ?? null) !== (reviewed.relation_hint ?? null)) throw new Error(`exact-parser residual decision drift for ${activityId}`);
  const a = [...(bound.dependencies || [])].sort().join('|');
  const b = [...(reviewed.dependencies || [])].sort().join('|');
  if (a !== b) throw new Error(`exact-parser residual dependency drift for ${activityId}`);
}

const byActivity = new Map();
for (const entry of normalizedEntries) {
  if (!entry?.activity_id) throw new Error('closure missing activity_id');
  if (byActivity.has(entry.activity_id)) throw new Error(`duplicate closure Activity ${entry.activity_id}`);
  if ((entry.dependencies || []).includes('historical_research')) throw new Error(`reviewed outcome ${entry.activity_id} cannot preserve generic historical_research`);
  for (const dep of entry.dependencies || []) if (!allowedDependencies.has(dep)) throw new Error(`closure ${entry.activity_id} has unsupported dependency ${dep}`);
  byActivity.set(entry.activity_id, entry);
}
const expectedReviewedCount = Number(closures.result?.reviewed_cases_total || 0) + Number(residual.result?.residual_cases_total || 0);
if (byActivity.size !== expectedReviewedCount || expectedReviewedCount !== 42) throw new Error(`combined reviewed case count drift: expected 42, got ${byActivity.size}`);

const ledgerIds = new Set(ledger.rows.map((row) => row.activity_id));
for (const id of byActivity.keys()) if (!ledgerIds.has(id)) throw new Error(`reviewed Activity absent from Baseline A ledger: ${id}`);

let applied = 0;
let genericResearchClosures = 0;
let reviewedRefinements = 0;
const refinementActivityIds = [];
for (const row of ledger.rows) {
  const reviewed = byActivity.get(row.activity_id);
  if (!reviewed) continue;
  if (reviewed.person && row.person?.canonical !== reviewed.person) throw new Error(`reviewed Person mismatch for ${row.activity_id}`);
  const previousDecision = row.audit?.decision ?? null;
  const previousDependencies = [...(row.audit?.dependencies || [])];
  const closesGenericResearch = previousDependencies.includes('historical_research');
  if (closesGenericResearch) genericResearchClosures += 1;
  else { reviewedRefinements += 1; refinementActivityIds.push(row.activity_id); }
  row.audit.pre_reviewed_closure = { decision: previousDecision, execution_class: row.audit?.execution_class ?? null, dependencies: previousDependencies, primary_source: row.audit?.primary_source ?? null };
  row.audit.decision = reviewed.decision;
  row.audit.relation_hint = reviewed.relation_hint ?? null;
  row.audit.execution_class = reviewed.execution_class;
  row.audit.dependencies = [...new Set(reviewed.dependencies || [])].sort();
  row.audit.primary_source = reviewed.source;
  row.audit.reviewed_research_closure = {
    status: closesGenericResearch ? 'GENERIC_RESEARCH_CLOSED_BY_LATER_REVIEWED_CONTRACT' : 'LATER_REVIEWED_MODEL_REFINEMENT',
    source: reviewed.source,
    closure_artifact: reviewed.closure_artifact
  };
  applied += 1;
}
if (applied !== byActivity.size) throw new Error(`expected ${byActivity.size} reviewed cases, applied ${applied}`);

const remainingResearchRows = ledger.rows.filter((row) => (row.audit?.dependencies || []).includes('historical_research')).map((row) => ({
  activity_id: row.activity_id,
  person: row.person?.canonical ?? null,
  polity: row.polity?.canonical ?? null,
  decision: row.audit?.decision ?? null,
  primary_source: row.audit?.primary_source ?? null
}));
if (remainingResearchRows.length) throw new Error(`reviewed overlay incomplete: closures=${genericResearchClosures}, refinements=${reviewedRefinements}, remaining=${JSON.stringify(remainingResearchRows)}`);
if (genericResearchClosures !== 33 || reviewedRefinements !== 9) throw new Error(`reviewed overlay classification drift: closures=${genericResearchClosures}, refinements=${reviewedRefinements}`);

function countBy(getter) { return Object.fromEntries([...ledger.rows.reduce((map, row) => { const key = getter(row); map.set(key, (map.get(key) || 0) + 1); return map; }, new Map()).entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0])))); }
const dependencyCounts = {};
for (const row of ledger.rows) for (const dep of row.audit?.dependencies || []) dependencyCounts[dep] = (dependencyCounts[dep] || 0) + 1;
ledger.summary.execution_class_counts = countBy((row) => row.audit.execution_class);
ledger.summary.primary_decision_counts = countBy((row) => row.audit.decision);
ledger.summary.dependency_counts = Object.fromEntries(Object.entries(dependencyCounts).sort((a, b) => a[0].localeCompare(b[0])));
ledger.summary.reviewed_research_closures_applied = genericResearchClosures;
ledger.summary.reviewed_model_refinements_applied = reviewedRefinements;
ledger.summary.reviewed_cases_applied = applied;
ledger.summary.residual_research_cases_reviewed = Number(residual.result.residual_cases_total);
ledger.summary.exact_parser_residual_research_cases_reviewed = Number(parserResidual.result.exact_parser_residual_cases_total);
ledger.generated_from.reviewed_research_closures = closurePath;
ledger.generated_from.residual_research_resolution = residualPath;
ledger.generated_from.exact_parser_residual_research_resolution = parserResidualPath;
if ((ledger.summary.dependency_counts.historical_research || 0) !== 0) throw new Error(`generic historical research remains after reviewed overlay: ${ledger.summary.dependency_counts.historical_research}`);
fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
console.log(JSON.stringify({ marker: 'ATLAS_BASELINE_A_REVIEWED_RESEARCH_CLOSURES_OK', baseline_digest: ledger.baseline.baseline_digest, ledger_rows: ledger.rows.length, reviewed_cases_applied: applied, generic_research_dependencies_closed: genericResearchClosures, reviewed_model_refinements: reviewedRefinements, refinement_activity_ids: refinementActivityIds.sort(), residual_cases_reviewed: Number(residual.result.residual_cases_total), exact_parser_residual_cases_reviewed: Number(parserResidual.result.exact_parser_residual_cases_total), remaining_generic_historical_research: 0, production_mutation_authorized: false }, null, 2));
