import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import pg from 'pg';

const require = createRequire(import.meta.url);
const { applyAuthoringMigrations } = require('../server/atlas-authoring-migrations.js');
const { applyCorrectionMigrations } = require('../server/atlas-correction-migrations.js');
const { applyStage2SchemaRelease } = require('../server/atlas-stage2-schema-release.js');
const {
  MANIFEST_V2,
  MARKER_V2,
  exactEqual,
  loadActivityBundle,
  loadPolityRelationBundle,
  createCorrectionManifestV2Service
} = require('../server/atlas-correction-manifest-v2-service.js');
const { sha256, RETIRE_SOURCE_TRANSFER_POLICY } = require('../server/atlas-correction-v2-manifest-synthesizer.js');

const { Client } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) throw new Error('DATABASE_URL is required');

const ID = Object.freeze({
  person: '11111111-1111-4111-8111-111111111111',
  polityA: '22222222-2222-4222-8222-222222222222',
  polityB: '33333333-3333-4333-8333-333333333333',
  role: '44444444-4444-4444-8444-444444444444',
  period: '55555555-5555-4555-8555-555555555555',
  source: '66666666-6666-4666-8666-666666666666',
  rewrite: '77777777-7777-4777-8777-777777777777',
  split: '88888888-8888-4888-8888-888888888888',
  splitNew: '99999999-9999-4999-8999-999999999999',
  retire: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  relation: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  atomicActivity: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  atomicRelation: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  missingSource: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  sourceB: '12121212-1212-4212-8212-121212121212',
  retireSurvivor: '13131313-1313-4313-8313-131313131313'
});

