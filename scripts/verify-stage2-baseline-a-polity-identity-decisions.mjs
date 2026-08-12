import fs from 'node:fs';

const [intakePath, ledgerPath, decisionsPath] = process.argv.slice(2);
if (!intakePath || !ledgerPath || !decisionsPath) {
  throw new Error('usage: node scripts/verify-stage2-baseline-a-polity-identity-decisions.mjs <intake> <ledger> <decisions>');
}

const intake = JSON.parse(fs.readFileSync(intakePath, 'utf8'));
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const decisions = JSON.parse(fs.readFileSync(decisionsPath, 'utf8'));

if (intake?.schema !== 'atlas-stage2-baseline-a-intake/v2') throw new Error('unsupported Baseline A intake schema');
if (ledger?.schema !== 'atlas-stage2-baseline-a-master-ledger/v2') throw new Error('unsupported Baseline A ledger schema');
if (decisions?.schema !== 'atlas-stage2-baseline-a-polity-identity-decisions/v1') throw new Error('unsupported Polity identity decision schema');
if (decisions.status !== 'P4_POLITY_IDENTITY_HANDOFF_PARTIAL_NO_PRODUCTION_MUTATION') throw new Error('unexpected P4 Polity identity handoff status');

const expectedDigest = 'sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27';
const expectedDeployment = 'ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79';
if (intake.baseline_digest !== expectedDigest || ledger.baseline?.baseline_digest !== expectedDigest || decisions.baseline?.baseline_digest !== expectedDigest) throw new Error('Baseline A digest drift');
if (intake.deployment_sha !== expectedDeployment || ledger.baseline?.deployment_sha !== expectedDeployment || decisions.baseline?.deployment_sha !== expectedDeployment) throw new Error('Baseline A deployment SHA drift');
if (Number(intake.row_count) !== 338 || Number(decisions.baseline?.activity_count) !== 338 || ledger.rows?.length !== 338) throw new Error('Baseline A Activity count drift');
if (Number(decisions.baseline?.polity_identity_dependency_total) !== 49) throw new Error('P4 Polity identity dependency total drift');

const rules = decisions.rules || {};
for (const key of [
  'uuid_is_identity',
  'exact_activity_uuid_binding_required',
  'exact_current_polity_uuid_binding_required',
  'name_only_binding_forbidden',
  'reviewed_research_reused_without_reopening_generic_historical_research',
  'new_polity_uuid_must_not_be_invented_before_authoring',
  'current_invalid_polity_may_be_retired_only_after_all_references_are_relinked',
  'temporal_designation_does_not_create_a_new_polity_identity',
  'people_event_place_context_must_not_be_forced_into_polity_identity'
]) {
  if (rules[key] !== true) throw new Error(`missing P4 safety rule ${key}`);
}
if (rules.production_mutation_authorized !== false || decisions.result?.production_mutation_authorized !== false) throw new Error('P4 Polity identity handoff must remain non-mutating');

const allowed = new Set([
  'REUSE_CURRENT_UUID',
  'MERGE_TO_EXISTING_SURVIVOR',
  'KEEP_DISTINCT',
  'NEW_POLITY_REQUIRED',
  'REPLACE_WITH_GOVERNANCE',
  'MIGRATE_TO_PEOPLE',
  'MIGRATE_TO_EVENT',
  'TEMPORAL_DESIGNATION_ONLY'
]);
if (JSON.stringify([...(decisions.allowed_target_dispositions || [])].sort()) !== JSON.stringify([...allowed].sort())) throw new Error('allowed target disposition contract drift');
if (!Array.isArray(decisions.decisions) || decisions.decisions.length !== 10) throw new Error(`expected first P4 Polity batch of 10 decisions, got ${decisions.decisions?.length ?? 'invalid'}`);

const activityById = new Map((intake.activity_rows || []).map((row) => [row.activity_id, row]));
const ledgerById = new Map((ledger.rows || []).map((row) => [row.activity_id, row]));
const polityById = new Map((intake.identity_catalogs?.polities || []).map((row) => [row.id, row]));
const polityReferenceCounts = new Map();
for (const row of intake.activity_rows || []) polityReferenceCounts.set(row.polity_id, (polityReferenceCounts.get(row.polity_id) || 0) + 1);

const seenIds = new Set();
const seenActivities = new Set();
let topLevelReuse = 0;
let mergeToSurvivor = 0;
let newPolitiesRequired = 0;

function assertExistingPolity(uuid, context) {
  const polity = polityById.get(uuid);
  if (!polity) throw new Error(`${context}: target Polity UUID ${uuid} absent from exact Baseline A catalog`);
  return polity;
}

function assertNewPolityMarker(target, context) {
  if (target.polity_uuid !== null && target.target_polity_uuid !== null) throw new Error(`${context}: new Polity requirement must not invent a UUID`);
  if (target.baseline_absence_verified !== true) throw new Error(`${context}: missing exact Baseline A absence marker`);
  if (!target.identity_class && !target.target_identity_class) throw new Error(`${context}: missing reviewed target identity class`);
}

