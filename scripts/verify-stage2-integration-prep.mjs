import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'stage2/integration/stage2-baseline-independent-prep.v1.json');
const kublaiPath = path.join(root, 'research/mongol/stage2-kublai-pre1271-polity-territory-decision.v1.json');
const structuralRelationsPath = path.join(root, 'research/relations/stage2-structural-polity-relation-intervals.v1.json');
const continuityPath = path.join(root, 'stage2/contracts/polity-identity-continuity-current.v1.json');

function fail(message) {
  console.error(`Stage 2 integration prep verification failed: ${message}`);
  process.exit(1);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`cannot parse ${path.relative(root, file)}: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) fail(message);
}

const manifest = readJson(manifestPath);
assert(manifest.schema === 'atlas-stage2-baseline-independent-integration-prep/v1', 'unexpected integration manifest schema');
assert(manifest.production_mutation === false, 'integration preparation must not authorize Production mutation');
assert(manifest.baseline_policy?.old_346_binding_authoritative === false, 'old 346 binding must not remain authoritative');
assert(manifest.baseline_policy?.baseline_a_required_for_uuid_rebind === true, 'Baseline A UUID rebind must be mandatory');
assert(manifest.baseline_policy?.no_old_activity_uuid_write_targets === true, 'old Activity UUID write targets must be forbidden');
assert(Array.isArray(manifest.port_now) && manifest.port_now.length >= 10, 'baseline-independent port set is incomplete');
assert(Array.isArray(manifest.wait_for_baseline_a) && manifest.wait_for_baseline_a.length > 0, 'Baseline A wait set is missing');

const portIds = manifest.port_now.map((entry) => entry.id);
assert(new Set(portIds).size === portIds.length, 'duplicate port_now id');
const waitSet = new Set(manifest.wait_for_baseline_a);
for (const id of portIds) assert(!waitSet.has(id), `port_now and wait_for_baseline_a overlap: ${id}`);

for (const entry of manifest.port_now) {
  assert(typeof entry.path === 'string' && entry.path.length > 0, `missing path for ${entry.id}`);
  assert(fs.existsSync(path.join(root, entry.path)), `missing carried-forward evidence path: ${entry.path}`);
}

const rawManifest = fs.readFileSync(manifestPath, 'utf8');
assert(!/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i.test(rawManifest), 'integration manifest must not bind old UUID-shaped write targets');
assert(!/"authoritative_activity_count"\s*:\s*346/.test(rawManifest), 'old 346 Activity baseline cannot be revived as authority');

const requiredWait = [
  'fresh_master_ledger',
  'surviving_activity_uuid_bindings',
  'historical_correction_v2_manifests',
  'relation_type_row_backfill',
  'semantic_key_v2_activation',
  'person_physical_merge'
];
for (const item of requiredWait) assert(waitSet.has(item), `missing Baseline A dependency: ${item}`);

const kublai = readJson(kublaiPath);
assert(kublai.schema === 'atlas-stage2-kublai-pre1271-decision/v1', 'unexpected Qubilai decision schema');
assert(kublai.production_mutation === false, 'Qubilai research must not authorize Production mutation');
assert(kublai.person_activity_semantics_status === 'resolved', 'Qubilai Person Activity semantics must remain resolved');
assert(kublai.polity_identity?.stable_identity_start_year === 1260, 'Qubilai eastern Polity identity boundary must remain 1260');
assert(kublai.polity_identity?.great_yuan_designation_start_year === 1271, 'Great Yuan designation boundary must remain 1271');
assert(kublai.polity_identity?.reuse_one_future_polity_uuid_across_designation_boundary === true, '1271 designation change must not force a new Polity UUID');
assert(kublai.polity_identity?.invent_new_pre1271_polity === false, 'invented pre-1271 Qubilai Polity is forbidden');
assert(kublai.territory?.pre1271_geometry_status === 'unresolved', 'pre-1271 geometry must stay unresolved until map research');
assert(kublai.territory?.runtime_direct_control_geometry_authorized === false, 'unresolved pre-1271 geometry must not be Runtime direct control');
assert(kublai.territory?.semantic_cutover_blocker === false, 'unknown Qubilai geometry must not block Person semantic cutover');
assert(kublai.baseline_a_rebind_required === true, 'Qubilai Production bindings must wait for Baseline A');
assert(Array.isArray(kublai.source_urls) && kublai.source_urls.length >= 3, 'Qubilai decision needs multiple normalized research sources');

const structural = readJson(structuralRelationsPath);
assert(structural.schema === 'atlas-stage2-structural-polity-relation-interval-research/v1', 'unexpected structural relation research schema');
assert(structural.production_mutation === false, 'structural relation research must not authorize Production mutation');
assert(structural.baseline_a_uuid_rebind_required === true, 'structural relation UUID binding must wait for Baseline A');
assert(structural.production_approved === false, 'baseline-independent relation research cannot be Production approved');
assert(structural.rules?.person_activity_interval_is_not_polity_relation_interval === true, 'Person Activity intervals must not define Polity relation intervals');
assert(structural.rules?.unknown_boundary_must_remain_unknown === true, 'unknown relation boundaries must remain unknown');
assert(Array.isArray(structural.relations) && structural.relations.length === 4, 'expected exactly four reviewed structural relation families');

const relationById = new Map(structural.relations.map((entry) => [entry.id, entry]));
assert(relationById.size === structural.relations.length, 'duplicate structural relation research id');
for (const entry of structural.relations) {
  assert(entry.subject_polity_uuid === null && entry.object_polity_uuid === null, `${entry.id} must not bind pre-Baseline-A Polity UUIDs`);
  assert(entry.production_interval_approved === false, `${entry.id} must not be Production interval approved`);
  assert(typeof entry.relation_type === 'string' && entry.relation_type.length > 0, `${entry.id} missing relation type`);
  assert(Array.isArray(entry.sources) && entry.sources.length > 0, `${entry.id} missing source provenance`);
  for (const source of entry.sources) assert(/^https:\/\//.test(source.url), `${entry.id} has invalid source URL`);
}

const canada = relationById.get('canada_dominion_of_uk');
assert(canada?.relation_type === 'dominion_of', 'Canada relation type must remain dominion_of');
assert(canada?.start?.year === 1867 && canada.start.month === 7 && canada.start.day === 1 && canada.start.granularity === 'day', 'Canada start boundary must remain 1867-07-01 day-exact');
assert(canada?.transition_milestone?.year === 1931 && canada.transition_milestone.month === 12 && canada.transition_milestone.day === 11, 'Canada Statute of Westminster milestone must remain 1931-12-11');
assert(canada?.interval_status === 'start_resolved_end_model_qualified', 'Canada end must remain model-qualified rather than falsely final');

const raj = relationById.get('british_raj_colonial_dependency_of_uk');
assert(raj?.relation_type === 'colonial_dependency_of', 'British Raj relation type must remain colonial_dependency_of');
assert(raj?.end?.year === 1947 && raj.end.month === 8 && raj.end.day === 14 && raj.end.granularity === 'day', 'British Raj inclusive end must remain 1947-08-14');
assert(raj?.interval_status === 'end_resolved_start_primary_locator_pending', 'British Raj start must remain primary-locator gated');
assert(raj?.start_candidate?.year === 1858 && raj.start_candidate.month === 11 && raj.start_candidate.day === 1, 'British Raj start candidate must remain 1858-11-01');

const rsfsr = relationById.get('rsfsr_constituent_of_ussr');
assert(rsfsr?.relation_type === 'constituent_of', 'RSFSR relation type must remain constituent_of');
assert(rsfsr?.start?.year === 1922 && rsfsr.start.month === 12 && rsfsr.start.day === 30, 'RSFSR constituent start must remain 1922-12-30');
assert(rsfsr?.end?.year === 1991 && rsfsr.end.granularity === 'year' && rsfsr.end.certainty === 'uncertain', 'RSFSR end must remain year-level uncertain');
assert(rsfsr?.end?.month === null && rsfsr.end?.day === null, 'RSFSR multi-step dissolution must not gain a fabricated exact day');
assert(rsfsr?.forbidden_shortcut_exact_end === true, 'RSFSR exact-end shortcut guard must remain active');

const huainan = relationById.get('huainan_vassal_of_western_han');
assert(huainan?.relation_type === 'vassal_of', 'Huainan relation type must remain vassal_of');
assert(huainan?.semantic_status === 'resolved', 'Huainan structural relation semantics must remain resolved');
assert(huainan?.start === null && huainan?.end === null, 'Huainan absolute boundaries must remain unresolved until chronology/continuity review');
assert(Array.isArray(huainan?.blockers) && huainan.blockers.length >= 2, 'Huainan unresolved chronology/continuity blockers must be explicit');

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function assertNoBoundIdentityUuids(value, keyPath = 'root') {
  if (Array.isArray(value)) {
    value.forEach((child, index) => assertNoBoundIdentityUuids(child, `${keyPath}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;

  for (const [key, child] of Object.entries(value)) {
    const childPath = `${keyPath}.${key}`;
    if (/(?:uuid|activity_id|polity_id)$/i.test(key) && typeof child === 'string' && uuidPattern.test(child)) {
      fail(`pre-Baseline-A identity binding found at ${childPath}`);
    }
    assertNoBoundIdentityUuids(child, childPath);
  }
}
assertNoBoundIdentityUuids(structural);

