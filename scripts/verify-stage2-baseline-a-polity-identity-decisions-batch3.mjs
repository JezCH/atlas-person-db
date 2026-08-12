import fs from 'node:fs';

const [intakePath, ledgerPath, decisionsPath] = process.argv.slice(2);
if (!intakePath || !ledgerPath || !decisionsPath) {
  throw new Error('usage: node scripts/verify-stage2-baseline-a-polity-identity-decisions-batch3.mjs <intake> <ledger> <decisions>');
}

const intake = JSON.parse(fs.readFileSync(intakePath, 'utf8'));
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const decisions = JSON.parse(fs.readFileSync(decisionsPath, 'utf8'));

const expectedDigest = 'sha256:44794e825831bc7869e391d4422ce174082c1d54813b1b97889fe5afb85c3c27';
const expectedDeployment = 'ad9a0ed0398bc2d13e4c8315305b01ce1adc4b79';
if (intake?.schema !== 'atlas-stage2-baseline-a-intake/v2') throw new Error('unsupported Baseline A intake schema');
if (ledger?.schema !== 'atlas-stage2-baseline-a-master-ledger/v2') throw new Error('unsupported Baseline A ledger schema');
if (decisions?.schema !== 'atlas-stage2-baseline-a-polity-identity-decisions/v1') throw new Error('unsupported Polity identity decision schema');
if (decisions.status !== 'P4_POLITY_IDENTITY_HANDOFF_PARTIAL_NO_PRODUCTION_MUTATION') throw new Error('unexpected P4 Polity identity handoff status');
if (intake.baseline_digest !== expectedDigest || ledger.baseline?.baseline_digest !== expectedDigest || decisions.baseline?.baseline_digest !== expectedDigest) throw new Error('Baseline A digest drift');
if (intake.deployment_sha !== expectedDeployment || ledger.baseline?.deployment_sha !== expectedDeployment || decisions.baseline?.deployment_sha !== expectedDeployment) throw new Error('Baseline A deployment SHA drift');
if (Number(intake.row_count) !== 338 || ledger.rows?.length !== 338 || Number(decisions.baseline?.activity_count) !== 338) throw new Error('Baseline A Activity count drift');
if (Number(decisions.baseline?.polity_identity_dependency_total) !== 49) throw new Error('P4 Polity identity dependency total drift');
if (decisions.batch?.id !== 'p4_polity_identity_batch_3_continuity_overlap_cleanup' || Number(decisions.batch?.sequence) !== 3) throw new Error('unexpected P4 Polity batch 3 identity');
if (Number(decisions.batch?.applied_before_batch) !== 20 || Number(decisions.batch?.expected_applied_after_batch) !== 29) throw new Error('P4 Polity batch 3 ordering counters drift');
if (Number(ledger.summary?.p4_polity_identity_decisions_applied || 0) !== 20 || Number(ledger.summary?.p4_polity_identity_decisions_unresolved || 0) !== 29) throw new Error('batch 3 must verify against the batch-2-overlaid ledger');

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

const allowed = new Set(['REUSE_CURRENT_UUID','MERGE_TO_EXISTING_SURVIVOR','KEEP_DISTINCT','NEW_POLITY_REQUIRED','REPLACE_WITH_GOVERNANCE','MIGRATE_TO_PEOPLE','MIGRATE_TO_EVENT','TEMPORAL_DESIGNATION_ONLY']);
if (JSON.stringify([...(decisions.allowed_target_dispositions || [])].sort()) !== JSON.stringify([...allowed].sort())) throw new Error('allowed target disposition contract drift');
if (!Array.isArray(decisions.decisions) || decisions.decisions.length !== 9) throw new Error(`expected P4 Polity batch 3 of 9 decisions, got ${decisions.decisions?.length ?? 'invalid'}`);