const PERSON_RELATION = Object.freeze({
  activeIn: 'f33d2789-2e65-50c1-af3e-91335bcbd3ca',
  serves: '0fc4827f-8543-52f7-9e9a-3173b0c698a7'
});
const POLITY_RELATION = Object.freeze({
  vassalOf: 'b4982965-848a-5a2b-b690-daba1d092d02'
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function finalManifest(core) {
  return Object.freeze({ ...core, manifest_sha256: sha256(core), production_executable: true });
}

function afterActivity(bundle, changes) {
  const next = clone(bundle);
  Object.assign(next.activity, changes);
  return next;
}

function newFragmentFrom(bundle, { id, polityId, relationTypeId, start, end }) {
  const fragment = clone(bundle);
  Object.assign(fragment.activity, {
    id,
    polity_id: polityId,
    relation_type_id: relationTypeId,
    activity_start: start,
    activity_end: end,
    legacy_source_key: null
  });
  fragment.normalized_source_links = fragment.normalized_source_links.map((link) => ({ ...link, person_politics_id: id }));
  fragment.chronology_claims = [];
  fragment.relationship_descriptions = [];
  fragment.source_copy_policy = 'COPY_EXISTING';
  return fragment;
}

function persistedFragmentExpectation(fragment) {
  const persisted = clone(fragment);
  delete persisted.source_copy_policy;
  return persisted;
}

function retireSurvivorAfter(survivorBefore, retiredBefore) {
  const next = clone(survivorBefore);
  for (const link of retiredBefore.normalized_source_links) {
    next.normalized_source_links.push({ ...link, person_politics_id: survivorBefore.activity.id });
  }
  next.normalized_source_links.sort((a, b) => a.source_id.localeCompare(b.source_id));
  return next;
}

async function exactCounts(client) {
  const result = await client.query(`select
    (select count(*)::int from atlas_v2.person_politics_v2) as activities,
    (select count(*)::int from atlas_v2.person_politics_sources) as activity_sources,
    (select count(*)::int from atlas_v2.polity_relations) as polity_relations,
    (select count(*)::int from atlas_v2.polity_relation_sources) as polity_relation_sources,
    (select count(*)::int from atlas_v2.correction_manifest_runs) as correction_runs`);
  return result.rows[0];
}

const baselineSchema = fs.readFileSync(path.join(root, 'db/schema/atlas_v2.current.sql'), 'utf8');
const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query('DROP SCHEMA IF EXISTS atlas_v2 CASCADE');
  await client.query(baselineSchema);
  await applyAuthoringMigrations(client);
  await applyCorrectionMigrations(client);
  const release = await applyStage2SchemaRelease(client);
  assert.equal(release.applied.length, 6, 'Correction v2 rehearsal requires the complete P5 schema');
  assert.equal(release.skipped.length, 0, 'fresh Correction v2 rehearsal must apply all P5 components');

  await client.query(`insert into atlas_v2.persons(id,canonical_key,person_type,historicity) values($1,'fixture-person','historical','historical')`, [ID.person]);
  await client.query(`insert into atlas_v2.polities(id,canonical_key,polity_type,historicity) values
    ($1,'fixture-polity-a','historical_polity','historical'),
    ($2,'fixture-polity-b','historical_polity','historical')`, [ID.polityA, ID.polityB]);
  await client.query(`insert into atlas_v2.roles(id,code,category,source_label,is_active) values($1,'fixture_role','political','Fixture Role',true)`, [ID.role]);
  await client.query(`insert into atlas_v2.period_bases(id,code,is_active) values($1,'fixture_period',true)`, [ID.period]);
  await client.query(`insert into atlas_v2.sources(id,source_key,source_type,title,sha256,bytes,canonical_url,citation_text) values
    ($1,'fixture-source','bibliographic','Fixture Source',null,null,'https://example.invalid/fixture','Fixture citation'),
    ($2,'fixture-source-b','bibliographic','Fixture Source B',null,null,'https://example.invalid/fixture-b','Fixture citation B')`, [ID.source, ID.sourceB]);

  const seedActivity = async (id, start, end, key, sourceId = ID.source) => {
    await client.query(`insert into atlas_v2.person_politics_v2(
      id,person_id,polity_id,relation_type_id,role_id,period_basis_id,
      activity_start,activity_start_month,activity_start_day,activity_start_granularity,activity_start_certainty,activity_start_calendar,
      activity_end,activity_end_month,activity_end_day,activity_end_granularity,activity_end_certainty,activity_end_calendar,
      confidence,chronology_status,legacy_source_key,notes,source_locator,content_hash
    ) values($1,$2,$3,null,$4,$5,$6,null,null,null,null,null,$7,null,null,null,null,null,'reviewed','exact_as_recorded',$8,$9,$10::jsonb,$11)`,
    [id, ID.person, ID.polityA, ID.role, ID.period, start, end, key, `fixture ${key}`, JSON.stringify({ fixture: key }), `hash:${key}`]);
    await client.query(`insert into atlas_v2.person_politics_sources(person_politics_id,source_id,source_locator_key) values($1,$2,$3)`, [id, sourceId, `${key}:locator`]);
  };

  await seedActivity(ID.rewrite, 100, 110, 'legacy:rewrite');
  await seedActivity(ID.split, 200, 220, 'legacy:split');
  await seedActivity(ID.retire, 300, 310, 'legacy:retire');
  await seedActivity(ID.retireSurvivor, 290, 320, 'legacy:retire-survivor', ID.sourceB);

  const rewriteBefore = await loadActivityBundle(client, ID.rewrite);
  const splitBefore = await loadActivityBundle(client, ID.split);
  const retireBefore = await loadActivityBundle(client, ID.retire);
  const retireSurvivorBefore = await loadActivityBundle(client, ID.retireSurvivor);
  assert.ok(rewriteBefore && splitBefore && retireBefore && retireSurvivorBefore, 'fixture activities must exist');

  const rewriteAfter = afterActivity(rewriteBefore, {
    polity_id: ID.polityB,
    relation_type_id: PERSON_RELATION.activeIn
  });
  const splitSurvivor = afterActivity(splitBefore, {
    relation_type_id: PERSON_RELATION.serves,
    activity_end: 209
  });
  const splitNew = newFragmentFrom(splitBefore, {
    id: ID.splitNew,
    polityId: ID.polityB,
    relationTypeId: PERSON_RELATION.serves,
    start: 210,
    end: 220
  });
  assert.equal(splitNew.source_copy_policy, 'COPY_EXISTING', 'split fixture must exercise the reviewed Source-copy policy');
  const splitNewPersisted = persistedFragmentExpectation(splitNew);
  const retireSurvivorExpected = retireSurvivorAfter(retireSurvivorBefore, retireBefore);

  const relationBundle = {
    relation: {
      id: ID.relation,
      subject_polity_id: ID.polityA,
      object_polity_id: ID.polityB,
      relation_type_id: POLITY_RELATION.vassalOf,
      valid_from_year: 200,
      valid_from_month: null,
      valid_from_day: null,
      valid_from_granularity: 'year',
      valid_from_certainty: 'exact',
      valid_from_calendar: 'unspecified_historical',
      valid_to_year: 220,
      valid_to_month: null,
      valid_to_day: null,
      valid_to_granularity: 'year',
      valid_to_certainty: 'exact',
      valid_to_calendar: 'unspecified_historical',
      confidence: 'reviewed',
      notes: 'Correction v2 PostgreSQL rehearsal relation'
    },
    source_links: [{
      polity_relation_id: ID.relation,
      source_id: ID.source,
      source_locator_key: 'relation:fixture'
    }]
  };

  const core = {
    schema: MANIFEST_V2,
    request_id: 'p6-correction-v2-postgres-rehearsal-v2',
    review_status: 'approved',
    exact_live_snapshot_digest: `sha256:${'1'.repeat(64)}`,
    operations: [
      { type: 'rewrite_activity', case_id: 'fixture_rewrite', activity_id: ID.rewrite, exact_before: rewriteBefore, exact_after: rewriteAfter },
      { type: 'split_activity', case_id: 'fixture_split', activity_id: ID.split, exact_before: splitBefore, survivor_fragment: splitSurvivor, new_fragments: [splitNew], gap_overlap_policy: 'CONTIGUOUS_REVIEWED_BOUNDARY' },
      {
        type: 'retire_activity',
        case_id: 'fixture_retire',
        activity_id: ID.retire,
        exact_before: retireBefore,
        replacement_survivors: [{ activity_id: ID.retireSurvivor, exact_before: retireSurvivorBefore, exact_after: retireSurvivorExpected }],
        source_transfer_policy: RETIRE_SOURCE_TRANSFER_POLICY,
        silent_source_drop_forbidden: true
      },
      { type: 'assert_polity_relation', decision_id: 'fixture_relation', exact_before: { relation_absent_id: ID.relation }, exact_after: relationBundle }
    ]
  };
  const manifest = finalManifest(core);
  const service = createCorrectionManifestV2Service({ client });

  const beforeCounts = await exactCounts(client);
  assert.deepEqual(beforeCounts, { activities: 4, activity_sources: 4, polity_relations: 0, polity_relation_sources: 0, correction_runs: 0 });

  const dryRun = await service.execute(manifest, { dryRun: true });
  assert.equal(dryRun.marker, MARKER_V2);
  assert.equal(dryRun.dry_run, true);
  assert.equal(dryRun.committed, false);
  assert.equal(dryRun.replay, false);
  assert.deepEqual(await exactCounts(client), beforeCounts, 'dry-run must roll back all v2 writes and ledger writes');
  assert.ok(exactEqual(await loadActivityBundle(client, ID.rewrite), rewriteBefore), 'dry-run rewrite changed live row');
  assert.ok(exactEqual(await loadActivityBundle(client, ID.retireSurvivor), retireSurvivorBefore), 'dry-run changed retire survivor');
  assert.equal(await loadActivityBundle(client, ID.splitNew), null, 'dry-run created split fragment');
  assert.equal(await loadPolityRelationBundle(client, ID.relation), null, 'dry-run created polity relation');

  const applied = await service.execute(manifest);
  assert.equal(applied.marker, MARKER_V2);
  assert.equal(applied.dry_run, false);
  assert.equal(applied.committed, true);
  assert.equal(applied.replay, false);
  assert.ok(exactEqual(await loadActivityBundle(client, ID.rewrite), rewriteAfter), 'rewrite post-state drift');
  assert.ok(exactEqual(await loadActivityBundle(client, ID.split), splitSurvivor), 'split survivor post-state drift');
  assert.ok(exactEqual(await loadActivityBundle(client, ID.splitNew), splitNewPersisted), 'split new fragment persisted post-state drift');
  assert.equal(await loadActivityBundle(client, ID.retire), null, 'retired activity still exists');
  assert.ok(exactEqual(await loadActivityBundle(client, ID.retireSurvivor), retireSurvivorExpected), 'retired Source was not preserved on reviewed survivor');
  assert.ok(exactEqual(await loadPolityRelationBundle(client, ID.relation), relationBundle), 'polity relation post-state drift');
  assert.deepEqual(await exactCounts(client), { activities: 4, activity_sources: 5, polity_relations: 1, polity_relation_sources: 1, correction_runs: 1 });

  const replay = await service.execute(manifest);
  assert.equal(replay.committed, true);
  assert.equal(replay.replay, true);
  assert.deepEqual(await exactCounts(client), { activities: 4, activity_sources: 5, polity_relations: 1, polity_relation_sources: 1, correction_runs: 1 }, 'exact replay must be idempotent');
  assert.ok(exactEqual(await loadActivityBundle(client, ID.retireSurvivor), retireSurvivorExpected), 'replay changed retire survivor provenance');

  const collisionCore = clone(core);
  collisionCore.operations[0].exact_after.activity.notes = 'different reviewed payload under the same request id';
  let collisionRejected = false;
  try {
    await service.execute(finalManifest(collisionCore));
  } catch (error) {
    collisionRejected = /CORRECTION_REQUEST_ID_COLLISION/.test(String(error?.message || error));
  }
  assert.equal(collisionRejected, true, 'same request_id with a different manifest hash must fail closed');

  await seedActivity(ID.atomicActivity, 400, 410, 'legacy:atomic');
  const atomicBefore = await loadActivityBundle(client, ID.atomicActivity);
  const atomicAfter = afterActivity(atomicBefore, { relation_type_id: PERSON_RELATION.activeIn });
  const atomicRelationBundle = clone(relationBundle);
  atomicRelationBundle.relation.id = ID.atomicRelation;
  atomicRelationBundle.relation.valid_from_year = 400;
  atomicRelationBundle.relation.valid_to_year = 410;
  atomicRelationBundle.source_links = [{
    polity_relation_id: ID.atomicRelation,
    source_id: ID.missingSource,
    source_locator_key: 'missing-source-causes-fk-failure'
  }];
  const atomicCore = {
    schema: MANIFEST_V2,
    request_id: 'p6-correction-v2-atomic-rollback-rehearsal-v1',
    review_status: 'approved',
    exact_live_snapshot_digest: `sha256:${'2'.repeat(64)}`,
    operations: [
      { type: 'rewrite_activity', case_id: 'atomic_rewrite', activity_id: ID.atomicActivity, exact_before: atomicBefore, exact_after: atomicAfter },
      { type: 'assert_polity_relation', decision_id: 'atomic_relation', exact_before: { relation_absent_id: ID.atomicRelation }, exact_after: atomicRelationBundle }
    ]
  };
  let atomicFailure = false;
  try {
    await service.execute(finalManifest(atomicCore));
  } catch (error) {
    atomicFailure = /foreign key|violates foreign key|source/i.test(String(error?.message || error));
  }
  assert.equal(atomicFailure, true, 'deliberate FK failure must abort the Correction v2 transaction');
  assert.ok(exactEqual(await loadActivityBundle(client, ID.atomicActivity), atomicBefore), 'failed manifest left an earlier rewrite committed');
  assert.equal(await loadPolityRelationBundle(client, ID.atomicRelation), null, 'failed manifest left relation residue');
  const atomicLedger = await client.query(`select count(*)::int as n from atlas_v2.correction_manifest_runs where request_id='p6-correction-v2-atomic-rollback-rehearsal-v1'`);
  assert.equal(atomicLedger.rows[0].n, 0, 'failed manifest must not write an audit ledger row');

  console.log(JSON.stringify({
    marker: 'ATLAS_STAGE2_CORRECTION_V2_ENGINE_REHEARSAL_OK',
    p5_schema_components: 6,
    operations_rehearsed: ['rewrite_activity','split_activity','retire_activity','assert_polity_relation'],
    dry_run_rollback: true,
    retire_source_transfer_before_delete: true,
    apply_atomic: true,
    exact_postconditions: true,
    exact_replay_idempotent: true,
    request_id_hash_collision_rejected: true,
    mid_transaction_fk_failure_rolled_back: true,
    synthetic_provenance_link_uuid_used: false,
    production_mutation_authorized: false
  }, null, 2));
} finally {
  await client.end();
}