const rawStructural = fs.readFileSync(structuralRelationsPath, 'utf8');
assert(!/1991-12-26/.test(rawStructural), 'Soviet dissolution must not be forced to 1991-12-26 without dedicated review');

const continuity = readJson(continuityPath);
assert(continuity.schema === 'atlas-stage2-polity-identity-continuity-current/v1', 'unexpected continuity contract schema');
assert(continuity.production_mutation === false, 'continuity contract must not authorize Production mutation');
assert(continuity.baseline_a_uuid_rebind_required === true, 'continuity contract must require Baseline A UUID rebind');
assert(continuity.old_activity_uuid_bindings_authoritative === false, 'old Activity UUID bindings must not be continuity authority');
assert(continuity.rules?.no_generic_successor_shortcut === true, 'generic successor shortcut must remain forbidden');
assert(Array.isArray(continuity.families) && continuity.families.length === 4, 'expected four reviewed continuity families');

const familyById = new Map(continuity.families.map((entry) => [entry.id, entry]));
assert(familyById.size === continuity.families.length, 'duplicate continuity family id');
const roman = familyById.get('roman_eastern_roman_395');
assert(roman?.model === 'operational_territorial_split_with_roman_continuity', 'Roman 395 model drifted');
assert(roman?.transition?.year === 395 && roman.transition.granularity === 'year', 'Roman operational split must remain at year 395');
assert(roman?.roman_continuity_metadata_required === true, 'Roman continuity metadata must remain required');

