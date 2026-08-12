import fs from 'node:fs';

function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const ledgerPath = arg('--ledger');
const intakePath = arg('--intake');
const decisionsPath = arg('--decisions', 'stage2/integration/baseline-a-polity-relation-decisions.v1.json');
if (!ledgerPath || !intakePath) throw new Error('missing --ledger/--intake');

const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const intake = JSON.parse(fs.readFileSync(intakePath, 'utf8'));
const decisions = JSON.parse(fs.readFileSync(decisionsPath, 'utf8'));
const expectedDigest = 'sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27';
const expectedDeployment = 'ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79';

if (ledger?.schema !== 'atlas-stage2-baseline-a-master-ledger/v2') throw new Error('unsupported ledger schema');
if (intake?.schema !== 'atlas-stage2-baseline-a-intake/v2') throw new Error('unsupported intake schema');
if (decisions?.schema !== 'atlas-stage2-baseline-a-polity-relation-decisions/v1') throw new Error('unsupported Polity relation decisions schema');
if (decisions.status !== 'P3_POLITY_RELATION_MODELS_DECIDED_BRANCH_ONLY_NO_PRODUCTION_MUTATION') throw new Error('unexpected Polity relation decision status');
if (ledger.baseline?.baseline_digest !== expectedDigest || intake.baseline_digest !== expectedDigest || decisions.baseline?.baseline_digest !== expectedDigest) throw new Error('Baseline digest drift');
if (ledger.baseline?.deployment_sha !== expectedDeployment || intake.deployment_sha !== expectedDeployment || decisions.baseline?.deployment_sha !== expectedDeployment) throw new Error('Baseline deployment SHA drift');
if (decisions.rules?.name_only_binding_forbidden !== true || decisions.rules?.new_polity_uuid_must_remain_null_until_authoring !== true || decisions.rules?.production_mutation_authorized !== false) throw new Error('Polity relation safety rules missing');
if (!Array.isArray(decisions.decisions) || decisions.decisions.length !== 14) throw new Error('expected exactly 14 Polity relation decisions');

const polityIds = new Set((intake.identity_catalogs?.polities || []).map((row) => row.id));
const ledgerByActivity = new Map(ledger.rows.map((row) => [row.activity_id, row]));
const allNewIdentityClasses = new Set(decisions.decisions.flatMap((decision) => (decision.new_polity_targets || []).map((target) => target.identity_class)));
const seenActivities = new Set();
const seenDecisionIds = new Set();
let assertions = 0;
let correctionActivities = 0;

function validateBoundary(boundary, label) {
  if (!boundary) throw new Error(`${label}: missing boundary`);
  if (!Number.isInteger(boundary.year) || boundary.year === 0) throw new Error(`${label}: invalid historical year`);
  if (!['year','month','day'].includes(boundary.granularity)) throw new Error(`${label}: invalid granularity`);
  if (!['exact','approximate','uncertain'].includes(boundary.certainty)) throw new Error(`${label}: invalid certainty`);
  if (!boundary.calendar) throw new Error(`${label}: missing calendar`);
  if (boundary.granularity === 'year' && (boundary.month !== null || boundary.day !== null)) throw new Error(`${label}: year precision cannot carry month/day`);
  if (boundary.granularity === 'month' && (!Number.isInteger(boundary.month) || boundary.day !== null)) throw new Error(`${label}: invalid month precision`);
  if (boundary.granularity === 'day' && (!Number.isInteger(boundary.month) || !Number.isInteger(boundary.day))) throw new Error(`${label}: invalid day precision`);
}

