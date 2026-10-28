import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const engine = require('../server/atlas-correction-manifest-v2-service.js');
const { sha256 } = require('../server/atlas-correction-v2-manifest-synthesizer.js');

const provenanceSql = fs.readFileSync(new URL('../db/proposals/stage2_provenance.rehearsal.sql', import.meta.url), 'utf8');
const engineSource = fs.readFileSync(new URL('../server/atlas-correction-manifest-v2-service.js', import.meta.url), 'utf8');
const linkIdentity = JSON.parse(fs.readFileSync(new URL('../stage2/contracts/provenance-link-identity-current.v1.json', import.meta.url), 'utf8'));

const RELATION_ID = '0cd030d8-ff0c-4105-a363-bb016eff554c';
const SUBJECT_ID = '9817bb46-bcc4-4867-a01d-91f7f0eb6de2';
const OBJECT_ID = '3a29a08a-d111-50d5-916f-f5c11b5eabaf';
const TYPE_ID = '375da950-65bc-5b81-a338-6c705f515120';
const SOURCE_ID = '41cb0494-17f0-4196-bdae-4ca0c1eeb4e6';

function explicitActivityBundle(id = SUBJECT_ID) {
  return {
    activity: engine.normalizeActivity({
      id, person_id: OBJECT_ID, polity_id: null, relation_type_id: TYPE_ID,
      role_id: null, period_basis_id: SOURCE_ID,
      activity_start: 1900, activity_end: 1901
    }, 'TEST'),
    normalized_source_links: [{ person_politics_id: id, source_id: SOURCE_ID, source_locator_key: 'reviewed fixture locator' }],
    chronology_claims: [],
    relationship_descriptions: []
  };
}

const THIRD_ACTIVITY_ID = '10000000-0000-4000-8000-000000000007';
const FOURTH_ACTIVITY_ID = '10000000-0000-4000-8000-000000000008';

function splitFixture(activityId, newId) {
  return {
    type: 'split_activity', activity_id: activityId,
    exact_before: explicitActivityBundle(activityId),
    survivor_fragment: explicitActivityBundle(activityId),
    new_fragments: [explicitActivityBundle(newId)],
    gap_overlap_policy: 'reviewed test partition'
  };
}

function targetFixture(type, activityId) {
  if (type === 'split_activity') return splitFixture(activityId, FOURTH_ACTIVITY_ID);
  if (type === 'retire_activity') {
    return {
      type, activity_id: activityId, exact_before: explicitActivityBundle(activityId),
      replacement_survivors: [{ activity_id: THIRD_ACTIVITY_ID, exact_before: explicitActivityBundle(THIRD_ACTIVITY_ID), exact_after: explicitActivityBundle(THIRD_ACTIVITY_ID) }],
      source_transfer_policy: require('../server/atlas-correction-v2-manifest-synthesizer.js').RETIRE_SOURCE_TRANSFER_POLICY,
      silent_source_drop_forbidden: true
    };
  }
  return { type, activity_id: activityId, exact_before: explicitActivityBundle(activityId), exact_after: explicitActivityBundle(activityId) };
}

function signedActivityManifest(operations) {
  const core = {
    schema: engine.MANIFEST_V2, request_id: 'test-order-independent-activity-identities',
    review_status: 'approved', exact_live_snapshot_digest: `sha256:${'a'.repeat(64)}`, operations
  };
  return { ...core, manifest_sha256: sha256(core), production_executable: true };
}

test('split new IDs cannot also be existing mutation targets in either operation order', () => {
  for (const type of ['rewrite_activity', 'split_activity', 'retire_activity']) {
    const pair = [splitFixture(SUBJECT_ID, RELATION_ID), targetFixture(type, RELATION_ID)];
    for (const operations of [pair, pair.toReversed()]) {
      const manifest = signedActivityManifest(operations);
      const before = JSON.stringify(manifest);
      assert.throws(() => engine.requireV2Manifest(manifest), { message: 'CORRECTION_V2_NEW_ACTIVITY_ID_REUSED' }, type);
      assert.equal(JSON.stringify(manifest), before);
    }
  }
});

test('cross-operation split identity collisions reject before transaction in dry-run and apply', async () => {
  let queries = 0;
  const service = engine.createCorrectionManifestV2Service({ client: { async query() { queries++; throw Error('database must not be reached'); } } });
  for (const type of ['rewrite_activity', 'split_activity', 'retire_activity']) {
    const pair = [splitFixture(SUBJECT_ID, RELATION_ID), targetFixture(type, RELATION_ID)];
    for (const operations of [pair, pair.toReversed()]) {
      for (const dryRun of [true, false]) {
        await assert.rejects(service.execute(signedActivityManifest(operations), { dryRun }), { message: 'CORRECTION_V2_NEW_ACTIVITY_ID_REUSED' });
      }
    }
  }
  assert.equal(queries, 0);
});

