import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { resolveActivityNotes, applyActivityTemplate } = require('../server/atlas-correction-v2-manifest-synthesizer.js');

const readJson = (path) => JSON.parse(fs.readFileSync(path, 'utf8'));
const sources = readJson('stage2/authoring/p7-reviewed-relation-sources.v1.json');
const plan = readJson('stage2/execution/p7-relation-resolution-execution.v1.json');
const batch4 = readJson('stage2/integration/p7-explicit-person-relation-decisions-batch4.v1.json');
const multiphase = readJson('stage2/integration/p7-multiphase-person-relation-decisions.v1.json');

function uuidBytes(uuid) {
  return Buffer.from(String(uuid).replaceAll('-', ''), 'hex');
}

function uuid5(namespace, name) {
  const hash = crypto.createHash('sha1').update(Buffer.concat([uuidBytes(namespace), Buffer.from(name, 'utf8')])).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

const relationIds = new Set([
  '7ca4de8f-01d4-542c-acc1-a06848c6742c',
  '67a57b37-1853-5f2a-b7ab-e6b2d32b56b6',
  '0fc4827f-8543-52f7-9e9a-3173b0c698a7',
  'f33d2789-2e65-50c1-af3e-91335bcbd3ca',
  '5d2d3af6-6e53-5af1-8423-f76c2263afe4',
  'fcc652d6-8cf5-5348-9375-60b35f6e0b8c'
]);

test('P7 reviewed Sources are literal deterministic bibliographic identities', () => {
  assert.equal(sources.schema, 'atlas-stage2-p7-reviewed-relation-sources/v1');
  assert.equal(sources.status, 'REVIEWED_LITERAL_UUID_ROWS_BRANCH_ONLY_NO_PRODUCTION_MUTATION');
  assert.equal(sources.rules.production_mutation_authorized, false);
  assert.equal(sources.sources.length, 6);
  const namespace = sources.uuid_allocation.repository_namespace;
  const keys = new Set();
  const ids = new Set();
  for (const entry of sources.sources) {
    assert.ok(!keys.has(entry.candidate_key));
    assert.ok(!ids.has(entry.row.id));
    keys.add(entry.candidate_key);
    ids.add(entry.row.id);
    assert.equal(entry.row.id, uuid5(namespace, `p7:source:${entry.row.source_key}`));
    assert.equal(entry.candidate_key, entry.row.source_key);
    assert.equal(entry.row.sha256, null);
    assert.equal(entry.row.bytes, null);
    assert.match(entry.row.canonical_url, /^https:\/\//);
    assert.ok(entry.row.citation_text.length > 20);
  }
  assert.equal(sources.result.fake_materialized_hash_count, 0);
});

test('P7 execution plan has exact literal UUIDs and no fake legacy keys on new fragments', () => {
  assert.equal(plan.schema, 'atlas-stage2-correction-v2-execution-plan/v1');
  assert.equal(plan.status, 'LITERAL_OPERANDS_COMPLETE_LIVE_BEFORE_SNAPSHOT_REQUIRED');
  assert.equal(plan.execution_rules.production_executable, false);
  assert.equal(plan.execution_rules.production_mutation_authorized, false);
  assert.equal(plan.operations.length, 4);
  assert.equal(plan.new_activity_uuid_allocations.length, 6);

  const namespace = plan.uuid_allocation.repository_namespace;
  const opByCase = new Map(plan.operations.map((row) => [row.case_id, row]));
  for (const allocation of plan.new_activity_uuid_allocations) {
    const op = opByCase.get(allocation.case_id);
    assert.ok(op, `missing operation ${allocation.case_id}`);
    assert.equal(
      allocation.activity_uuid,
      uuid5(namespace, `p7:activity:${op.activity_id}:${allocation.fragment_id}`),
      `activity UUID drift ${allocation.fragment_id}`
    );
  }

  const sourceIds = new Set(sources.sources.map((entry) => entry.row.id));
  let newFragmentCount = 0;
  for (const op of plan.operations) {
    assert.equal(op.baseline_before.source_count, 1);
    if (op.type === 'rewrite_activity') {
      assert.equal(op.after.activity_id, op.activity_id);
      assert.ok(relationIds.has(op.after.relation_type_id));
      assert.equal(op.after.notes_policy, 'REPLACE_WITH_REVIEWED_NOTES');
      assert.ok(op.after.reviewed_notes.length > 20);
      for (const link of op.after.add_source_links) assert.ok(sourceIds.has(link.source_id));
      continue;
    }
    assert.equal(op.type, 'split_activity');
    const survivors = op.fragments.filter((fragment) => fragment.survivor === true);
    assert.equal(survivors.length, 1);
    assert.equal(survivors[0].activity_id, op.activity_id);
    for (const fragment of op.fragments) {
      assert.ok(relationIds.has(fragment.relation_type_id));
      assert.equal(fragment.notes_policy, 'REPLACE_WITH_REVIEWED_NOTES');
      assert.ok(fragment.reviewed_notes.length > 20);
      assert.ok(Number.isInteger(fragment.activity_start));
      assert.ok(Number.isInteger(fragment.activity_end));
      assert.ok(fragment.activity_start <= fragment.activity_end);
      if (!fragment.survivor) {
        newFragmentCount += 1;
        assert.equal(fragment.legacy_source_key, null);
        assert.equal(fragment.source_copy_policy, 'COPY_EXISTING');
      }
      for (const link of fragment.add_source_links || []) assert.ok(sourceIds.has(link.source_id));
    }
  }
  assert.equal(newFragmentCount, 6);
});

test('P7 decision Sources are fully bound before execution', () => {
  const sourceKeys = new Set(sources.sources.map((entry) => entry.candidate_key));
  for (const decision of batch4.decisions) {
    for (const key of decision.normalized_source_candidate_keys || []) assert.ok(sourceKeys.has(key));
  }
  for (const item of multiphase.cases) {
    for (const key of item.normalized_source_candidate_keys || []) assert.ok(sourceKeys.has(key));
  }
});

test('Correction v2 reviewed notes policy replaces misleading whole-interval notes and defaults to preserve', () => {
  const live = { notes: 'legacy whole interval note' };
  assert.equal(resolveActivityNotes(live, {}), live.notes);
  assert.equal(resolveActivityNotes(live, { notes_policy: 'PRESERVE_EXACT_LIVE_NOTES' }), live.notes);
  assert.equal(resolveActivityNotes(live, { notes_policy: 'COPY_EXACT_EXISTING_NOTES_TO_NEW_FRAGMENT' }), live.notes);
  assert.equal(resolveActivityNotes(live, { notes_policy: 'REPLACE_WITH_REVIEWED_NOTES', reviewed_notes: ' reviewed phase note ' }), 'reviewed phase note');
  assert.throws(
    () => resolveActivityNotes(live, { notes_policy: 'REPLACE_WITH_REVIEWED_NOTES', reviewed_notes: '   ' }),
    /CORRECTION_V2_REVIEWED_NOTES_REQUIRED/
  );

  const template = {
    activity_id: '00000000-0000-5000-8000-000000000001',
    person_id: '00000000-0000-5000-8000-000000000002',
    polity_id: '00000000-0000-5000-8000-000000000003',
    relation_type_id: 'f33d2789-2e65-50c1-af3e-91335bcbd3ca',
    role_id: null,
    period_basis_id: '00000000-0000-5000-8000-000000000004',
    activity_start: 1,
    activity_end: 2,
    activity_start_detail: null,
    activity_end_detail: null,
    confidence: 'reviewed',
    chronology_status: 'reviewed',
    legacy_source_key: 'legacy:key',
    notes_policy: 'REPLACE_WITH_REVIEWED_NOTES',
    reviewed_notes: 'exact reviewed phase note'
  };
  const out = applyActivityTemplate({ ...live, source_locator: 'legacy:1', content_hash: 'abc' }, template);
  assert.equal(out.notes, 'exact reviewed phase note');
});
