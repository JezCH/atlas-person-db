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
const { createAuthoringManifestDispatchService } = require('../server/atlas-authoring-manifest-dispatch-service.js');
const { createStage2NativeActivityTx, loadStage2NativeActivity } = require('../server/atlas-stage2-native-activity-service.js');
const { semanticKey } = require('../server/atlas-activity-semantic-key-v2.js');

const { Client } = pg;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const databaseUrl = String(process.env.DATABASE_URL || '').trim();
if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) throw new Error('DATABASE_URL is required');

const PERIOD_ID = '11111111-1111-4111-8111-111111111111';
const ACTIVE_IN = 'f33d2789-2e65-50c1-af3e-91335bcbd3ca';

function manifest(requestId, endYear = 120) {
  return {
    schema: 'atlas-authoring-manifest/v2',
    request_id: requestId,
    review_status: 'approved',
    person: {
      canonical_name_en: 'Fixture Scholar',
      display_name_ko: '픽스처 학자',
      canonical_key: 'fixture-scholar-stage2-native',
      person_type: 'historical',
      historicity: 'historical',
      allow_display_name_collision: false
    },
    polity_identity: {
      canonical_name_en: 'Fixture Polity',
      display_name_ko: '픽스처 정치체',
      canonical_key: 'fixture-polity-stage2-native',
      polity_type: 'historical_polity',
      historicity: 'historical',
      allow_display_name_collision: false
    },
    role_identity: {
      code: 'fixture_scholar',
      source_label: 'Scholar',
      display_name_ko: '학자',
      category: 'intellectual'
    },
    activity: {
      polity_binding: { mode: 'declared' },
      role_binding: { mode: 'declared' },
      relation_type_id: ACTIVE_IN,
      period_basis_id: PERIOD_ID,
      activity_start: 100,
      activity_start_month: null,
      activity_start_day: null,
      activity_start_granularity: 'year',
      activity_start_certainty: 'exact',
      activity_start_calendar: 'unspecified_historical',
      activity_end: endYear,
      activity_end_month: null,
      activity_end_day: null,
      activity_end_granularity: 'year',
      activity_end_certainty: 'approximate',
      activity_end_calendar: 'unspecified_historical',
      confidence: 'reviewed_fixture',
      chronology_status: 'reviewed_fixture',
      notes: 'Disposable Stage 2 native authoring lifecycle fixture.',
      source_links: []
    }
  };
}

