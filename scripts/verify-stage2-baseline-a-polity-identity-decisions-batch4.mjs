import fs from 'node:fs';

const [intakePath, ledgerPath, decisionsPath] = process.argv.slice(2);
if (!intakePath || !ledgerPath || !decisionsPath) {
  throw new Error('usage: node scripts/verify-stage2-baseline-a-polity-identity-decisions-batch4.mjs <intake> <ledger> <decisions>');
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
if (decisions.batch?.id !== 'p4_polity_identity_batch_4_low_risk_reuse_alias_state_form' || Number(decisions.batch?.sequence) !== 4) throw new Error('unexpected P4 Polity batch 4 identity');
if (Number(decisions.batch?.applied_before_batch) !== 29 || Number(decisions.batch?.expected_applied_after_batch) !== 39) throw new Error('P4 Polity batch 4 ordering counters drift');
if (Number(ledger.summary?.p4_polity_identity_decisions_applied || 0) !== 29 || Number(ledger.summary?.p4_polity_identity_decisions_unresolved || 0) !== 20) throw new Error('batch 4 must verify against the batch-3-overlaid ledger');

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
if (!Array.isArray(decisions.decisions) || decisions.decisions.length !== 10) throw new Error(`expected P4 Polity batch 4 of 10 decisions, got ${decisions.decisions?.length ?? 'invalid'}`);

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
    if (decision.target_polity_uuid !== null || decision.baseline_absence_verified !== true) throw new Error(`${decision.id}: invalid NEW_POLITY_REQUIRED marker`);
  }
}

const byId = new Map(decisions.decisions.map((d) => [d.id, d]));

const hiawathaSurvivor = '1fa78018-e3af-55c3-8b8e-1bf7ad1c4b08';
const hiawathaDuplicate = 'c591bebb-90a3-5a96-90c5-9870ddd7f637';
if ((polityReferenceCounts.get(hiawathaSurvivor) || 0) !== 1 || (polityReferenceCounts.get(hiawathaDuplicate) || 0) !== 1) throw new Error('Hiawatha confederacy reference-count evidence drift');
if (hiawathaSurvivor.localeCompare(hiawathaDuplicate) > 0) throw new Error('Hiawatha lexical survivor rule drift');
if (byId.get('hiawatha_haudenosaunee_duplicate_merge')?.target_polity_uuid !== hiawathaSurvivor) throw new Error('Hiawatha duplicate survivor binding drift');
if (byId.get('hiawatha_iroquois_survivor_reuse')?.target_polity_uuid !== hiawathaSurvivor) throw new Error('Hiawatha survivor reuse drift');

const swedenSurvivor = '93613017-b4c4-5f82-8e96-3ce6b2d3a61e';
const swedishEmpireDuplicate = 'efc86adb-7fc7-5efe-9c4d-7cd8e224890f';
if ((polityReferenceCounts.get(swedenSurvivor) || 0) !== 1 || (polityReferenceCounts.get(swedishEmpireDuplicate) || 0) !== 1) throw new Error('Sweden reference-count evidence drift');
if (swedenSurvivor.localeCompare(swedishEmpireDuplicate) > 0) throw new Error('Sweden lexical survivor rule drift');
const christina = byId.get('christina_swedish_empire_merge_to_stable_sweden');
if (christina?.target_polity_uuid !== swedenSurvivor || christina?.target_disposition !== 'MERGE_TO_EXISTING_SURVIVOR') throw new Error('Christina stable Sweden binding drift');

const japanSurvivor = '7f146e58-c3e9-5af7-8cb8-346f03cd7cf6';
const japanDuplicate = 'e029b047-544a-52c7-8897-4e494ac72af4';
if ((polityReferenceCounts.get(japanSurvivor) || 0) !== 2 || (polityReferenceCounts.get(japanDuplicate) || 0) !== 2) throw new Error('Japan reference-count evidence drift');
if (japanSurvivor.localeCompare(japanDuplicate) > 0) throw new Error('Japan lexical survivor rule drift');
const meiji = byId.get('meiji_empire_of_japan_stable_japan_survivor');
if (meiji?.target_polity_uuid !== japanSurvivor || meiji?.target_identity_class !== 'STABLE_JAPAN_POLITICAL_ACTOR') throw new Error('Meiji stable Japan binding drift');

