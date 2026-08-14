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
const { sha256 } = require('../server/atlas-correction-v2-manifest-synthesizer.js');
const {
  createUnifiedCorrectionManifestV2Service
} = require('../server/atlas-correction-manifest-v2-unified-service.js');
const {
  loadGovernanceBundle,
  loadDesignationBundle,
  loadIdentityRelationBundle
} = require('../server/atlas-correction-v2-stage2-assertions.js');

const { Client } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) throw new Error('DATABASE_URL is required');

const ID = Object.freeze({
  polityA: '11111111-1111-4111-8111-111111111111',
  polityB: '22222222-2222-4222-8222-222222222222',
  source: '33333333-3333-4333-8333-333333333333',
  missingSource: '44444444-4444-4444-8444-444444444444',
  governanceContext: '55555555-5555-4555-8555-555555555555',
  governance: '66666666-6666-4666-8666-666666666666',
  designation: '77777777-7777-4777-8777-777777777777',
  designationName: '88888888-8888-4888-8888-888888888888',
  identityType: '99999999-9999-4999-8999-999999999999',
  identityRelation: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  atomicGovernance: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  atomicIdentity: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
});

function finalManifest(core) {
  return Object.freeze({ ...core, manifest_sha256: sha256(core), production_executable: true });
}

function boundary(from, to) {
  return {
    valid_from_year: from,
    valid_from_month: null,
    valid_from_day: null,
    valid_from_granularity: 'year',
    valid_from_certainty: 'exact',
    valid_from_calendar: 'unspecified_historical',
    valid_to_year: to,
    valid_to_month: null,
    valid_to_day: null,
    valid_to_granularity: 'year',
    valid_to_certainty: 'exact',
    valid_to_calendar: 'unspecified_historical'
  };
}

