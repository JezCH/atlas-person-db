import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const semantic = require('../server/atlas-activity-semantic-key-v2.js');
const native = require('../server/atlas-stage2-native-activity-service.js');
const human = require('../server/atlas-human-authoring-service.js');
const read = require('../server/atlas-person-read-service.js');
const migrations = require('../server/atlas-correction-migrations.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PERSON = '11111111-1111-4111-8111-111111111111';
const POLITY = '22222222-2222-4222-8222-222222222222';
const RELATION = '33333333-3333-4333-8333-333333333333';
const PERIOD = '44444444-4444-4444-8444-444444444444';

function nativeRow(overrides = {}) {
  return {
    person_id: PERSON, polity_id: null, relation_type_id: null, role_id: null, period_basis_id: PERIOD,
    activity_start: 73, activity_start_month: null, activity_start_day: null, activity_start_granularity: 'year',
    activity_start_certainty: 'exact', activity_start_calendar: 'unspecified_historical', activity_end: 73,
    activity_end_month: null, activity_end_day: null, activity_end_granularity: 'year', activity_end_certainty: 'exact',
    activity_end_calendar: 'unspecified_historical', confidence: 'well_established', chronology_status: 'reviewed',
    notes: null, source_links: [], ...overrides
  };
}

function humanRequest(overrides = {}) {
  return {
    schema: 'atlas-human-authoring/v1', request_id: 'test-null-primary-polity',
    person: { canonical_name_en: 'Example Person', display_name_ko: '예시 인물' }, polity: null,
    activity: { relation_type: null, period_basis: 'general_activity', start_year: 73, start_certainty: 'exact',
      start_calendar: 'unspecified_historical', end_year: 73, end_certainty: 'exact', end_calendar: 'unspecified_historical',
      confidence: 'well_established' },
    sources: [{ title: 'Reviewed source', citation_text: 'Reviewed source' }], ...overrides
  };
}

test('semantic-v2 accepts an Activity with no defensible primary polity', () => {
  const key = semantic.semanticKey(nativeRow());
  assert.match(key, /<NULL_POLITY>/);
  assert.match(key, /<NULL_RELATION>/);
});

test('semantic-v2 requires primary polity and primary relation as one pair', () => {
  assert.throws(() => semantic.semanticKey(nativeRow({ polity_id: POLITY, relation_type_id: null })), /must both be null or both be UUIDs/);
  assert.throws(() => semantic.semanticKey(nativeRow({ polity_id: null, relation_type_id: RELATION })), /must both be null or both be UUIDs/);
});

test('native Activity normalization keeps a null primary polity pair', () => {
  const normalized = native.normalizeStage2NativeActivity(nativeRow());
  assert.equal(normalized.polity_id, null);
  assert.equal(normalized.relation_type_id, null);
});

test('native reference validation rejects opposes as a primary Person polity relation', async () => {
  const calls = [];
  const client = { async query(sql) {
    calls.push(String(sql));
    if (String(sql).includes('from atlas_v2.person_polity_relation_types')) return { rows: [{ id: RELATION, code: 'opposes' }] };
    return { rows: [{ id: PERSON }] };
  } };
  await assert.rejects(() => native.verifyReferences(client, nativeRow({ polity_id: POLITY, relation_type_id: RELATION })), /STAGE2_ACTIVITY_PRIMARY_OPPOSES_FORBIDDEN/);
  assert.ok(calls.some((sql) => sql.includes('person_polity_relation_types')));
});

test('human authoring permits no primary polity and rejects primary opposes', () => {
  const normalized = human.normalizeHumanAuthoringRequest(humanRequest());
  assert.equal(normalized.polity, null);
  assert.equal(normalized.activity.relation_type, null);
  assert.throws(() => human.normalizeHumanAuthoringRequest(humanRequest({
    polity: { canonical_name_en: 'Colonial State', display_name_ko: '식민 지배국' },
    activity: { ...humanRequest().activity, relation_type: 'opposes' }
  })), /HUMAN_AUTHORING_PRIMARY_OPPOSES_FORBIDDEN/);
});

test('human authoring rejects a one-sided primary polity/relation pair', () => {
  assert.throws(() => human.normalizeHumanAuthoringRequest(humanRequest({
    polity: { canonical_name_en: 'Example Polity', display_name_ko: '예시 정치체' }
  })), /HUMAN_AUTHORING_PRIMARY_POLITY_RELATION_PAIR_REQUIRED/);
});

test('person read projects null primary polity and relation without losing the Activity', () => {
  const projected = read.projectActivity({
    id: '55555555-5555-4555-8555-555555555555', person_id: PERSON, polity_id: null, relation_type_id: null, role_id: null,
    period_basis_id: PERIOD, period_basis_code: 'general_activity', activity_start: 73, activity_start_month: null,
    activity_start_day: null, activity_start_granularity: 'year', activity_start_certainty: 'exact',
    activity_start_calendar: 'unspecified_historical', activity_end: 73, activity_end_month: null, activity_end_day: null,
    activity_end_granularity: 'year', activity_end_certainty: 'exact', activity_end_calendar: 'unspecified_historical',
    confidence: 'well_established', chronology_status: 'reviewed',
    notes: 'Activity is preserved without misidentifying the opponent as the person’s polity.'
  });
  assert.equal(projected.polity, null);
  assert.equal(projected.relation, null);
  assert.equal(projected.start.year, 73);
});

test('opponent-context migrations are post-Stage2, not correction-ledger migrations', () => {
  assert.equal(migrations.CORRECTION_MIGRATION_PATHS.some((entry) => entry.includes('20260822_person_politics_context_polities')), false);
  assert.ok(migrations.POST_STAGE2_MIGRATION_PATHS.some((entry) => entry.endsWith('20260822_person_politics_context_polities.sql')));
  assert.ok(migrations.POST_STAGE2_MIGRATION_PATHS.some((entry) => entry.endsWith('20260823_person_polity_community_reviewed_corrections.sql')));
  assert.ok(migrations.POST_STAGE2_MIGRATION_PATHS.some((entry) => entry.endsWith('20260824_person_polity_community_final_corrections.sql')));
});

test('post-Stage2 migration refuses a pre-P5 schema', async () => {
  const client = { query: async () => ({ rows: [{ relation_catalog:false, relation_column:false }] }) };
  await assert.rejects(() => migrations.applyPostStage2Migrations(client), /POST_STAGE2_SEMANTIC_SCHEMA_REQUIRED/);
});

test('opponent-context migration is schema-only and never blanket-rewrites opposes', () => {
  const sql = fs.readFileSync(path.resolve(__dirname, '../db/migrations/20260822_person_politics_context_polities.sql'), 'utf8');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS atlas_v2\.person_politics_context_polities/i);
  assert.match(sql, /ALTER COLUMN polity_id DROP NOT NULL/i);
  assert.match(sql, /ALTER COLUMN relation_type_id DROP NOT NULL/i);
  assert.doesNotMatch(sql, /WHERE\s+rt\.code\s*=\s*'opposes'/i);
  assert.doesNotMatch(sql, /UPDATE\s+atlas_v2\.person_politics_v2/i);
});

