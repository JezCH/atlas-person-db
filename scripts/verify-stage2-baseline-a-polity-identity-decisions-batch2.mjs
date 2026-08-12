import fs from 'node:fs';

const [intakePath, ledgerPath, decisionsPath] = process.argv.slice(2);
if (!intakePath || !ledgerPath || !decisionsPath) {
  throw new Error('usage: node scripts/verify-stage2-baseline-a-polity-identity-decisions-batch2.mjs <intake> <ledger> <decisions>');
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
if (decisions.batch?.id !== 'p4_polity_identity_batch_2_east_asian_continuity' || Number(decisions.batch?.sequence) !== 2) throw new Error('unexpected P4 Polity batch 2 identity');
if (Number(decisions.batch?.applied_before_batch) !== 10 || Number(decisions.batch?.expected_applied_after_batch) !== 20) throw new Error('P4 Polity batch 2 ordering counters drift');
if (Number(ledger.summary?.p4_polity_identity_decisions_applied || 0) !== 10 || Number(ledger.summary?.p4_polity_identity_decisions_unresolved || 0) !== 39) throw new Error('batch 2 must verify against the batch-1-overlaid ledger');

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
if (!Array.isArray(decisions.decisions) || decisions.decisions.length !== 10) throw new Error(`expected P4 Polity batch 2 of 10 decisions, got ${decisions.decisions?.length ?? 'invalid'}`);

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
  if (!decision.reviewed_decision || !decision.target_identity_class || !decision.source_contract) throw new Error(`${decision.id}: incomplete decision contract`);
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

  for (const [index, target] of (decision.split_targets || []).entries()) {
    const context = `${decision.id}.split_targets[${index}]`;
    if (!allowed.has(target.target_disposition)) throw new Error(`${context}: unsupported disposition`);
    if (target.target_disposition === 'NEW_POLITY_REQUIRED') {
      newPolities += 1;
      assertNew(target, context);
    } else if (target.polity_uuid) {
      assertExisting(target.polity_uuid, context);
    }
  }
}

const byId = new Map(decisions.decisions.map((d) => [d.id, d]));
const easternHan = '3a29a08a-d111-50d5-916f-f5c11b5eabaf';
for (const id of ['gongsun_zan_eastern_han_regional_split','sun_ce_eastern_han_jiangdong_split']) {
  const d = byId.get(id);
  if (d?.target_polity_uuid !== easternHan || d?.split_targets?.length !== 2) throw new Error(`${id}: Eastern Han split contract drift`);
  if (!d.split_targets.some((t) => t.target_disposition === 'NEW_POLITY_REQUIRED' && t.polity_uuid === null)) throw new Error(`${id}: regional polity authoring marker missing`);
}

const guan = byId.get('guan_yu_continuous_liu_bei_polity');
if (guan?.target_polity_uuid !== '7d896087-e1ff-5c01-8e2f-ad984098135e' || guan?.target_identity_class !== 'LIU_BEI_CONTINUOUS_REGIONAL_TO_IMPERIAL_HAN_POLITY') throw new Error('Guan Yu continuity binding drift');

const yuanSurvivor = 'd035cbd8-e7b1-5947-8542-c7dd356d52bb';
const northernYuan = '986380c3-cc31-50d5-bb0d-6cae5fae0660';
const liveBindings = JSON.parse(fs.readFileSync('stage2/integration/baseline-a-live-polity-bindings.v1.json', 'utf8'));
const yuanFamily = (liveBindings.continuity_families || []).find((f) => f.id === 'yuan_northern_yuan_1368');
if (!yuanFamily || yuanFamily.canonical_survivor_uuid !== yuanSurvivor || yuanFamily.binding_status !== 'BOUND_SINGLE_STABLE_POLITY_SURVIVOR') throw new Error('Yuan continuity family binding drift');
for (const id of ['yuan_huizong_northern_yuan_merge','koke_temur_northern_yuan_merge']) {
  const d = byId.get(id);
  if (d?.current_polity?.uuid !== northernYuan || d?.target_polity_uuid !== yuanSurvivor || d?.target_disposition !== 'MERGE_TO_EXISTING_SURVIVOR') throw new Error(`${id}: Northern Yuan survivor binding drift`);
}
for (const id of ['kublai_stable_yuan_identity_from_1260','yuan_huizong_pre1368_survivor']) {
  const d = byId.get(id);
  if (d?.target_polity_uuid !== yuanSurvivor || d?.target_identity_class !== 'STABLE_YUAN_POLITICAL_ACTOR') throw new Error(`${id}: stable Yuan binding drift`);
}

const mingSurvivor = '756460ea-0f77-519e-9e91-43dfb694926a';
const mingDuplicate = '14113865-1569-521a-bae5-8ae070f4817d';
if ((polityReferenceCounts.get(mingSurvivor) || 0) !== 4 || (polityReferenceCounts.get(mingDuplicate) || 0) !== 1) throw new Error('Ming survivor reference-count evidence drift');
if (byId.get('yongle_ming_lowercase_duplicate_merge')?.target_polity_uuid !== mingSurvivor) throw new Error('Yongle duplicate survivor drift');
if (byId.get('yongle_ming_survivor_reuse')?.target_polity_uuid !== mingSurvivor) throw new Error('Yongle survivor reuse drift');

const result = decisions.result || {};
if (Number(result.decisions_recorded) !== 10 || Number(result.activity_dependencies_covered_this_batch) !== 10) throw new Error('batch 2 decision counters drift');
if (Number(result.activity_dependencies_applied_before_batch) !== 10 || Number(result.activity_dependencies_applied_after_batch) !== 20 || Number(result.activity_dependencies_remaining_after_batch) !== 29) throw new Error('batch 2 cumulative counters drift');
if (Number(result.existing_uuid_reuses_in_this_batch) !== reuse || reuse !== 5) throw new Error(`batch 2 reuse count drift ${reuse}`);
if (Number(result.duplicate_polity_merges_to_existing_survivor_in_this_batch) !== merge || merge !== 3) throw new Error(`batch 2 merge count drift ${merge}`);
if (Number(result.keep_distinct_split_decisions_in_this_batch) !== keepDistinct || keepDistinct !== 2) throw new Error(`batch 2 KEEP_DISTINCT count drift ${keepDistinct}`);
if (Number(result.new_polities_required_in_this_batch) !== newPolities || newPolities !== 2) throw new Error(`batch 2 new Polity count drift ${newPolities}`);

console.log(JSON.stringify({
  marker: 'ATLAS_BASELINE_A_POLITY_IDENTITY_BATCH2_OK',
  baseline_digest: expectedDigest,
  decisions_verified: decisions.decisions.length,
  applied_before_batch: 10,
  applied_after_batch: 20,
  dependencies_remaining_after_batch: 29,
  existing_uuid_reuses: reuse,
  merge_to_existing_survivor: merge,
  keep_distinct_split_decisions: keepDistinct,
  new_polities_required: newPolities,
  production_mutation_authorized: false
}, null, 2));