const yuan = familyById.get('yuan_northern_yuan_1368');
assert(yuan?.stable_single_polity_across_transition === true, 'Yuan/Northern Yuan must remain one stable immediate continuity identity');
assert(yuan?.post_transition_designation === 'Northern Yuan' && yuan?.designation_type === 'historiographic_period', 'Northern Yuan must remain a historiographic designation');
assert(yuan?.automatic_new_polity_uuid === false, '1368 must not automatically create a new Yuan UUID');

const russia = familyById.get('russia_1721_empire');
assert(russia?.stable_single_polity_across_transition === true, 'Russia 1721 must remain one stable Polity identity');
assert(russia?.transition?.year === 1721 && russia.transition.month === 11 && russia.transition.day === 2 && russia.transition.granularity === 'day', 'Russia transition must remain 1721-11-02 Gregorian');
assert(russia?.identity_relation_required === false, 'Russia state-form change must not become a successor relation');

const portugal = familyById.get('portugal_united_kingdom_1815');
assert(portugal?.model === 'distinct_composite_union_polity_with_constituent_portugal', 'Portugal 1815 union model drifted');
assert(portugal?.transition?.year === 1815 && portugal.transition.month === 12 && portugal.transition.day === 16, 'Portugal union formation must remain 1815-12-16');
assert(portugal?.portugal_constituent_continuity === true, 'Portugal constituent continuity must remain explicit');
assert(portugal?.union_identity_relation_model_required === true && portugal?.constituent_relation_model_required === true, 'Portugal union needs identity-formation and constituent models');
assertNoBoundIdentityUuids(continuity);

const requiredContracts = [
  'docs/audits/RELATION_SEMANTICS_CONTRACT_V1_2026-08-12.md',
  'docs/stage2/contracts/GOVERNANCE_CONTEXT_CURRENT_V1.md',
  'docs/stage2/contracts/POLITY_RELATION_CURRENT_V1.md',
  'docs/stage2/contracts/POLITY_IDENTITY_CONTINUITY_CURRENT_V1.md',
  'docs/stage2/contracts/TEMPORAL_CURRENT_V1.md',
  'docs/stage2/contracts/PROVENANCE_CURRENT_V1.md',
  'docs/stage2/contracts/ACTIVITY_SEMANTIC_KEY_V2_CURRENT.md',
  'docs/stage2/contracts/ADDITIVE_SCHEMA_CURRENT_V1.md',
  'docs/stage2/STAGE2_BASELINE_INDEPENDENT_INTEGRATION_PREP_2026-08-12.md',
  'docs/research/mongol/STAGE2_KUBLAI_PRE1271_POLITY_TERRITORY_DECISION_2026-08-12.md',
  'docs/research/relations/STAGE2_STRUCTURAL_POLITY_RELATION_INTERVALS_2026-08-12.md'
];
for (const file of requiredContracts) assert(fs.existsSync(path.join(root, file)), `missing Stage 2 prep contract: ${file}`);

console.log(`Stage 2 baseline-independent integration prep verified: ${manifest.port_now.length} portable units, ${manifest.wait_for_baseline_a.length} Baseline A-gated units, ${structural.relations.length} structural relation families researched, ${continuity.families.length} continuity families fixed.`);