const activityById = new Map((intake.activity_rows || []).map((row) => [row.activity_id, row]));
const ledgerById = new Map((ledger.rows || []).map((row) => [row.activity_id, row]));
const polityById = new Map((intake.identity_catalogs?.polities || []).map((row) => [row.id, row]));
const polityReferenceCounts = new Map();
for (const row of intake.activity_rows || []) polityReferenceCounts.set(row.polity_id, (polityReferenceCounts.get(row.polity_id) || 0) + 1);

const existingDecisionIds = new Set(ledger.rows.map((row) => row.audit?.polity_identity_decision?.id).filter(Boolean));
const seenIds = new Set();
const seenActivities = new Set();
let reuse = 0;
let merge = 0;
let keepDistinct = 0;
let newPolities = 0;

function assertExisting(uuid, context) {
  if (!polityById.has(uuid)) throw new Error(`${context}: Polity UUID absent from Baseline A ${uuid}`);
}
function assertNew(target, context) {
  const uuid = Object.prototype.hasOwnProperty.call(target, 'polity_uuid') ? target.polity_uuid : target.target_polity_uuid;
  if (uuid !== null) throw new Error(`${context}: NEW_POLITY_REQUIRED must keep UUID null`);
  if (target.baseline_absence_verified !== true) throw new Error(`${context}: missing Baseline A absence marker`);
  if (!target.identity_class && !target.target_identity_class) throw new Error(`${context}: missing reviewed identity class`);
}

for (const decision of decisions.decisions) {
  if (!decision.id || seenIds.has(decision.id) || existingDecisionIds.has(decision.id)) throw new Error(`duplicate/already-applied decision id ${decision.id}`);
  if (!decision.activity_id || seenActivities.has(decision.activity_id)) throw new Error(`duplicate/missing Activity ${decision.activity_id}`);
  seenIds.add(decision.id);
  seenActivities.add(decision.activity_id);
  if (!allowed.has(decision.target_disposition)) throw new Error(`${decision.id}: unsupported target disposition`);

  const activity = activityById.get(decision.activity_id);
  const row = ledgerById.get(decision.activity_id);
  if (!activity || !row) throw new Error(`${decision.id}: exact Baseline A Activity missing`);
  if (activity.person_id !== decision.person_id || row.person?.uuid !== decision.person_id) throw new Error(`${decision.id}: Person UUID mismatch`);
  if (activity.person_name_en !== decision.person || row.person?.canonical !== decision.person) throw new Error(`${decision.id}: Person canonical mismatch`);
  if (activity.polity_id !== decision.current_polity?.uuid || row.polity?.uuid !== decision.current_polity?.uuid) throw new Error(`${decision.id}: current Polity UUID mismatch`);
  if (activity.polity_canonical_key !== decision.current_polity?.canonical_key || row.polity?.canonical !== decision.current_polity?.canonical_key) throw new Error(`${decision.id}: current Polity canonical mismatch`);
  if (!(row.audit?.dependencies || []).includes('polity_identity_model') || row.audit?.execution_class !== 'BLOCKED_POLITY_IDENTITY') throw new Error(`${decision.id}: not a current unresolved Polity identity blocker`);
  if (!decision.reviewed_decision || !decision.target_identity_class || !decision.source_contract || !decision.continuity_family) throw new Error(`${decision.id}: incomplete continuity decision contract`);
  if (!Array.isArray(decision.required_later_actions) || decision.required_later_actions.length === 0) throw new Error(`${decision.id}: downstream actions missing`);
  if (!Array.isArray(decision.p5_p6_dependencies) || decision.p5_p6_dependencies.length === 0) throw new Error(`${decision.id}: P5/P6 dependencies missing`);
  if (!fs.existsSync(decision.source_contract)) throw new Error(`${decision.id}: source contract missing ${decision.source_contract}`);

  if (decision.target_disposition === 'REUSE_CURRENT_UUID') {
    reuse += 1;
    if (decision.target_polity_uuid !== decision.current_polity.uuid) throw new Error(`${decision.id}: reuse target must equal current UUID`);
    assertExisting(decision.target_polity_uuid, decision.id);
  } else if (decision.target_disposition === 'MERGE_TO_EXISTING_SURVIVOR') {
    merge += 1;
    if (!decision.target_polity_uuid || decision.target_polity_uuid === decision.current_polity.uuid) throw new Error(`${decision.id}: invalid merge survivor`);
    assertExisting(decision.target_polity_uuid, decision.id);
    const currentRefs = polityReferenceCounts.get(decision.current_polity.uuid) || 0;
    const survivorRefs = polityReferenceCounts.get(decision.target_polity_uuid) || 0;
    if (survivorRefs < currentRefs) throw new Error(`${decision.id}: survivor violates reference-count policy`);
    if (survivorRefs === currentRefs && decision.target_polity_uuid.localeCompare(decision.current_polity.uuid) > 0) throw new Error(`${decision.id}: survivor violates lexical tie-break policy`);
  } else if (decision.target_disposition === 'KEEP_DISTINCT') {
    keepDistinct += 1;
    if (decision.target_polity_uuid !== decision.current_polity.uuid) throw new Error(`${decision.id}: KEEP_DISTINCT primary target must be current UUID`);
    assertExisting(decision.target_polity_uuid, decision.id);
  } else if (decision.target_disposition === 'NEW_POLITY_REQUIRED') {
    newPolities += 1;
    assertNew(decision, decision.id);
  }
}