const rsfsr = '09528a4d-4b32-5ca5-8a10-fbe9687679df';
const ussr = 'c7ddf754-0faa-576f-af97-9d322cf64f01';
const liveBindings = JSON.parse(fs.readFileSync('stage2/integration/baseline-a-live-polity-bindings.v1.json', 'utf8'));
const rsfsrRelation = (liveBindings.structural_relations || []).find((r) => r.id === 'rsfsr_constituent_of_ussr');
if (!rsfsrRelation || rsfsrRelation.subject?.polity_uuid !== rsfsr || rsfsrRelation.object?.polity_uuid !== ussr || rsfsrRelation.relation_type !== 'constituent_of') throw new Error('RSFSR constituent-of USSR live binding drift');
const leninRussia = byId.get('lenin_soviet_russia_keep_distinct_constituent');
const leninUnion = byId.get('lenin_soviet_union_keep_distinct_union');
if (leninRussia?.target_polity_uuid !== rsfsr || leninRussia?.target_disposition !== 'KEEP_DISTINCT') throw new Error('Lenin Soviet Russia identity drift');
if (leninUnion?.target_polity_uuid !== ussr || leninUnion?.target_disposition !== 'KEEP_DISTINCT') throw new Error('Lenin Soviet Union identity drift');

for (const [id, uuid] of [
  ['trung_trac_short_lived_polity_reuse','afcb601e-5f7b-5e88-8185-6b45134fbfc4'],
  ['osman_early_ottoman_polity_reuse','6d1520e2-0aff-5063-b2b7-95eb86daf372'],
  ['machiavelli_florence_identity_reuse_regime_split','00626a6e-afee-5830-8b0d-c08999857e82'],
  ['moctezuma_aztec_triple_alliance_identity_reuse','86c66d1b-41bc-5e77-8d6a-dd569014a6ad']
]) {
  const d = byId.get(id);
  if (d?.target_disposition !== 'REUSE_CURRENT_UUID' || d?.target_polity_uuid !== uuid) throw new Error(`${id}: exact reuse binding drift`);
}

const result = decisions.result || {};
if (Number(result.decisions_recorded) !== 10 || Number(result.activity_dependencies_covered_this_batch) !== 10) throw new Error('batch 4 decision counters drift');
if (Number(result.activity_dependencies_applied_before_batch) !== 29 || Number(result.activity_dependencies_applied_after_batch) !== 39 || Number(result.activity_dependencies_remaining_after_batch) !== 10) throw new Error('batch 4 cumulative counters drift');
if (Number(result.existing_uuid_reuses_in_this_batch) !== reuse || reuse !== 6) throw new Error(`batch 4 reuse count drift ${reuse}`);
if (Number(result.duplicate_polity_merges_to_existing_survivor_in_this_batch) !== merge || merge !== 2) throw new Error(`batch 4 merge count drift ${merge}`);
if (Number(result.keep_distinct_decisions_in_this_batch) !== keepDistinct || keepDistinct !== 2) throw new Error(`batch 4 KEEP_DISTINCT count drift ${keepDistinct}`);
if (Number(result.new_polities_required_in_this_batch) !== newPolities || newPolities !== 0) throw new Error(`batch 4 new Polity count drift ${newPolities}`);

console.log(JSON.stringify({
  marker: 'ATLAS_BASELINE_A_POLITY_IDENTITY_BATCH4_OK',
  baseline_digest: expectedDigest,
  decisions_verified: decisions.decisions.length,
  applied_before_batch: 29,
  applied_after_batch: 39,
  dependencies_remaining_after_batch: 10,
  existing_uuid_reuses: reuse,
  merge_to_existing_survivor: merge,
  keep_distinct_decisions: keepDistinct,
  new_polities_required: newPolities,
  production_mutation_authorized: false
}, null, 2));