for (const decision of decisions.decisions) {
  if (!decision.id || seenDecisionIds.has(decision.id)) throw new Error(`duplicate/missing relation decision id ${decision.id}`);
  if (!decision.activity_id || seenActivities.has(decision.activity_id)) throw new Error(`duplicate/missing Activity ${decision.activity_id}`);
  seenDecisionIds.add(decision.id);
  seenActivities.add(decision.activity_id);
  const row = ledgerByActivity.get(decision.activity_id);
  if (!row) throw new Error(`${decision.id}: Activity absent from ledger`);
  if (row.person?.canonical !== decision.person || row.polity?.uuid !== decision.current_polity_uuid || row.polity?.canonical !== decision.current_polity) throw new Error(`${decision.id}: exact current identity binding drift`);
  if (!(row.audit?.dependencies || []).includes('polity_relation_model')) throw new Error(`${decision.id}: expected polity_relation_model blocker absent`);
  if (decision.production_mutation_authorized !== false) throw new Error(`${decision.id}: Production mutation forbidden`);
  if (!decision.source_contract || !fs.existsSync(decision.source_contract)) throw new Error(`${decision.id}: source contract missing`);
  if (!Array.isArray(decision.required_later_actions) || decision.required_later_actions.length === 0) throw new Error(`${decision.id}: downstream actions missing`);

  for (const target of decision.new_polity_targets || []) {
    if (!target.identity_class || target.polity_uuid !== null || target.verified_absent_from_baseline_a !== true) throw new Error(`${decision.id}: invalid new Polity target`);
  }
  for (const assertion of decision.relation_assertions || []) {
    if (!assertion.relation_type) throw new Error(`${decision.id}: relation type missing`);
    for (const [side, endpoint] of [['subject', assertion.subject], ['object', assertion.object]]) {
      if (endpoint?.kind === 'existing_polity') {
        if (!endpoint.polity_uuid || !polityIds.has(endpoint.polity_uuid)) throw new Error(`${decision.id}: ${side} existing Polity UUID invalid`);
      } else if (endpoint?.kind === 'new_polity') {
        if (endpoint.polity_uuid !== null || !endpoint.identity_class || !allNewIdentityClasses.has(endpoint.identity_class)) throw new Error(`${decision.id}: ${side} new Polity reference invalid`);
      } else {
        throw new Error(`${decision.id}: ${side} endpoint kind invalid`);
      }
    }
    validateBoundary(assertion.start, `${decision.id}.start`);
    validateBoundary(assertion.end, `${decision.id}.end`);
    if (assertion.source_normalization_status !== 'P5_P7_SOURCE_AUTHORING_REQUIRED') throw new Error(`${decision.id}: source normalization gate missing`);
    assertions += 1;
  }
  if (decision.activity_correction_required === true) correctionActivities += 1;

  row.audit.pre_polity_relation_decision = {
    decision: row.audit?.decision ?? null,
    relation_hint: row.audit?.relation_hint ?? null,
    execution_class: row.audit?.execution_class ?? null,
    dependencies: [...(row.audit?.dependencies || [])],
    primary_source: row.audit?.primary_source ?? null
  };
  row.audit.dependencies = [...new Set((row.audit?.dependencies || []).filter((dep) => dep !== 'polity_relation_model'))].sort();
  row.audit.polity_relation_decision = {
    id: decision.id,
    status: 'P3_POLITY_RELATION_MODEL_DECIDED_IMPLEMENTATION_PENDING',
    model_decision: decision.model_decision,
    relation_assertions: decision.relation_assertions || [],
    relation_policy: decision.relation_policy ?? null,
    new_polity_targets: decision.new_polity_targets || [],
    activity_correction_required: Boolean(decision.activity_correction_required),
    required_later_actions: decision.required_later_actions,
    source_contract: decision.source_contract,
    production_mutation_authorized: false
  };
}

const dependencyCounts = {};
const executionCounts = {};
const primaryCounts = {};
for (const row of ledger.rows) {
  for (const dep of row.audit?.dependencies || []) dependencyCounts[dep] = (dependencyCounts[dep] || 0) + 1;
  executionCounts[row.audit.execution_class] = (executionCounts[row.audit.execution_class] || 0) + 1;
  primaryCounts[row.audit.decision] = (primaryCounts[row.audit.decision] || 0) + 1;
}
ledger.summary.dependency_counts = Object.fromEntries(Object.entries(dependencyCounts).sort());
ledger.summary.execution_class_counts = Object.fromEntries(Object.entries(executionCounts).sort());
ledger.summary.primary_decision_counts = Object.fromEntries(Object.entries(primaryCounts).sort());
ledger.summary.p3_polity_relation_dependency_total = 14;
ledger.summary.p3_polity_relation_decisions_applied = seenActivities.size;
ledger.summary.p3_polity_relation_decisions_unresolved = ledger.summary.dependency_counts.polity_relation_model || 0;
ledger.summary.p3_polity_relation_assertions_reviewed = assertions;
ledger.summary.p3_polity_relation_new_polity_classes = allNewIdentityClasses.size;
ledger.summary.p3_polity_relation_activity_corrections_required = correctionActivities;
ledger.generated_from.polity_relation_decisions = decisionsPath;

if (seenActivities.size !== 14 || assertions !== 10 || correctionActivities !== 12 || allNewIdentityClasses.size !== 11) throw new Error(`P3 relation closure count drift activities=${seenActivities.size} assertions=${assertions} corrections=${correctionActivities} new=${allNewIdentityClasses.size}`);
if ((ledger.summary.dependency_counts.polity_relation_model || 0) !== 0) throw new Error('polity_relation_model blocker remains after reviewed decisions');

fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
console.log(JSON.stringify({
  marker: 'ATLAS_BASELINE_A_POLITY_RELATION_DECISIONS_OK',
  baseline_digest: expectedDigest,
  decisions_applied: 14,
  unresolved: 0,
  relation_assertions_reviewed: assertions,
  new_polity_classes_referenced: allNewIdentityClasses.size,
  activity_corrections_required: correctionActivities,
  production_mutation_authorized: false
}, null, 2));
