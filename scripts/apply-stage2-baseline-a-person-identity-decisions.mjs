import fs from 'node:fs';

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const ledgerPath = arg('--ledger');
const intakePath = arg('--intake');
const decisionsPath = arg('--decisions', 'stage2/integration/baseline-a-person-identity-decisions.v1.json');
if (!ledgerPath) throw new Error('missing --ledger');
if (!intakePath) throw new Error('missing --intake');

const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const intake = JSON.parse(fs.readFileSync(intakePath, 'utf8'));
const decisions = JSON.parse(fs.readFileSync(decisionsPath, 'utf8'));

if (ledger?.schema !== 'atlas-stage2-baseline-a-master-ledger/v2') throw new Error('unsupported ledger schema');
if (intake?.schema !== 'atlas-stage2-baseline-a-intake/v2') throw new Error('unsupported Baseline A intake schema');
if (decisions?.schema !== 'atlas-stage2-baseline-a-person-identity-decisions/v1') throw new Error('unsupported Person identity decision schema');
if (decisions.status !== 'P4_PERSON_IDENTITY_DECISIONS_ONLY_NO_PHYSICAL_MERGE') throw new Error('unexpected Person identity decision status');
if (decisions.baseline_digest !== intake.baseline_digest || decisions.baseline_digest !== ledger.baseline?.baseline_digest) throw new Error('Person identity decision Baseline digest mismatch');
if (decisions.rules?.exact_person_uuid_binding_required !== true || decisions.rules?.exact_activity_uuid_binding_required_when_activity_blocker_is_cleared !== true) throw new Error('exact identity binding rules missing');
if (decisions.rules?.physical_person_merge_before_semantic_key_v2_forbidden !== true || decisions.rules?.name_only_merge_forbidden !== true) throw new Error('P4 physical merge safety rules missing');
if (decisions.rules?.heuristic_detector_non_candidate_does_not_overrule_reviewed_identity_evidence !== true) throw new Error('reviewed identity evidence precedence rule missing');
if (decisions.rules?.production_mutation_authorized !== false || decisions.result?.production_mutation_authorized !== false) throw new Error('P4 identity decisions must remain non-mutating');
if (Number(decisions.result?.person_identity_blockers_reviewed) !== 2 || Number(decisions.result?.person_identity_decisions_unresolved) !== 0) throw new Error('P4 identity decision count drift');
if (Number(decisions.result?.p10_physical_person_merges_required) !== 1 || Number(decisions.result?.physical_person_merges_performed) !== 0) throw new Error('P10 merge handoff count drift');
if (!Array.isArray(decisions.decisions) || decisions.decisions.length !== 2) throw new Error('expected exactly two reviewed Person identity decisions');

const persons = intake.identity_catalogs?.persons || [];
const activities = intake.activity_rows || [];
const personById = new Map(persons.map((person) => [person.id, person]));
const activityById = new Map(activities.map((row) => [row.activity_id, row]));
const ledgerByActivity = new Map(ledger.rows.map((row) => [row.activity_id, row]));
if (personById.size !== Number(intake.counts?.persons ?? persons.length)) throw new Error('Baseline A Person catalog count drift');
if (activities.length !== 338 || ledger.rows.length !== 338) throw new Error('Baseline A Activity count drift');

function namesFor(person) {
  return (person?.names || []).map((name) => ({
    name: String(name.name ?? ''),
    locale: name.locale ?? null,
    is_preferred: Boolean(name.is_preferred)
  }));
}

function exactAliasOwners(alias) {
  const wanted = String(alias.name || '').normalize('NFKC').trim().toLocaleLowerCase('und');
  const owners = [];
  for (const person of persons) {
    for (const name of person.names || []) {
      if (String(name.name || '').normalize('NFKC').trim().toLocaleLowerCase('und') === wanted) {
        owners.push({ person_id: person.id, canonical_key: person.canonical_key, name });
      }
    }
  }
  return owners;
}

const expectedDecisionIds = new Set(['gorgo_sparta_same_person', 'catherine_great_alias_already_canonicalized']);
const seenDecisionIds = new Set();
let applied = 0;
let p10PhysicalMergesRequired = 0;

