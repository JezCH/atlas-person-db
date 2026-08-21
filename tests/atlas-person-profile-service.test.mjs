import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { normalizeNamuWikiInput } = require('../server/atlas-person-profile-service.js');

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