test('disjoint split and rewrite remain valid in either order without altering source or input bundles', () => {
  const pair = [splitFixture(SUBJECT_ID, RELATION_ID), targetFixture('rewrite_activity', THIRD_ACTIVITY_ID)];
  for (const operations of [pair, pair.toReversed()]) {
    const manifest = signedActivityManifest(operations);
    const before = JSON.stringify(manifest);
    const normalized = engine.requireV2Manifest(manifest);
    assert.equal(normalized.operations.length, 2);
    const split = normalized.operations.find(operation => operation.type === 'split_activity');
    assert.deepEqual(split.exact_before.normalized_source_links, operations.find(operation => operation.type === 'split_activity').exact_before.normalized_source_links);
    assert.equal(split.new_fragments[0].normalized_source_links[0].source_id, SOURCE_ID);
    assert.equal(JSON.stringify(manifest), before);
    assert.deepEqual(engine.expectedCountDeltas(normalized.operations), { activities: 1, activity_sources: 1, chronology_claims: 0, relationship_descriptions: 0, polity_relations: 0, polity_relation_sources: 0 });
  }
});

test('rewrite requires explicit child inventories on both before and after bundles', () => {
  const bundle = explicitActivityBundle();
  const operation = { type: 'rewrite_activity', activity_id: SUBJECT_ID, exact_before: bundle, exact_after: structuredClone(bundle) };
  const original = structuredClone(operation);
  for (const side of ['exact_before', 'exact_after']) {
    for (const key of ['normalized_source_links', 'chronology_claims', 'relationship_descriptions']) {
      for (const value of [undefined, null, {}, '', false]) {
        const altered = structuredClone(operation);
        if (value === undefined) delete altered[side][key];
        else altered[side][key] = value;
        assert.throws(() => engine.normalizeOperation(altered, 0), /EXPLICIT_ARRAY_REQUIRED/, `${side}.${key} must be known, even when empty`);
      }
    }
  }
  const normalized = engine.normalizeOperation(operation, 0);
  assert.deepEqual(normalized.exact_before.normalized_source_links, bundle.normalized_source_links);
  assert.deepEqual(normalized.exact_after, normalized.exact_before);
  assert.deepEqual(operation, original);
});

test('split requires explicit inventories for original, survivor and every new fragment', () => {
  const bundle = explicitActivityBundle();
  const operation = {
    type: 'split_activity', activity_id: SUBJECT_ID,
    exact_before: bundle, survivor_fragment: structuredClone(bundle),
    new_fragments: [explicitActivityBundle(RELATION_ID)],
    gap_overlap_policy: 'reviewed test partition'
  };
  for (const side of ['exact_before', 'survivor_fragment', 'new_fragments']) {
    for (const key of ['normalized_source_links', 'chronology_claims', 'relationship_descriptions']) {
      for (const value of [undefined, null, {}, '', false]) {
        const altered = structuredClone(operation);
        const target = side === 'new_fragments' ? altered.new_fragments[0] : altered[side];
        if (value === undefined) delete target[key];
        else target[key] = value;
        assert.throws(() => engine.normalizeOperation(altered, 0), /EXPLICIT_ARRAY_REQUIRED/);
      }
    }
  }
  const normalized = engine.normalizeOperation(operation, 0);
  assert.equal(normalized.new_fragments.length, 1);
  assert.equal(normalized.new_fragments[0].normalized_source_links[0].source_id, SOURCE_ID);
  assert.equal(normalized.new_fragments[0].activity.legacy_source_key, null);
});

function manifestWithRelation() {
  const core = {
    schema: engine.MANIFEST_V2,
    request_id: 'test-v2-relation-composite-provenance',
    review_status: 'approved',
    exact_live_snapshot_digest: `sha256:${'a'.repeat(64)}`,
    operations: [{
      type: 'assert_polity_relation',
      decision_id: 'test_relation',
      exact_before: { relation_absent_id: RELATION_ID },
      exact_after: {
        relation: {
          id: RELATION_ID,
          subject_polity_id: SUBJECT_ID,
          object_polity_id: OBJECT_ID,
          relation_type_id: TYPE_ID,
          valid_from_year: 191,
          valid_from_month: null,
          valid_from_day: null,
          valid_from_granularity: 'year',
          valid_from_certainty: 'exact',
          valid_from_calendar: 'unspecified_historical',
          valid_to_year: 194,
          valid_to_month: null,
          valid_to_day: null,
          valid_to_granularity: 'year',
          valid_to_certainty: 'exact',
          valid_to_calendar: 'unspecified_historical',
          confidence: 'unknown',
          notes: 'reviewed test relation'
        },
        source_links: [{
          polity_relation_id: RELATION_ID,
          source_id: SOURCE_ID,
          source_locator_key: 'reviewed locator'
        }]
      }
    }]
  };
  return { ...core, manifest_sha256: sha256(core), production_executable: true };
}