for (const decision of decisions.decisions) {
  if (!expectedDecisionIds.has(decision.id)) throw new Error(`unexpected P4 identity decision ${decision.id}`);
  if (seenDecisionIds.has(decision.id)) throw new Error(`duplicate P4 identity decision ${decision.id}`);
  seenDecisionIds.add(decision.id);

  const currentPerson = personById.get(decision.current_person_id);
  const activity = activityById.get(decision.activity_id);
  const ledgerRow = ledgerByActivity.get(decision.activity_id);
  if (!currentPerson) throw new Error(`current Person missing for ${decision.id}`);
  if (!activity) throw new Error(`Activity missing for ${decision.id}`);
  if (!ledgerRow) throw new Error(`ledger Activity missing for ${decision.id}`);
  if (activity.person_id !== decision.current_person_id || ledgerRow.person?.uuid !== decision.current_person_id) throw new Error(`Activity/Person UUID mismatch for ${decision.id}`);
  if (currentPerson.canonical_key !== decision.current_person || ledgerRow.person?.canonical !== decision.current_person) throw new Error(`current Person name mismatch for ${decision.id}`);
  if (!(ledgerRow.audit?.dependencies || []).includes('person_identity_review')) throw new Error(`P4 decision ${decision.id} does not replace a Person identity blocker`);
  if (decision.physical_merge_authorized_now !== false) throw new Error(`P4 decision ${decision.id} cannot authorize physical merge`);
  if (!decision.activity_after_identity_decision?.decision || !Array.isArray(decision.activity_after_identity_decision?.dependencies)) throw new Error(`Activity outcome missing for ${decision.id}`);
  if (decision.activity_after_identity_decision.dependencies.includes('person_identity_review')) throw new Error(`P4 decision ${decision.id} cannot preserve Person identity blocker`);

  if (decision.id === 'gorgo_sparta_same_person') {
    const duplicate = personById.get(decision.duplicate_person_id);
    if (!duplicate) throw new Error('Gorgo duplicate Person UUID absent from Baseline A');
    if (duplicate.canonical_key !== decision.duplicate_person) throw new Error('Gorgo duplicate Person canonical name drift');
    if (decision.canonical_survivor_person_id !== decision.current_person_id || decision.canonical_survivor_name !== decision.current_person) throw new Error('Gorgo survivor binding drift');
    const duplicateActivityCount = activities.filter((row) => row.person_id === decision.duplicate_person_id).length;
    if (duplicateActivityCount !== Number(decision.duplicate_current_activity_count_expected)) throw new Error(`Gorgo duplicate Activity count drift: ${duplicateActivityCount}`);
    if (decision.decision !== 'MERGE_SAME_HISTORICAL_PERSON_AT_P10' || decision.p10_physical_merge_required !== true) throw new Error('Gorgo P10 merge decision drift');
    if (!Array.isArray(decision.evidence_urls) || decision.evidence_urls.length < 2) throw new Error('Gorgo identity evidence incomplete');
    p10PhysicalMergesRequired += 1;
  }

  if (decision.id === 'catherine_great_alias_already_canonicalized') {
    if (decision.decision !== 'CURRENT_SINGLE_PERSON_IDENTITY_ALREADY_CONTAINS_CATHERINE_II_ALIAS') throw new Error('Catherine identity decision drift');
    if (decision.p10_physical_merge_required !== false || decision.separate_catherine_ii_person_expected !== false) throw new Error('Catherine stale duplicate blocker not closed');
    const alias = decision.required_alias;
    const exactAlias = namesFor(currentPerson).find((name) => name.name === alias.name && name.locale === alias.locale && name.is_preferred === Boolean(alias.is_preferred));
    if (!exactAlias) throw new Error('Catherine II required alias missing from canonical Person UUID');
    const owners = exactAliasOwners(alias);
    if (owners.length !== 1 || owners[0].person_id !== decision.current_person_id) throw new Error(`Catherine II alias ownership drift: ${JSON.stringify(owners)}`);
  }

  const previous = {
    decision: ledgerRow.audit?.decision ?? null,
    relation_hint: ledgerRow.audit?.relation_hint ?? null,
    execution_class: ledgerRow.audit?.execution_class ?? null,
    dependencies: [...(ledgerRow.audit?.dependencies || [])],
    primary_source: ledgerRow.audit?.primary_source ?? null
  };
  const outcome = decision.activity_after_identity_decision;
  ledgerRow.audit.pre_person_identity_decision = previous;
  ledgerRow.audit.decision = outcome.decision;
  ledgerRow.audit.relation_hint = outcome.relation_hint ?? null;
  ledgerRow.audit.execution_class = outcome.execution_class;
  ledgerRow.audit.dependencies = [...new Set(outcome.dependencies || [])].sort();
  ledgerRow.audit.primary_source = decisionsPath;
  ledgerRow.audit.person_identity_decision = {
    id: decision.id,
    identity_decision: decision.decision,
    status: decision.p10_physical_merge_required ? 'IDENTITY_DECIDED_P10_PHYSICAL_MERGE_PENDING' : 'IDENTITY_ALREADY_CANONICALIZED_NO_P10_MERGE',
    physical_merge_authorized_now: false
  };
  applied += 1;
}

if (seenDecisionIds.size !== expectedDecisionIds.size) throw new Error('P4 identity decision set incomplete');
if (applied !== 2 || p10PhysicalMergesRequired !== 1) throw new Error(`P4 identity application count drift: applied=${applied}, p10=${p10PhysicalMergesRequired}`);

function countBy(getter) {
  return Object.fromEntries([...ledger.rows.reduce((map, row) => {
    const key = getter(row);
    map.set(key, (map.get(key) || 0) + 1);
    return map;
  }, new Map()).entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
}

const dependencyCounts = {};
for (const row of ledger.rows) {
  for (const dep of row.audit?.dependencies || []) dependencyCounts[dep] = (dependencyCounts[dep] || 0) + 1;
}
ledger.summary.execution_class_counts = countBy((row) => row.audit.execution_class);
ledger.summary.primary_decision_counts = countBy((row) => row.audit.decision);
ledger.summary.dependency_counts = Object.fromEntries(Object.entries(dependencyCounts).sort((a, b) => a[0].localeCompare(b[0])));
ledger.summary.person_identity_decisions_applied = applied;
ledger.summary.person_identity_decisions_unresolved = 0;
ledger.summary.p10_physical_person_merges_required = p10PhysicalMergesRequired;
ledger.summary.physical_person_merges_performed = 0;
ledger.generated_from.person_identity_decisions = decisionsPath;

if ((ledger.summary.dependency_counts.person_identity_review || 0) !== 0) throw new Error(`Person identity blocker remains after P4 decisions: ${ledger.summary.dependency_counts.person_identity_review}`);
fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
console.log(JSON.stringify({
  marker: 'ATLAS_BASELINE_A_PERSON_IDENTITY_DECISIONS_OK',
  baseline_digest: ledger.baseline.baseline_digest,
  ledger_rows: ledger.rows.length,
  decisions_applied: applied,
  person_identity_decisions_unresolved: 0,
  p10_physical_person_merges_required: p10PhysicalMergesRequired,
  physical_person_merges_performed: 0,
  production_mutation_authorized: false
}, null, 2));
