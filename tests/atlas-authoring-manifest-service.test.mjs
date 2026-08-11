import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { requireManifest, manifestHash, activityFromManifest } = require('../server/atlas-authoring-manifest-service.js');

test('authoring manifest v1 requires approval, stable request id, person and activity', () => {
  const parsed = requireManifest({
    schema: 'atlas-authoring-manifest/v1',
    review_status: 'approved',
    request_id: ' person:test:v1 ',
    person: { canonical_name_en: 'Test', display_name_ko: '테스트' },
    activity: { politic_name: 'Test Polity', activity_start: 1, activity_end: 2, period_basis: 'reign' }
  });
  assert.equal(parsed.requestId, 'person:test:v1');
  assert.throws(() => requireManifest({}), /UNSUPPORTED_AUTHORING_MANIFEST_SCHEMA/);
  assert.throws(() => requireManifest({ schema: 'atlas-authoring-manifest/v1', request_id: 'x', person: {}, activity: {} }), /AUTHORING_MANIFEST_NOT_APPROVED/);
});

test('manifest hash is stable across object key order', () => {
  assert.equal(manifestHash({ b: 2, a: 1 }), manifestHash({ a: 1, b: 2 }));
});

test('activity manifest is normalized through authoritative comparable payload', () => {
  assert.deepEqual(activityFromManifest('Liliʻuokalani', {
    politic_name: 'Kingdom of Hawaii',
    activity_start: 1891,
    activity_end: 1893,
    role: 'Queen',
    period_basis: 'reign',
    notes: null
  }), {
    person_name: 'Liliʻuokalani',
    politic_name: 'Kingdom of Hawaii',
    activity_start: 1891,
    activity_end: 1893,
    role: 'Queen',
    period_basis: 'reign',
    notes: null
  });
});
