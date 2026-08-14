import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const sources = readJson('stage2/authoring/p7-broad-politic-sources.v1.json');
const decisions = readJson('stage2/integration/p7-explicit-person-relation-decisions-batch8.v1.json');
const plan = readJson('stage2/execution/p7-broad-politic-relation-execution.v1.json');
const ACTIVE_IN = 'f33d2789-2e65-50c1-af3e-91335bcbd3ca';

function uuidBytes(uuid) { return Buffer.from(String(uuid).replaceAll('-', ''), 'hex'); }
function uuid5(namespace, name) {
  const hash = crypto.createHash('sha1').update(Buffer.concat([uuidBytes(namespace), Buffer.from(name, 'utf8')])).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

test('P7 broad-politic Sources are isolated deterministic reviewed identities', () => {
  assert.equal(sources.schema, 'atlas-stage2-p7-reviewed-relation-sources/v1');
  assert.equal(sources.status, 'REVIEWED_LITERAL_UUID_ROWS_BRANCH_ONLY_NO_PRODUCTION_MUTATION');
  assert.equal(sources.sources.length, 2);
  assert.equal(sources.result.source_count, 2);
  assert.equal(sources.result.fake_materialized_hash_count, 0);
  assert.equal(sources.rules.production_mutation_authorized, false);
  const namespace = sources.uuid_allocation.repository_namespace;
  for (const entry of sources.sources) {
    assert.equal(entry.candidate_key, entry.row.source_key);
    assert.equal(entry.row.id, uuid5(namespace, `p7:source:${entry.row.source_key}`));
    assert.equal(entry.row.sha256, null);
    assert.equal(entry.row.bytes, null);
    assert.match(entry.row.canonical_url, /^https:\/\//);
    assert.ok(entry.row.citation_text.length > 30);
  }
});

test('P7 broad-politic decisions explicitly supersede only the two stale rule hints', () => {
  assert.equal(decisions.status, 'REVIEWED_BRANCH_ONLY_NO_PRODUCTION_MUTATION');
  assert.equal(decisions.source_authoring, 'stage2/authoring/p7-broad-politic-sources.v1.json');
  assert.equal(decisions.rules.override_requires_explicit_supersedes_stale_relation_hint_flag, true);
  assert.equal(decisions.decisions.length, 2);
  const expected = new Map([
    ['592aa8f9-4eb4-527c-a72d-a78ee7769daf', 'bibliographic:northwestern-shoshone:pocatello'],
    ['b4a6b048-9465-539a-bc4b-ec50a057b594', 'bibliographic:nps:sitting-bull']
  ]);
  for (const decision of decisions.decisions) {
    assert.equal(decision.relation_code, 'active_in');
    assert.equal(decision.relation_type_id, ACTIVE_IN);
    assert.equal(decision.supersedes_stale_relation_hint, true);
    assert.deepEqual(decision.normalized_source_candidate_keys, [expected.get(decision.activity_id)]);
  }
});

test('P7 broad-politic execution preserves the coarse Activity and adds reviewed provenance', () => {
  assert.equal(plan.schema, 'atlas-stage2-correction-v2-execution-plan/v1');
  assert.equal(plan.status, 'LITERAL_OPERANDS_COMPLETE_LIVE_BEFORE_SNAPSHOT_REQUIRED');
  assert.equal(plan.source_authoring, 'stage2/authoring/p7-broad-politic-sources.v1.json');
  assert.equal(plan.execution_rules.superseded_micro_polity_structure_must_not_execute, true);
  assert.equal(plan.execution_rules.production_executable, false);
  assert.equal(plan.execution_rules.production_mutation_authorized, false);
  assert.equal(plan.operations.length, 2);
  const sourceByKey = new Map(sources.sources.map((entry) => [entry.candidate_key, entry.row.id]));
  const decisionById = new Map(decisions.decisions.map((row) => [row.activity_id, row]));
  const expectedSuperseded = new Map([
    ['592aa8f9-4eb4-527c-a72d-a78ee7769daf', ['chronology_correction','entity_model_migration','provenance_backfill']],
    ['b4a6b048-9465-539a-bc4b-ec50a057b594', ['chronology_correction','provenance_backfill']]
  ]);
  for (const operation of plan.operations) {
    assert.equal(operation.type, 'rewrite_activity');
    assert.equal(operation.after.activity_id, operation.activity_id);
    assert.equal(operation.after.person_id, operation.baseline_before.person_id);
    assert.equal(operation.after.polity_id, operation.baseline_before.polity_id);
    assert.equal(operation.after.role_id, operation.baseline_before.role_id);
    assert.equal(operation.after.period_basis_id, operation.baseline_before.period_basis_id);
    assert.equal(operation.after.activity_start, operation.baseline_before.activity_start);
    assert.equal(operation.after.activity_end, operation.baseline_before.activity_end);
    assert.equal(operation.after.relation_type_id, ACTIVE_IN);
    assert.equal(operation.after.notes_policy, 'PRESERVE_EXACT_LIVE_NOTES');
    assert.deepEqual(operation.superseded_raw_dependencies, expectedSuperseded.get(operation.activity_id));
    const decision = decisionById.get(operation.activity_id);
    assert.ok(decision);
    const sourceId = sourceByKey.get(decision.normalized_source_candidate_keys[0]);
    assert.equal(operation.after.add_source_links.length, 1);
    assert.equal(operation.after.add_source_links[0].source_id, sourceId);
  }
});
