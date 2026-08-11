import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const semantics = require('../server/atlas-stage2-activity-semantic-key.js');

const BASE = Object.freeze({
  person_id: '00000000-0000-4000-8000-000000000101',
  polity_id: '00000000-0000-4000-8000-000000000102',
  relation_type_id: '00000000-0000-4000-8000-000000000103',
  role_id: null,
  period_basis_id: '00000000-0000-4000-8000-000000000104',
  activity_start: 1946,
  activity_start_month: null,
  activity_start_day: null,
  activity_start_granularity: 'year',
  activity_start_certainty: 'approximate',
  activity_start_calendar: 'gregorian',
  activity_end: 1954,
  activity_end_month: null,
  activity_end_day: null,
  activity_end_granularity: 'year',
  activity_end_certainty: 'uncertain',
  activity_end_calendar: 'gregorian',
  confidence: 'likely',
  notes: 'evidence note A'
});

test('Stage 2 semantic key excludes certainty, confidence, notes and provenance content', () => {
  const changedEvidence = {
    ...BASE,
    activity_start_certainty: 'exact',
    activity_end_certainty: 'exact',
    confidence: 'well_established',
    notes: 'evidence note B',
    source_locator: { page: 42 }
  };
  assert.equal(semantics.semanticKey(BASE), semantics.semanticKey(changedEvidence));
  assert.equal(semantics.semanticHash(BASE), semantics.semanticHash(changedEvidence));
});

test('Stage 2 semantic key includes Relation Type', () => {
  const otherRelation = { ...BASE, relation_type_id: '00000000-0000-4000-8000-000000000105' };
  assert.notEqual(semantics.semanticKey(BASE), semantics.semanticKey(otherRelation));
});

test('Stage 2 semantic key includes full temporal boundary interpretation', () => {
  const precise = {
    ...BASE,
    activity_start_month: 5,
    activity_start_day: 22,
    activity_start_granularity: 'day',
    activity_end_month: 12,
    activity_end_day: 10,
    activity_end_granularity: 'day'
  };
  const julian = { ...precise, activity_start_calendar: 'julian', activity_end_calendar: 'julian' };
  assert.notEqual(semantics.semanticKey(BASE), semantics.semanticKey(precise));
  assert.notEqual(semantics.semanticKey(precise), semantics.semanticKey(julian));
});

test('null Role remains a deliberate semantic component', () => {
  const role = { ...BASE, role_id: '00000000-0000-4000-8000-000000000106' };
  assert.notEqual(semantics.semanticKey(BASE), semantics.semanticKey(role));
  assert.match(semantics.semanticKey(BASE), /<NULL_ROLE>/);
});

test('unresolved Relation Type is not Stage 2 semantic-key ready', () => {
  const result = semantics.readiness({ ...BASE, relation_type_id: null });
  assert.equal(result.ready, false);
  assert.match(result.reasons[0], /relation_type_id/);
});

test('temporal shape is fail-closed', () => {
  assert.throws(
    () => semantics.semanticKey({ ...BASE, activity_start_month: 5, activity_start_granularity: 'year' }),
    /year granularity/
  );
  assert.throws(
    () => semantics.semanticKey({ ...BASE, activity_start: 0 }),
    /signed non-zero historical year/
  );
});