const byId = new Map(decisions.decisions.map((d) => [d.id, d]));
const liveBindings = JSON.parse(fs.readFileSync('stage2/integration/baseline-a-live-polity-bindings.v1.json', 'utf8'));
const families = new Map((liveBindings.continuity_families || []).map((family) => [family.id, family]));

const roman = families.get('roman_eastern_roman_395');
if (!roman || roman.binding_status !== 'BOUND_DISTINCT_WITH_CONTINUITY_METADATA' || roman.canonical_survivor_uuid !== null) throw new Error('Roman/Eastern Roman continuity family binding drift');
const romanUuid = '5d9a6186-bbe6-5d1a-ba93-02190ae4c417';
const easternRomanUuid = '074510f4-f2e7-5795-8cfb-2a4206fa7254';
const romanMembers = new Set((roman.members || []).map((m) => m.polity_uuid));
if (!romanMembers.has(romanUuid) || !romanMembers.has(easternRomanUuid) || romanMembers.size !== 2) throw new Error('Roman/Eastern Roman exact UUID membership drift');
for (const id of ['hypatia_pre395_roman_context','hypatia_spanning_roman_activity_retirement']) {
  if (byId.get(id)?.target_polity_uuid !== romanUuid) throw new Error(`${id}: Roman UUID drift`);
}
if (byId.get('hypatia_post395_eastern_roman_context')?.target_polity_uuid !== easternRomanUuid) throw new Error('Hypatia post-395 Eastern Roman UUID drift');
if (byId.get('hypatia_spanning_roman_activity_retirement')?.activity_disposition !== 'RETIRE_AFTER_REVIEWED_PRE395_AND_POST395_PHASE_ROWS_ARE_PRESERVED') throw new Error('Hypatia spanning Activity retirement handoff missing');

const russia = families.get('russia_1721_empire');
const russiaSurvivor = 'dd07fc4c-b3ac-59ac-bdf2-9cc190893327';
const tsardomDuplicate = '8e0c3472-867d-5165-89c2-cb7866f6a5ed';
if (!russia || russia.binding_status !== 'BOUND_SINGLE_STABLE_POLITY_SURVIVOR' || russia.canonical_survivor_uuid !== russiaSurvivor) throw new Error('Russia continuity family binding drift');
if ((polityReferenceCounts.get(russiaSurvivor) || 0) !== 3 || (polityReferenceCounts.get(tsardomDuplicate) || 0) !== 1) throw new Error('Russia survivor reference-count evidence drift');
const peterTsardom = byId.get('peter_tsardom_merge_to_stable_russia');
if (peterTsardom?.current_polity?.uuid !== tsardomDuplicate || peterTsardom?.target_polity_uuid !== russiaSurvivor || peterTsardom?.target_disposition !== 'MERGE_TO_EXISTING_SURVIVOR') throw new Error('Peter Tsardom survivor binding drift');
for (const id of ['peter_backprojected_russian_empire_activity_retirement','peter_post1721_stable_russia_reuse']) {
  if (byId.get(id)?.target_polity_uuid !== russiaSurvivor) throw new Error(`${id}: stable Russia UUID drift`);
}
if (byId.get('peter_backprojected_russian_empire_activity_retirement')?.activity_disposition !== 'RETIRE_AFTER_TSAR_AND_EMPEROR_PHASE_ROWS_ARE_PRESERVED') throw new Error('Peter compressed Activity retirement handoff missing');

