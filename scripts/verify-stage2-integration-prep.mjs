import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifestPath = path.join(root, 'stage2/integration/stage2-baseline-independent-prep.v1.json');
const kublaiPath = path.join(root, 'research/mongol/stage2-kublai-pre1271-polity-territory-decision.v1.json');

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
assert(Array.isArray(manifest.port_now) && manifest.port_now.length >= 8, 'baseline-independent port set is incomplete');
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

const requiredContracts = [
  'docs/audits/RELATION_SEMANTICS_CONTRACT_V1_2026-08-12.md',
  'docs/stage2/contracts/GOVERNANCE_CONTEXT_CURRENT_V1.md',
  'docs/stage2/contracts/POLITY_RELATION_CURRENT_V1.md',
  'docs/stage2/contracts/TEMPORAL_CURRENT_V1.md',
  'docs/stage2/contracts/PROVENANCE_CURRENT_V1.md',
  'docs/stage2/contracts/ACTIVITY_SEMANTIC_KEY_V2_CURRENT.md',
  'docs/stage2/contracts/ADDITIVE_SCHEMA_CURRENT_V1.md',
  'docs/stage2/STAGE2_BASELINE_INDEPENDENT_INTEGRATION_PREP_2026-08-12.md',
  'docs/research/mongol/STAGE2_KUBLAI_PRE1271_POLITY_TERRITORY_DECISION_2026-08-12.md'
];
for (const file of requiredContracts) assert(fs.existsSync(path.join(root, file)), `missing Stage 2 prep contract: ${file}`);

console.log(`Stage 2 baseline-independent integration prep verified: ${manifest.port_now.length} portable units, ${manifest.wait_for_baseline_a.length} Baseline A-gated units.`);
