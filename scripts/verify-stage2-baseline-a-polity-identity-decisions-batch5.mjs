import fs from 'node:fs';

const [intakePath, ledgerPath, decisionsPath] = process.argv.slice(2);
if (!intakePath || !ledgerPath || !decisionsPath) {
  throw new Error('usage: node scripts/verify-stage2-baseline-a-polity-identity-decisions-batch5.mjs <intake> <ledger> <decisions>');
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
if (decisions.batch?.id !== 'p4_polity_identity_batch_5_high_risk_authoring_migration' || Number(decisions.batch?.sequence) !== 5) throw new Error('unexpected P4 Polity batch 5 identity');
if (Number(decisions.batch?.applied_before_batch) !== 39 || Number(decisions.batch?.expected_applied_after_batch) !== 48) throw new Error('P4 Polity batch 5 ordering counters drift');
if (Number(ledger.summary?.p4_polity_identity_decisions_applied || 0) !== 39 || Number(ledger.summary?.p4_polity_identity_decisions_unresolved || 0) !== 10) throw new Error('batch 5 must verify against the batch-4-overlaid ledger');

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
if (!Array.isArray(decisions.decisions) || decisions.decisions.length !== 9) throw new Error(`expected P4 Polity batch 5 of 9 decisions, got ${decisions.decisions?.length ?? 'invalid'}`);

const activityById = new Map((intake.activity_rows || []).map((row) => [row.activity_id, row]));
const ledgerById = new Map((ledger.rows || []).map((row) => [row.activity_id, row]));
const polityById = new Map((intake.identity_catalogs?.polities || []).map((row) => [row.id, row]));
const existingDecisionIds = new Set(ledger.rows.map((row) => row.audit?.polity_identity_decision?.id).filter(Boolean));
const seenIds = new Set();
const seenActivities = new Set();
let topLevelNew = 0;
let keepDistinct = 0;
let migrateEvent = 0;
let migratePeople = 0;
let allNewTargets = 0;

function assertExisting(uuid, context) {
  if (!polityById.has(uuid)) throw new Error(`${context}: Polity UUID absent from Baseline A ${uuid}`);
}
function assertNew(target, context) {
  const uuid = Object.prototype.hasOwnProperty.call(target, 'polity_uuid') ? target.polity_uuid : target.target_polity_uuid;
  if (uuid !== null) throw new Error(`${context}: NEW_POLITY_REQUIRED must keep UUID null`);
  if (target.baseline_absence_verified !== true) throw new Error(`${context}: missing Baseline A absence marker`);
  if (!target.identity_class && !target.target_identity_class) throw new Error(`${context}: missing reviewed identity class`);
  allNewTargets += 1;
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

  if (decision.target_disposition === 'NEW_POLITY_REQUIRED') {
    topLevelNew += 1;
    assertNew(decision, decision.id);
  } else if (decision.target_disposition === 'KEEP_DISTINCT') {
    keepDistinct += 1;
    if (decision.target_polity_uuid !== decision.current_polity.uuid) throw new Error(`${decision.id}: KEEP_DISTINCT primary target must be current UUID`);
    assertExisting(decision.target_polity_uuid, decision.id);
  } else if (decision.target_disposition === 'MIGRATE_TO_EVENT') {
    migrateEvent += 1;
    if (decision.target_polity_uuid !== null) throw new Error(`${decision.id}: event migration must not keep current Polity UUID`);
  } else if (decision.target_disposition === 'MIGRATE_TO_PEOPLE') {
    migratePeople += 1;
    if (decision.target_polity_uuid !== null) throw new Error(`${decision.id}: people migration must not keep current Polity UUID`);
  } else {
    throw new Error(`${decision.id}: unexpected top-level disposition for high-risk batch 5`);
  }

  for (const [index, target] of (decision.split_targets || []).entries()) {
    const context = `${decision.id}.split_targets[${index}]`;
    if (!allowed.has(target.target_disposition)) throw new Error(`${context}: unsupported disposition`);
    if (target.target_disposition === 'NEW_POLITY_REQUIRED') assertNew(target, context);
    else if (target.target_disposition === 'REUSE_CURRENT_UUID') assertExisting(target.polity_uuid, context);
    else throw new Error(`${context}: unsupported batch-5 split disposition ${target.target_disposition}`);
  }
}

const byId = new Map(decisions.decisions.map((d) => [d.id, d]));

const rurik = byId.get('rurik_early_northern_rus_new_polity');
if (rurik?.current_polity?.uuid !== 'c068d786-ab71-5516-ad51-b682feba155a' || rurik?.target_polity_uuid !== null || rurik?.target_disposition !== 'NEW_POLITY_REQUIRED') throw new Error('Rurik early northern Rus authoring handoff drift');

const tang = '1e634515-5c04-5268-ae57-b4e160d6cf04';
const li = byId.get('li_keyong_tang_post907_jin_split');
if (li?.target_polity_uuid !== tang || li?.target_disposition !== 'KEEP_DISTINCT' || li?.split_targets?.length !== 2) throw new Error('Li Keyong split contract drift');
if (!li.split_targets.some((t) => t.target_disposition === 'REUSE_CURRENT_UUID' && t.polity_uuid === tang && t.relation === 'serves')) throw new Error('Li Keyong Tang service split missing');
if (!li.split_targets.some((t) => t.target_disposition === 'NEW_POLITY_REQUIRED' && t.polity_uuid === null && t.identity_class === 'LI_KEYONG_POST907_JIN_POLITICAL_ACTOR' && t.relation === 'rules')) throw new Error('Li Keyong post-907 Jin authoring split missing');
for (const [uuid, canonical, expectedPersons] of [
  ['ddf1b350-17ea-5275-bc33-e6d86ab4d868','Jin',new Set(['Duke Wen of Jin'])],
  ['6a9d6b63-15c9-5b1b-8fd5-29bbf0787dde','Jin Dynasty',new Set(['Emperor Taizu of Jin','Emperor Taizong of Jin'])],
  ['0c1849ca-e4ae-572b-bfe3-0253aa08d83a','Later Jin',new Set(['Nurhaci','Emperor Gaozu of Later Jin'])]
]) {
  const polity = polityById.get(uuid);
  if (!polity || polity.canonical_key !== canonical) throw new Error(`Li Keyong same-name candidate catalog drift ${uuid}`);
  const persons = new Set((intake.activity_rows || []).filter((a) => a.polity_id === uuid).map((a) => a.person_name_en));
  if (persons.size !== expectedPersons.size || [...expectedPersons].some((p) => !persons.has(p))) throw new Error(`Li Keyong same-name candidate evidence drift ${uuid}`);
  if (persons.has('Li Keyong')) throw new Error(`Li Keyong must not bind to unrelated Jin candidate ${uuid}`);
}

for (const [id, currentUuid] of [
  ['leftraru_mapuche_wartime_coalition_new_polity','af4a4701-8de7-565b-87b5-b46260efac11'],
  ['uesugi_kenshin_source_backed_territorial_polity','e07ee32e-e126-5511-9d3d-d29e4444bd9c'],
  ['oda_nobunaga_source_backed_territorial_polity','54433b65-1eb1-5c41-b440-6c4de8e18417'],
  ['pocatello_specific_band_new_polity_people_migration','7a61f46c-552c-5e36-b97e-5a4d99746872'],
  ['sitting_bull_hunkpapa_autonomous_authority_new_polity','2f75de03-b9e7-587a-95e8-812079c37075']
]) {
  const d = byId.get(id);
  if (d?.current_polity?.uuid !== currentUuid || d?.target_disposition !== 'NEW_POLITY_REQUIRED' || d?.target_polity_uuid !== null) throw new Error(`${id}: invalid new-authoring handoff`);
}

const william = byId.get('william_orange_dutch_revolt_event_and_authorities_split');
const spanish = 'b7f3e13a-4b68-5fd9-aad6-b2b951de0996';
if (william?.current_polity?.uuid !== 'ba7a7e2d-3ba5-5a54-a98f-88294d3429f7' || william?.target_disposition !== 'MIGRATE_TO_EVENT' || william?.target_polity_uuid !== null || william?.split_targets?.length !== 3) throw new Error('William of Orange event migration split drift');
if (!william.split_targets.some((t) => t.target_disposition === 'REUSE_CURRENT_UUID' && t.polity_uuid === spanish && t.relation === 'opposes')) throw new Error('William Spanish Monarchy opposition target missing');
if (william.split_targets.filter((t) => t.target_disposition === 'NEW_POLITY_REQUIRED' && t.polity_uuid === null && t.relation === 'governs').length !== 2) throw new Error('William Holland/Zeeland authoring targets drift');
if (!polityById.has(spanish)) throw new Error('Spanish Monarchy UUID missing from Baseline A');
if ((intake.identity_catalogs?.polities || []).some((p) => ['Holland','Zeeland'].includes(p.canonical_key))) throw new Error('Batch 5 assumes Holland/Zeeland absent from Baseline A, but exact catalog now contains one');

const poundmaker = byId.get('poundmaker_cree_people_to_two_community_polities');
if (poundmaker?.current_polity?.uuid !== 'd81dfb41-3afa-587a-8e1c-d6bc4e2dc5f6' || poundmaker?.target_disposition !== 'MIGRATE_TO_PEOPLE' || poundmaker?.split_targets?.length !== 2) throw new Error('Poundmaker people/community split drift');
if (poundmaker.split_targets.filter((t) => t.target_disposition === 'NEW_POLITY_REQUIRED' && t.polity_uuid === null).length !== 2) throw new Error('Poundmaker new community authoring targets drift');

const result = decisions.result || {};
if (Number(result.decisions_recorded) !== 9 || Number(result.activity_dependencies_covered_this_batch) !== 9) throw new Error('batch 5 decision counters drift');
if (Number(result.activity_dependencies_applied_before_batch) !== 39 || Number(result.activity_dependencies_applied_after_batch) !== 48 || Number(result.activity_dependencies_remaining_after_batch) !== 1) throw new Error('batch 5 cumulative counters drift');
if (Number(result.top_level_new_polity_required_in_this_batch) !== topLevelNew || topLevelNew !== 6) throw new Error(`batch 5 top-level new Polity count drift ${topLevelNew}`);
if (Number(result.keep_distinct_decisions_in_this_batch) !== keepDistinct || keepDistinct !== 1) throw new Error(`batch 5 KEEP_DISTINCT count drift ${keepDistinct}`);
if (Number(result.migrate_to_event_decisions_in_this_batch) !== migrateEvent || migrateEvent !== 1) throw new Error(`batch 5 event migration count drift ${migrateEvent}`);
if (Number(result.migrate_to_people_decisions_in_this_batch) !== migratePeople || migratePeople !== 1) throw new Error(`batch 5 people migration count drift ${migratePeople}`);
if (Number(result.new_polity_targets_total_in_this_batch) !== allNewTargets || allNewTargets !== 11) throw new Error(`batch 5 total new Polity target count drift ${allNewTargets}`);

const unresolvedIds = ledger.rows
  .filter((row) => (row.audit?.dependencies || []).includes('polity_identity_model'))
  .map((row) => row.activity_id)
  .filter((id) => !seenActivities.has(id));
if (unresolvedIds.length !== 1 || unresolvedIds[0] !== '4d543d48-a041-5f07-a900-560a50abaeee') throw new Error(`Batch 5 must leave only Shi Xie unresolved; got ${JSON.stringify(unresolvedIds)}`);

console.log(JSON.stringify({
  marker: 'ATLAS_BASELINE_A_POLITY_IDENTITY_BATCH5_OK',
  baseline_digest: expectedDigest,
  decisions_verified: decisions.decisions.length,
  applied_before_batch: 39,
  applied_after_batch: 48,
  dependencies_remaining_after_batch: 1,
  sole_remaining_activity: unresolvedIds[0],
  top_level_new_polity_required: topLevelNew,
  new_polity_targets_total: allNewTargets,
  keep_distinct_decisions: keepDistinct,
  migrate_to_event_decisions: migrateEvent,
  migrate_to_people_decisions: migratePeople,
  production_mutation_authorized: false
}, null, 2));