for (const decision of decisions.decisions) {
  if (!decision.id || seenIds.has(decision.id)) throw new Error(`duplicate or missing P4 decision id ${decision.id}`);
  if (!decision.activity_id || seenActivities.has(decision.activity_id)) throw new Error(`duplicate or missing P4 Activity ${decision.activity_id}`);
  seenIds.add(decision.id);
  seenActivities.add(decision.activity_id);

  if (!allowed.has(decision.target_disposition)) throw new Error(`${decision.id}: unsupported target disposition ${decision.target_disposition}`);
  const activity = activityById.get(decision.activity_id);
  const ledgerRow = ledgerById.get(decision.activity_id);
  if (!activity || !ledgerRow) throw new Error(`${decision.id}: exact Baseline A Activity missing`);
  if (activity.person_id !== decision.person_id || ledgerRow.person?.uuid !== decision.person_id) throw new Error(`${decision.id}: Person UUID mismatch`);
  if (activity.person_name_en !== decision.person || ledgerRow.person?.canonical !== decision.person) throw new Error(`${decision.id}: Person canonical name mismatch`);
  if (activity.polity_id !== decision.current_polity?.uuid || ledgerRow.polity?.uuid !== decision.current_polity?.uuid) throw new Error(`${decision.id}: current Polity UUID mismatch`);
  if (activity.polity_canonical_key !== decision.current_polity?.canonical_key || ledgerRow.polity?.canonical !== decision.current_polity?.canonical_key) throw new Error(`${decision.id}: current Polity canonical key mismatch`);
  if (!(ledgerRow.audit?.dependencies || []).includes('polity_identity_model')) throw new Error(`${decision.id}: decision does not bind a current polity_identity_model dependency`);
  if (!decision.reviewed_decision || !decision.target_identity_class || !decision.source_contract) throw new Error(`${decision.id}: incomplete reviewed decision contract`);
  if (!Array.isArray(decision.required_later_actions) || decision.required_later_actions.length === 0) throw new Error(`${decision.id}: downstream actions missing`);
  if (!Array.isArray(decision.p5_p6_dependencies) || decision.p5_p6_dependencies.length === 0) throw new Error(`${decision.id}: P5/P6 dependencies missing`);
  if (!fs.existsSync(decision.source_contract)) throw new Error(`${decision.id}: source contract path does not exist: ${decision.source_contract}`);

  if (decision.target_disposition === 'REUSE_CURRENT_UUID') {
    topLevelReuse += 1;
    if (decision.target_polity_uuid !== decision.current_polity.uuid) throw new Error(`${decision.id}: reused target UUID must equal current UUID`);
    assertExistingPolity(decision.target_polity_uuid, decision.id);
  } else if (decision.target_disposition === 'MERGE_TO_EXISTING_SURVIVOR') {
    mergeToSurvivor += 1;
    if (!decision.target_polity_uuid || decision.target_polity_uuid === decision.current_polity.uuid) throw new Error(`${decision.id}: merge survivor must be a distinct existing UUID`);
    assertExistingPolity(decision.target_polity_uuid, decision.id);
    const currentRefs = polityReferenceCounts.get(decision.current_polity.uuid) || 0;
    const survivorRefs = polityReferenceCounts.get(decision.target_polity_uuid) || 0;
    if (survivorRefs < currentRefs) throw new Error(`${decision.id}: survivor violates Baseline A reference-count policy`);
    if (survivorRefs === currentRefs && decision.target_polity_uuid.localeCompare(decision.current_polity.uuid) > 0) throw new Error(`${decision.id}: survivor violates lexical UUID tie-break policy`);
  } else if (decision.target_disposition === 'NEW_POLITY_REQUIRED') {
    newPolitiesRequired += 1;
    if (decision.target_polity_uuid !== null) throw new Error(`${decision.id}: new Polity requirement must have null target UUID`);
    assertNewPolityMarker(decision, decision.id);
  } else if (decision.target_disposition === 'KEEP_DISTINCT') {
    if (decision.target_polity_uuid !== decision.current_polity.uuid) throw new Error(`${decision.id}: KEEP_DISTINCT must retain the exact current UUID as its primary target`);
    assertExistingPolity(decision.target_polity_uuid, decision.id);
  }

  if (Array.isArray(decision.split_targets)) {
    for (const [index, target] of decision.split_targets.entries()) {
      const context = `${decision.id}.split_targets[${index}]`;
      if (!allowed.has(target.target_disposition)) throw new Error(`${context}: unsupported split target disposition`);
      if (target.target_disposition === 'NEW_POLITY_REQUIRED') {
        newPolitiesRequired += 1;
        assertNewPolityMarker(target, context);
      } else if (target.polity_uuid) {
        assertExistingPolity(target.polity_uuid, context);
      }
    }
  }
}

const result = decisions.result || {};
if (Number(result.polity_identity_dependency_total) !== 49) throw new Error('P4 result dependency total drift');
if (Number(result.decisions_recorded) !== 10 || Number(result.activity_dependencies_covered) !== 10 || Number(result.activity_dependencies_remaining) !== 39) throw new Error('P4 first-batch progress counters drift');
if (Number(result.new_polities_required_in_this_batch) !== newPolitiesRequired || newPolitiesRequired !== 3) throw new Error(`new Polity count drift: ${newPolitiesRequired}`);
if (Number(result.existing_uuid_reuses_in_this_batch) !== topLevelReuse || topLevelReuse !== 6) throw new Error(`existing UUID reuse count drift: ${topLevelReuse}`);
if (Number(result.duplicate_polity_merges_to_existing_survivor_in_this_batch) !== mergeToSurvivor || mergeToSurvivor !== 1) throw new Error(`duplicate Polity merge count drift: ${mergeToSurvivor}`);

console.log(JSON.stringify({
  marker: 'ATLAS_BASELINE_A_POLITY_IDENTITY_DECISIONS_OK',
  baseline_digest: expectedDigest,
  decisions_verified: decisions.decisions.length,
  dependencies_remaining_for_handoff: 39,
  existing_uuid_reuses: topLevelReuse,
  merge_to_existing_survivor: mergeToSurvivor,
  new_polities_required: newPolitiesRequired,
  production_mutation_authorized: false
}, null, 2));