const baselineSchema = fs.readFileSync(path.join(root, 'db/schema/atlas_v2.current.sql'), 'utf8');
const client = new Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query('DROP SCHEMA IF EXISTS atlas_v2 CASCADE');
  await client.query(baselineSchema);
  await applyAuthoringMigrations(client);
  await applyCorrectionMigrations(client);
  const schemaRelease = await applyStage2SchemaRelease(client);
  assert.equal(schemaRelease.applied.length, 6, 'new authoring gate requires complete additive Stage 2 schema');

  await client.query(`insert into atlas_v2.period_bases(id,code,is_active) values($1::uuid,'fixture_period',true)`, [PERIOD_ID]);
  await client.query(`insert into atlas_v2.period_basis_names(id,period_basis_id,locale,name,is_preferred) values(gen_random_uuid(),$1::uuid,'en','Fixture period',true)`, [PERIOD_ID]);

  const dispatcher = createAuthoringManifestDispatchService({ client });
  const firstManifest = manifest('fixture:stage2-native:new-person:v2');
  const first = await dispatcher.apply(firstManifest);
  assert.equal(first.marker, 'ATLAS_AUTHORING_MANIFEST_V2_STAGE2_NATIVE');
  assert.equal(first.replay, false);
  assert.equal(first.result.semantic_version, 'v2-relation-full-temporal');

  const personNames = await client.query(`select locale,name,is_preferred from atlas_v2.person_names where person_id=$1::uuid order by locale`, [first.person_id]);
  assert.deepEqual(personNames.rows, [
    { locale:'en', name:'Fixture Scholar', is_preferred:true },
    { locale:'ko', name:'픽스처 학자', is_preferred:true }
  ]);

  const created = await loadStage2NativeActivity(client, first.relationship_id);
  assert.ok(created);
  assert.equal(created.legacy_source_key, null);
  assert.equal(created.relation_type_id, ACTIVE_IN);
  assert.equal(created.activity_start_granularity, 'year');
  assert.equal(created.activity_start_certainty, 'exact');
  assert.equal(created.activity_end_certainty, 'approximate');
  assert.equal(created.activity_start_calendar, 'unspecified_historical');
  assert.equal(created.activity_end_calendar, 'unspecified_historical');
  assert.equal(created.source_locator.kind, 'stage2_native_authoring');
  assert.match(semanticKey(created), /^atlas-activity-semantic-key\/v2\u001f/);

  const replay = await dispatcher.apply(firstManifest);
  assert.equal(replay.replay, true);
  assert.equal(replay.relationship_id, first.relationship_id);

  await assert.rejects(
    () => dispatcher.apply({ ...firstManifest, request_id:'fixture:stage2-native:semantic-duplicate:v2' }),
    /STAGE2_ACTIVITY_SEMANTIC_DUPLICATE/
  );

  await assert.rejects(
    () => dispatcher.apply({
      schema:'atlas-authoring-manifest/v1',
      request_id:'fixture:legacy-new-write-must-fail',
      review_status:'approved',
      person:firstManifest.person,
      activity:{ politic_name:'Fixture Polity', activity_start:100, activity_end:120, role:'Scholar', period_basis:'fixture_period' }
    }),
    /AUTHORING_MANIFEST_V1_NEW_WRITE_RETIRED/
  );

  const nameBound = structuredClone(firstManifest);
  nameBound.request_id = 'fixture:name-binding-must-fail:v2';
  nameBound.activity.person_name = 'Fixture Scholar';
  await assert.rejects(() => dispatcher.apply(nameBound), /AUTHORING_V2_ACTIVITY_NAME_OR_PERSON_ID_BINDING_FORBIDDEN/);

  const zeroYear = structuredClone(firstManifest);
  zeroYear.request_id = 'fixture:year-zero-must-fail:v2';
  zeroYear.activity.activity_start = 0;
  await assert.rejects(() => dispatcher.apply(zeroYear), /signed non-zero historical year/);

  const noRelation = structuredClone(firstManifest);
  noRelation.request_id = 'fixture:missing-relation-must-fail:v2';
  delete noRelation.activity.relation_type_id;
  await assert.rejects(() => dispatcher.apply(noRelation), /relation_type_id must be a valid UUID/);

  const updatedManifest = manifest('unused-update-payload', 121);
  const updatedPayload = {
    ...updatedManifest.activity,
    person_id:first.person_id,
    polity_id:first.polity_id,
    role_id:first.role_id
  };
  delete updatedPayload.polity_binding;
  delete updatedPayload.role_binding;

  await client.query('begin isolation level serializable');
  const tx = createStage2NativeActivityTx(client);
  const updated = await tx.update(first.relationship_id, updatedPayload, { requestId:'fixture:strict-update' });
  await client.query('commit');
  assert.equal(updated.row.activity_end, 121);
  assert.equal((await loadStage2NativeActivity(client, first.relationship_id)).activity_end, 121);

  await client.query('begin isolation level serializable');
  await createStage2NativeActivityTx(client).remove(first.relationship_id);
  await client.query('commit');
  assert.equal(await loadStage2NativeActivity(client, first.relationship_id), null);

  const identitiesRemain = await client.query(`select
    exists(select 1 from atlas_v2.persons where id=$1::uuid) as person_exists,
    exists(select 1 from atlas_v2.polities where id=$2::uuid) as polity_exists,
    exists(select 1 from atlas_v2.roles where id=$3::uuid) as role_exists`, [first.person_id,first.polity_id,first.role_id]);
  assert.deepEqual(identitiesRemain.rows[0], { person_exists:true, polity_exists:true, role_exists:true });

  console.log(JSON.stringify({
    marker:'ATLAS_STAGE2_NATIVE_NEW_PERSON_AUTHORING_GATE_OK',
    schema_components:6,
    identity_authoring:true,
    english_and_korean_names:true,
    uuid_only_activity_binding:true,
    relation_required:true,
    full_temporal_required:true,
    historical_year_zero_forbidden:true,
    legacy_source_key_for_new_activity:null,
    semantic_key:'v2-relation-full-temporal',
    exact_manifest_replay:true,
    semantic_duplicate_rejected:true,
    legacy_v1_new_write_rejected:true,
    strict_update:true,
    strict_delete:true,
    production_mutation_authorized:false
  }, null, 2));
} catch (error) {
  try { await client.query('rollback'); } catch {}
  throw error;
} finally {
  await client.end();
}