test('Stage 2 provenance links use composite assertion/source/locator identity without synthetic UUID', () => {
  assert.deepEqual(linkIdentity.polity_relation_source_link_identity, ['polity_relation_id', 'source_id', 'source_locator_key']);
  assert.equal(linkIdentity.rules.synthetic_source_link_uuid_forbidden, true);
  const table = provenanceSql.match(/CREATE TABLE atlas_v2\.polity_relation_sources \([\s\S]*?\n\);/i)?.[0];
  assert.ok(table);
  assert.doesNotMatch(table, /\bid\s+uuid\b/i);
  assert.match(table, /PRIMARY KEY \(polity_relation_id, source_id, source_locator_key\)/i);
  assert.doesNotMatch(engineSource, /polity_relation_sources\s*\(\s*id\s*,/i);
  assert.doesNotMatch(engineSource, /select\s+id::text\s*,\s*polity_relation_id::text[\s\S]*?from atlas_v2\.polity_relation_sources/i);
});

test('Correction v2 manifest accepts exact composite polity-relation provenance links', () => {
  const manifest = manifestWithRelation();
  const normalized = engine.requireV2Manifest(manifest);
  assert.equal(normalized.operations.length, 1);
  const link = normalized.operations[0].exact_after.source_links[0];
  assert.deepEqual(link, {
    polity_relation_id: RELATION_ID,
    source_id: SOURCE_ID,
    source_locator_key: 'reviewed locator'
  });
});

test('Correction v2 rejects synthetic UUIDs on provenance join rows', () => {
  const manifest = manifestWithRelation();
  manifest.operations[0].exact_after.source_links[0].id = 'a480d6d1-2ca1-4a02-ac78-28d021372289';
  const { manifest_sha256, production_executable, ...core } = manifest;
  manifest.manifest_sha256 = sha256(core);
  assert.throws(() => engine.requireV2Manifest(manifest), /SYNTHETIC_LINK_UUID_FORBIDDEN/);
});

test('Correction v2 relation count delta tracks composite source links, not invented link entities', () => {
  const normalized = engine.requireV2Manifest(manifestWithRelation());
  assert.deepEqual(engine.expectedCountDeltas(normalized.operations), {
    activities: 0,
    activity_sources: 0,
    chronology_claims: 0,
    relationship_descriptions: 0,
    polity_relations: 1,
    polity_relation_sources: 1
  });
});


test('Correction v2 accepts a reviewed rewrite from legacy null polity to a canonical polity', () => {
  const base = {
    id: '10000000-0000-4000-8000-000000000001',
    person_id: '10000000-0000-4000-8000-000000000002',
    polity_id: null,
    relation_type_id: null,
    role_id: '10000000-0000-4000-8000-000000000003',
    period_basis_id: '10000000-0000-4000-8000-000000000004',
    activity_start: -73,
    activity_start_month: null,
    activity_start_day: null,
    activity_start_granularity: 'year',
    activity_start_certainty: 'exact',
    activity_start_calendar: 'unspecified_historical',
    activity_end: -71,
    activity_end_month: null,
    activity_end_day: null,
    activity_end_granularity: 'year',
    activity_end_certainty: 'exact',
    activity_end_calendar: 'unspecified_historical',
    confidence: 'well_established',
    chronology_status: 'reviewed',
    legacy_source_key: null,
    notes: 'legacy null polity',
    source_locator: null,
    content_hash: null
  };
  const before = engine.normalizeActivity(base, 'OP1_BEFORE');
  assert.equal(before.polity_id, null);
  assert.equal(before.relation_type_id, null);

  const after = engine.normalizeActivity({
    ...base,
    polity_id: '10000000-0000-4000-8000-000000000005',
    relation_type_id: '10000000-0000-4000-8000-000000000006'
  }, 'OP1_AFTER');
  assert.equal(after.polity_id, '10000000-0000-4000-8000-000000000005');
  assert.equal(after.relation_type_id, '10000000-0000-4000-8000-000000000006');
});
