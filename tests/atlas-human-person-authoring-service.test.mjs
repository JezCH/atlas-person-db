import assert from 'node:assert/strict';
import test from 'node:test';

import personAuthoringModule from '../server/atlas-human-person-authoring-service.js';
const {
  HUMAN_PERSON_AUTHORING_SCHEMA,
  HUMAN_PERSON_AUTHORING_MARKER,
  PERSON_ONLY_SEMANTIC_VERSION,
  normalizePersonOnlyRequest
} = personAuthoringModule;

function request(overrides = {}) {
  return {
    schema: HUMAN_PERSON_AUTHORING_SCHEMA,
    review_status: 'approved',
    request_id: 'person-authoring:bilqis:v1',
    person: {
      canonical_name_en: 'Bilqis',
      display_name_ko: '빌키스',
      person_type: 'legendary',
      historicity: 'legendary'
    },
    sources: [{
      title: 'Reviewed source',
      canonical_url: 'https://example.test/bilqis',
      citation_text: 'Reviewed Bilqis source'
    }],
    ...overrides
  };
}

test('Person-only authoring preserves explicit legendary identity without chronology', () => {
  const normalized = normalizePersonOnlyRequest(request());
  assert.equal(normalized.person.canonical_name_en, 'Bilqis');
  assert.equal(normalized.person.display_name_ko, '빌키스');
  assert.equal(normalized.person.person_type, 'legendary');
  assert.equal(normalized.person.historicity, 'legendary');
  assert.equal(normalized.sources.length, 1);
  assert.equal(Object.hasOwn(normalized, 'activity'), false);
  assert.equal(HUMAN_PERSON_AUTHORING_MARKER, 'ATLAS_HUMAN_PERSON_AUTHORING_V1');
  assert.equal(PERSON_ONLY_SEMANTIC_VERSION, 'v1-person-identity-only');
});

test('Person-only authoring requires approved reviewed identity and evidence', () => {
  assert.throws(() => normalizePersonOnlyRequest(request({ review_status: 'draft' })), /NOT_APPROVED/);
  assert.throws(() => normalizePersonOnlyRequest(request({ sources: [] })), /SOURCE_REQUIRED/);
  assert.throws(() => normalizePersonOnlyRequest(request({ person: { canonical_name_en: 'Bilqis', display_name_ko: '빌키스', person_type: 'legendary' } })), /HISTORICITY_REQUIRED/);
});