test('reviewed data migration is exact-identity bound and covers the audited corrections', () => {
  const sql = fs.readFileSync(path.resolve(__dirname, '../db/migrations/20260823_person_polity_community_reviewed_corrections.sql'), 'utf8');
  for (const activityId of [
    '6c7e0f1c-d843-4b8a-a436-fad247840b31',
    'fae6f22a-cd28-4cf9-be4a-d7dc60e20ef0',
    '3ce0a2e1-98e4-52b1-8843-ef6c69701425',
    '2c9b580a-b31f-4de3-9206-e3decb4c8a53',
    '02f6e078-2857-4c83-9d3d-f66541177ead',
    'de6ebd0b-11fe-42a5-a25e-ecce15655bbb',
    '8b69c528-a2af-4b74-8142-d56fa74e6f45',
    '10de3778-f47a-4b6e-aa98-d2003270977b'
  ]) assert.match(sql, new RegExp(activityId));
  assert.match(sql, /Spanish colonial Philippines/);
  assert.match(sql, /Guangdong Pirate Confederation/);
  const updateStatements = sql.match(/UPDATE\s+atlas_v2\.person_politics_v2[\s\S]*?;/gi) || [];
  assert.ok(updateStatements.length > 0);
  for (const statement of updateStatements) {
    assert.doesNotMatch(statement, /WHERE[\s\S]*?relation_type_id\s*=\s*v_opposes/i);
  }
});

test('final reviewed correction closes Lady Trieu and Yu Gwan-sun without changing canonical polity identity', () => {
  const sql = fs.readFileSync(path.resolve(__dirname, '../db/migrations/20260824_person_polity_community_final_corrections.sql'), 'utf8');
  for (const exactId of [
    '1a3440db-c329-58c4-af35-fdcf488fa3fd',
    'ea7456fa-c29d-5fac-979e-fc8c43824de4',
    'bf322784-2ec3-5d3e-886b-654d5cf0fbf7',
    'a4f4d4cd-d3f4-418f-8391-407eddcc954f',
    'b411938f-dff4-4f32-9764-76237fc7bd3b',
    '1742fd4e-6e63-4210-9081-fcb166b42d6f'
  ]) assert.match(sql, new RegExp(exactId));
  assert.match(sql, /Cửu Chân resistance/);
  assert.match(sql, /구진 저항 세력/);
  assert.match(sql, /code='active_in'/);
  assert.match(sql, /person_politics_v2_primary_polity_relation_pair_check/);
  assert.match(sql, /CHECK \(\(polity_id IS NULL\) = \(relation_type_id IS NULL\)\)/i);
  assert.doesNotMatch(sql, /canonical_key\s*=\s*'Cửu Chân resistance'/i);
  const activityUpdates = sql.match(/UPDATE\s+atlas_v2\.person_politics_v2[\s\S]*?;/gi) || [];
  assert.ok(activityUpdates.length >= 2);
  for (const statement of activityUpdates) assert.match(statement, /WHERE id=v_row\.id/i);
});
