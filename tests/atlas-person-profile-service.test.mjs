import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { normalizeNamuWikiInput, sameAuditTarget } = require('../server/atlas-person-profile-service.js');

test('normalizeNamuWikiInput accepts a document title', () => {
  const value = normalizeNamuWikiInput('임호텝');
  assert.equal(value.provider, 'namuwiki');
  assert.equal(value.status, 'linked');
  assert.equal(value.document_title, '임호텝');
  assert.equal(value.url, 'https://namu.wiki/w/%EC%9E%84%ED%98%B8%ED%85%9D');
});

test('normalizeNamuWikiInput canonicalizes a valid full URL', () => {
  const value = normalizeNamuWikiInput('https://namu.wiki/w/%EC%9E%84%ED%98%B8%ED%85%9D?from=x#s-1');
  assert.equal(value.document_title, '임호텝');
  assert.equal(value.url, 'https://namu.wiki/w/%EC%9E%84%ED%98%B8%ED%85%9D');
});

for (const bad of [
  'http://namu.wiki/w/%EC%9E%84%ED%98%B8%ED%85%9D',
  'https://example.com/w/%EC%9E%84%ED%98%B8%ED%85%9D',
  'https://namu.wiki:444/w/%EC%9E%84%ED%98%B8%ED%85%9D',
  'https://namu.wiki/',
  'ftp://namu.wiki/w/test'
]) {
  test(`normalizeNamuWikiInput rejects invalid URL: ${bad}`, () => {
    assert.throws(() => normalizeNamuWikiInput(bad), /PERSON_NAMUWIKI_URL_INVALID/);
  });
}


test('sameAuditTarget accepts a previously audited NamuWiki target after current-state drift', () => {
  const personId = '510d7e14-5701-408b-84c3-d824a71b2258';
  const url = 'https://namu.wiki/w/%EC%BA%84%EB%B9%84%EC%84%B8%EC%8A%A4%202%EC%84%B8';
  const existing = {
    person_id: personId,
    operation: 'set_person_external_reference',
    after_snapshot: {
      external_reference: {
        provider: 'namuwiki',
        status: 'linked',
        checked_at: '2026-09-03',
        document_title: '캄비세스 2세',
        url,
        updated_at: '2026-09-03T00:00:00.000Z'
      }
    }
  };
  const after = {
    external_reference: {
      provider: 'namuwiki',
      status: 'linked',
      checked_at: '2026-09-20',
      document_title: '캄비세스 2세',
      url,
      updated_at: '2026-09-20T00:00:00.000Z'
    }
  };
  assert.equal(sameAuditTarget('set_person_external_reference', personId, after, existing), true);
});

test('sameAuditTarget rejects a reused request id for a different logical target', () => {
  const personId = '510d7e14-5701-408b-84c3-d824a71b2258';
  const existing = {
    person_id: personId,
    operation: 'set_person_external_reference',
    after_snapshot: {
      external_reference: {
        provider: 'namuwiki',
        status: 'linked',
        document_title: '캄비세스 2세',
        url: 'https://namu.wiki/w/%EC%BA%84%EB%B9%84%EC%84%B8%EC%8A%A4%202%EC%84%B8'
      }
    }
  };
  const after = {
    external_reference: {
      provider: 'namuwiki',
      status: 'linked',
      document_title: '다른 문서',
      url: 'https://namu.wiki/w/%EB%8B%A4%EB%A5%B8%20%EB%AC%B8%EC%84%9C'
    }
  };
  assert.equal(sameAuditTarget('set_person_external_reference', personId, after, existing), false);
});
