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
    person_id: PERSON,
    polity_id: null,
    relation_type_id: null,
    role_id: null,
    period_basis_id: PERIOD,
    activity_start: 73,
    activity_start_month: null,
    activity_start_day: null,
    activity_start_granularity: 'year',
    activity_start_certainty: 'exact',
    activity_start_calendar: 'unspecified_historical',
    activity_end: 73,
    activity_end_month: null,
    activity_end_day: null,
    activity_end_granularity: 'year',
    activity_end_certainty: 'exact',
    activity_end_calendar: 'unspecified_historical',
    confidence: 'well_established',
    chronology_status: 'reviewed',
    notes: null,
    source_links: [],
    ...overrides
  };
}

function humanRequest(overrides = {}) {
  return {
    schema: 'atlas-human-authoring/v1',
    request_id: 'test-null-primary-polity',
    person: { canonical_name_en: 'Example Person', display_name_ko: '예시 인물' },
    polity: null,
    activity: {
      relation_type: null,
      period_basis: 'general_activity',
      start_year: 73,
      start_certainty: 'exact',
      start_calendar: 'unspecified_historical',
      end_year: 73,
      end_certainty: 'exact',
      end_calendar: 'unspecified_historical',
      confidence: 'well_established'
    },
    sources: [{ title: 'Reviewed source', citation_text: 'Reviewed source' }],
    ...overrides
  };
}

test('semantic-v2 accepts an Activity with no defensible primary polity', () => {
  const key = semantic.semanticKey(nativeRow());
  assert.match(key, /<NULL_POLITY>/);
  assert.match(key, /<NULL_RELATION>/);
});

test('semantic-v2 requires primary polity and primary relation as one pair', () => {
  assert.throws(
    () => semantic.semanticKey(nativeRow({ polity_id: POLITY, relation_type_id: null })),
    /must both be null or both be UUIDs/
  );
  assert.throws(
    () => semantic.semanticKey(nativeRow({ polity_id: null, relation_type_id: RELATION })),
    /must both be null or both be UUIDs/
  );
});

test('native Activity normalization keeps a null primary polity pair', () => {
  const normalized = native.normalizeStage2NativeActivity(nativeRow());
  assert.equal(normalized.polity_id, null);
  assert.equal(normalized.relation_type_id, null);
});

test('native reference validation rejects opposes as a primary Person polity relation', async () => {
  const calls = [];
  const client = {
    async query(sql) {
      calls.push(String(sql));
      if (String(sql).includes('from atlas_v2.person_polity_relation_types')) {
        return { rows: [{ id: RELATION, code: 'opposes' }] };
      }
      return { rows: [{ id: PERSON }] };
    }
  };
  await assert.rejects(
    () => native.verifyReferences(client, nativeRow({ polity_id: POLITY, relation_type_id: RELATION })),
    /STAGE2_ACTIVITY_PRIMARY_OPPOSES_FORBIDDEN/
  );
  assert.ok(calls.some((sql) => sql.includes('person_polity_relation_types')));
});

test('human authoring permits no primary polity and rejects primary opposes', () => {
  const normalized = human.normalizeHumanAuthoringRequest(humanRequest());
  assert.equal(normalized.polity, null);
  assert.equal(normalized.activity.relation_type, null);

  assert.throws(
    () => human.normalizeHumanAuthoringRequest(humanRequest({
      polity: { canonical_name_en: 'Colonial State', display_name_ko: '식민 지배국' },
      activity: { ...humanRequest().activity, relation_type: 'opposes' }
    })),
    /HUMAN_AUTHORING_PRIMARY_OPPOSES_FORBIDDEN/
  );
});

test('human authoring rejects a one-sided primary polity/relation pair', () => {
  assert.throws(
    () => human.normalizeHumanAuthoringRequest(humanRequest({
      polity: { canonical_name_en: 'Example Polity', display_name_ko: '예시 정치체' }
    })),
    /HUMAN_AUTHORING_PRIMARY_POLITY_RELATION_PAIR_REQUIRED/
  );
});

test('person read projects null primary polity and relation without losing the Activity', () => {
  const projected = read.projectActivity({
    id: '55555555-5555-4555-8555-555555555555',
    person_id: PERSON,
    polity_id: null,
    relation_type_id: null,
    role_id: null,
    period_basis_id: PERIOD,
    period_basis_code: 'general_activity',
    activity_start: 73,
    activity_start_month: null,
    activity_start_day: null,
    activity_start_granularity: 'year',
    activity_start_certainty: 'exact',
    activity_start_calendar: 'unspecified_historical',
    activity_end: 73,
    activity_end_month: null,
    activity_end_day: null,
    activity_end_granularity: 'year',
    activity_end_certainty: 'exact',
    activity_end_calendar: 'unspecified_historical',
    confidence: 'well_established',
    chronology_status: 'reviewed',
    notes: 'Activity is preserved without misidentifying the opponent as the person’s polity.'
  });
  assert.equal(projected.polity, null);
  assert.equal(projected.relation, null);
  assert.equal(projected.start.year, 73);
  assert.match(projected.notes, /Activity is preserved/);
});

test('ordered correction migrations include the opponent-context migration', () => {
  assert.ok(migrations.CORRECTION_MIGRATION_PATHS.some((entry) => entry.endsWith('20260822_person_politics_context_polities.sql')));
});

test('opposes migration preserves opponent context before clearing the primary slot', () => {
  const sqlPath = path.resolve(__dirname, '../db/migrations/20260822_person_politics_context_polities.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS atlas_v2\.person_politics_context_polities/i);
  assert.match(sql, /rt\.code = 'opposes'/i);
  assert.match(sql, /SET polity_id = NULL,\s*relation_type_id = NULL/i);
  assert.match(sql, /ON CONFLICT \(person_politics_id, polity_id, relation_type_id\) DO NOTHING/i);
});