async function counts(client) {
  const result = await client.query(`select
    (select count(*)::int from atlas_v2.polity_governance_periods) as governance_periods,
    (select count(*)::int from atlas_v2.polity_governance_period_sources) as governance_sources,
    (select count(*)::int from atlas_v2.polity_designations) as designations,
    (select count(*)::int from atlas_v2.polity_designation_names) as designation_names,
    (select count(*)::int from atlas_v2.polity_designation_sources) as designation_sources,
    (select count(*)::int from atlas_v2.polity_identity_relations) as identity_relations,
    (select count(*)::int from atlas_v2.polity_identity_relation_sources) as identity_relation_sources,
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
  assert.equal(release.applied.length, 6, 'Assertion rehearsal requires complete P5 schema');

  await client.query(`insert into atlas_v2.polities(id,canonical_key,polity_type,historicity) values
    ($1,'assertion-polity-a','historical_polity','historical'),
    ($2,'assertion-polity-b','historical_polity','historical')`, [ID.polityA, ID.polityB]);
  await client.query(`insert into atlas_v2.sources(id,source_key,source_type,title,sha256,bytes,canonical_url,citation_text)
    values($1,'assertion-source','bibliographic','Assertion Source',null,null,'https://example.invalid/assertion','Assertion rehearsal citation')`, [ID.source]);
  await client.query(`insert into atlas_v2.governance_contexts(id,canonical_key,governance_type,historicity)
    values($1,'assertion-government','government','historical')`, [ID.governanceContext]);
  await client.query(`insert into atlas_v2.polity_identity_relation_types(id,code,is_active)
    values($1,'fixture_transition',true)`, [ID.identityType]);

  const governanceBundle = {
    period: {
      id: ID.governance,
      polity_id: ID.polityA,
      governance_context_id: ID.governanceContext,
      ...boundary(100, 120),
      confidence: 'reviewed',
      notes: 'Governance assertion rehearsal'
    },
    source_links: [{
      polity_governance_period_id: ID.governance,
      source_id: ID.source,
      source_locator_key: 'governance:fixture'
    }]
  };

  const designationBundle = {
    designation: {
      id: ID.designation,
      polity_id: ID.polityA,
      designation_type: 'official_name',
      ...boundary(100, 120),
      confidence: 'reviewed',
      notes: 'Designation assertion rehearsal'
    },
    names: [{
      id: ID.designationName,
      polity_designation_id: ID.designation,
      locale: 'en',
      name: 'Fixture Polity A',
      is_preferred: true
    }],
    source_links: [{
      polity_designation_id: ID.designation,
      source_id: ID.source,
      source_locator_key: 'designation:fixture'
    }]
  };

  const identityBundle = {
    relation: {
      id: ID.identityRelation,
      predecessor_polity_id: ID.polityA,
      successor_polity_id: ID.polityB,
      relation_type_id: ID.identityType,
      transition_year: 121,
      transition_month: null,
      transition_day: null,
      transition_granularity: 'year',
      transition_certainty: 'exact',
      transition_calendar: 'unspecified_historical',
      confidence: 'reviewed',
      notes: 'Identity transition assertion rehearsal'
    },
    source_links: [{
      polity_identity_relation_id: ID.identityRelation,
      source_id: ID.source,
      source_locator_key: 'identity:fixture'
    }]
  };

  const manifest = finalManifest({
    schema: 'atlas-correction-manifest/v2',
    request_id: 'p6-correction-v2-stage2-assertion-rehearsal-v1',
    review_status: 'approved',
    exact_live_snapshot_digest: `sha256:${'2'.repeat(64)}`,
    operations: [
      { type: 'assert_governance_period', decision_id: 'fixture_governance', exact_before: { period_absent_id: ID.governance }, exact_after: governanceBundle },
      { type: 'assert_polity_designation', decision_id: 'fixture_designation', exact_before: { designation_absent_id: ID.designation }, exact_after: designationBundle },
      { type: 'assert_polity_identity_relation', decision_id: 'fixture_identity', exact_before: { relation_absent_id: ID.identityRelation }, exact_after: identityBundle }
    ]
  });

  const service = createUnifiedCorrectionManifestV2Service({ client });
  const before = await counts(client);
  assert.deepEqual(before, {
    governance_periods: 0, governance_sources: 0,
    designations: 0, designation_names: 0, designation_sources: 0,
    identity_relations: 0, identity_relation_sources: 0,
    correction_runs: 0
  });

  const dryRun = await service.execute(manifest, { dryRun: true });
  assert.equal(dryRun.committed, false);
  assert.equal(dryRun.replay, false);
  assert.deepEqual(await counts(client), before, 'dry-run must leave all assertion tables unchanged');

  const applied = await service.execute(manifest);
  assert.equal(applied.committed, true);
  assert.equal(applied.replay, false);
  assert.deepEqual(await counts(client), {
    governance_periods: 1, governance_sources: 1,
    designations: 1, designation_names: 1, designation_sources: 1,
    identity_relations: 1, identity_relation_sources: 1,
    correction_runs: 1
  });
  assert.deepEqual(await loadGovernanceBundle(client, ID.governance), governanceBundle);
  assert.deepEqual(await loadDesignationBundle(client, ID.designation), designationBundle);
  assert.deepEqual(await loadIdentityRelationBundle(client, ID.identityRelation), identityBundle);

  const replay = await service.execute(manifest);
  assert.equal(replay.replay, true);
  assert.deepEqual(await counts(client), {
    governance_periods: 1, governance_sources: 1,
    designations: 1, designation_names: 1, designation_sources: 1,
    identity_relations: 1, identity_relation_sources: 1,
    correction_runs: 1
  }, 'exact replay must be idempotent');

  const collision = { ...manifest, operations: manifest.operations.map((operation) => ({ ...operation })) };
  collision.operations[0] = { ...collision.operations[0], decision_id: 'changed-decision' };
  collision.manifest_sha256 = sha256(Object.fromEntries(Object.entries(collision).filter(([key]) => !['manifest_sha256','production_executable'].includes(key))));
  await assert.rejects(() => service.execute(collision), /CORRECTION_REQUEST_ID_COLLISION/);

  const atomicGovernance = {
    period: {
      id: ID.atomicGovernance,
      polity_id: ID.polityB,
      governance_context_id: ID.governanceContext,
      ...boundary(130, 140),
      confidence: 'reviewed',
      notes: 'Must roll back when later assertion fails'
    },
    source_links: [{ polity_governance_period_id: ID.atomicGovernance, source_id: ID.source, source_locator_key: 'atomic:governance' }]
  };
  const atomicIdentity = {
    relation: {
      id: ID.atomicIdentity,
      predecessor_polity_id: ID.polityB,
      successor_polity_id: ID.polityA,
      relation_type_id: ID.identityType,
      transition_year: 141,
      transition_month: null,
      transition_day: null,
      transition_granularity: 'year',
      transition_certainty: 'exact',
      transition_calendar: 'unspecified_historical',
      confidence: 'reviewed',
      notes: 'Missing Source should fail after first assertion insert'
    },
    source_links: [{ polity_identity_relation_id: ID.atomicIdentity, source_id: ID.missingSource, source_locator_key: 'atomic:missing-source' }]
  };
  const atomicManifest = finalManifest({
    schema: 'atlas-correction-manifest/v2',
    request_id: 'p6-correction-v2-stage2-assertion-atomic-failure-v1',
    review_status: 'approved',
    exact_live_snapshot_digest: `sha256:${'3'.repeat(64)}`,
    operations: [
      { type: 'assert_governance_period', decision_id: 'atomic_governance', exact_before: { period_absent_id: ID.atomicGovernance }, exact_after: atomicGovernance },
      { type: 'assert_polity_identity_relation', decision_id: 'atomic_identity', exact_before: { relation_absent_id: ID.atomicIdentity }, exact_after: atomicIdentity }
    ]
  });
  const beforeAtomic = await counts(client);
  await assert.rejects(() => service.execute(atomicManifest), /foreign key|violates/i);
  assert.deepEqual(await counts(client), beforeAtomic, 'failed mixed assertion manifest must roll back all writes');
  assert.equal(await loadGovernanceBundle(client, ID.atomicGovernance), null, 'first assertion survived failed transaction');
  assert.equal(await loadIdentityRelationBundle(client, ID.atomicIdentity), null, 'failed assertion unexpectedly exists');

  console.log('STAGE2_CORRECTION_V2_ASSERTION_REHEARSAL_OK');
} finally {
  await client.end();
}