const portugal = families.get('portugal_united_kingdom_1815');
const portugalUuid = '356c77d1-f2e1-5ad8-8716-e06d9fb3cdcc';
const unionUuid = '3b8f7efc-40ae-5a33-8956-e9e852fbede4';
if (!portugal || portugal.binding_status !== 'BOUND_DISTINCT_POLITIES' || portugal.canonical_survivor_uuid !== null) throw new Error('Portugal/Union continuity family binding drift');
const portugalMembers = new Set((portugal.members || []).map((m) => m.polity_uuid));
if (!portugalMembers.has(portugalUuid) || !portugalMembers.has(unionUuid) || portugalMembers.size !== 2) throw new Error('Portugal/Union exact UUID membership drift');
for (const id of ['maria_pre1815_portugal_reuse','maria_overlapping_portugal_activity_retirement']) {
  if (byId.get(id)?.target_polity_uuid !== portugalUuid) throw new Error(`${id}: Portugal UUID drift`);
}
const mariaUnion = byId.get('maria_distinct_1815_union_keep');
if (mariaUnion?.target_polity_uuid !== unionUuid || mariaUnion?.target_disposition !== 'KEEP_DISTINCT') throw new Error('Maria distinct union identity drift');
if (byId.get('maria_overlapping_portugal_activity_retirement')?.activity_disposition !== 'RETIRE_AFTER_PRE1815_PORTUGAL_AND_POST1815_UNION_ROWS_ARE_PRESERVED') throw new Error('Maria overlapping Activity retirement handoff missing');

const result = decisions.result || {};
if (Number(result.decisions_recorded) !== 9 || Number(result.activity_dependencies_covered_this_batch) !== 9) throw new Error('batch 3 decision counters drift');
if (Number(result.activity_dependencies_applied_before_batch) !== 20 || Number(result.activity_dependencies_applied_after_batch) !== 29 || Number(result.activity_dependencies_remaining_after_batch) !== 20) throw new Error('batch 3 cumulative counters drift');
if (Number(result.existing_uuid_reuses_in_this_batch) !== reuse || reuse !== 7) throw new Error(`batch 3 reuse count drift ${reuse}`);
if (Number(result.duplicate_polity_merges_to_existing_survivor_in_this_batch) !== merge || merge !== 1) throw new Error(`batch 3 merge count drift ${merge}`);
if (Number(result.keep_distinct_decisions_in_this_batch) !== keepDistinct || keepDistinct !== 1) throw new Error(`batch 3 KEEP_DISTINCT count drift ${keepDistinct}`);
if (Number(result.new_polities_required_in_this_batch) !== newPolities || newPolities !== 0) throw new Error(`batch 3 new Polity count drift ${newPolities}`);

console.log(JSON.stringify({
  marker: 'ATLAS_BASELINE_A_POLITY_IDENTITY_BATCH3_OK',
  baseline_digest: expectedDigest,
  decisions_verified: decisions.decisions.length,
  applied_before_batch: 20,
  applied_after_batch: 29,
  dependencies_remaining_after_batch: 20,
  existing_uuid_reuses: reuse,
  merge_to_existing_survivor: merge,
  keep_distinct_decisions: keepDistinct,
  new_polities_required: newPolities,
  production_mutation_authorized: false
}, null, 2));
