import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  sameSemanticReference,
  reconcilePersonExternalReferences,
  deletePersonExternalReferences
} = require('../server/atlas-person-external-reference-lifecycle.js');

const SOURCE = '11111111-1111-4111-8111-111111111111';
const SURVIVOR = '22222222-2222-4222-8222-222222222222';

function ref(personId, overrides = {}) {
  return {
    person_id: personId,
    provider: 'namuwiki',
    status: 'linked',
    checked_at: '2026-08-21',
    document_title: '임호텝',
    url: 'https://namu.wiki/w/%EC%9E%84%ED%98%B8%ED%85%9D',
    ...overrides
  };
}

test('semantic equality ignores checked_at but not link identity', () => {
  assert.equal(sameSemanticReference(ref(SOURCE), ref(SURVIVOR, { checked_at: '2026-08-20' })), true);
  assert.equal(sameSemanticReference(ref(SOURCE), ref(SURVIVOR, { document_title: '다른 문서' })), false);
  assert.equal(sameSemanticReference(ref(SOURCE), ref(SURVIVOR, { status: 'not_found', document_title: null, url: null })), false);
});

test('source-only reference moves to survivor', async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      const text = String(sql).replace(/\s+/g, ' ').trim().toLowerCase();
      calls.push({ text, params });
      if (text.startsWith('select person_id::text')) return { rowCount: 1, rows: [ref(SOURCE)] };
      if (text.startsWith('update atlas_v2.person_external_references') && text.includes('set person_id=')) return { rowCount: 1, rows: [{ provider: 'namuwiki' }] };
      throw new Error(`unexpected SQL: ${text}`);
    }
  };
  const outcome = await reconcilePersonExternalReferences(client, SOURCE, SURVIVOR);
  assert.equal(outcome.moved, 1);
  assert.equal(outcome.collapsed, 0);
  assert.equal(calls.some(({ text }) => text.startsWith('delete from atlas_v2.person_external_references')), false);
});

test('identical provider reference collapses source duplicate', async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      const text = String(sql).replace(/\s+/g, ' ').trim().toLowerCase();
      calls.push({ text, params });
      if (text.startsWith('select person_id::text')) return { rowCount: 2, rows: [ref(SOURCE), ref(SURVIVOR, { checked_at: '2026-08-19' })] };
      if (text.startsWith('update atlas_v2.person_external_references') && text.includes('checked_at=greatest')) return { rowCount: 1, rows: [] };
      if (text.startsWith('delete from atlas_v2.person_external_references')) return { rowCount: 1, rows: [{ provider: 'namuwiki' }] };
      throw new Error(`unexpected SQL: ${text}`);
    }
  };
  const outcome = await reconcilePersonExternalReferences(client, SOURCE, SURVIVOR);
  assert.equal(outcome.moved, 0);
  assert.equal(outcome.collapsed, 1);
});

test('conflicting same-provider reference blocks merge without destructive SQL', async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      const text = String(sql).replace(/\s+/g, ' ').trim().toLowerCase();
      calls.push({ text, params });
      if (text.startsWith('select person_id::text')) return {
        rowCount: 2,
        rows: [ref(SOURCE), ref(SURVIVOR, { document_title: '다른 문서', url: 'https://namu.wiki/w/other' })]
      };
      throw new Error(`unexpected SQL: ${text}`);
    }
  };
  await assert.rejects(
    () => reconcilePersonExternalReferences(client, SOURCE, SURVIVOR),
    /PERSON_EXTERNAL_REFERENCE_MERGE_CONFLICT:namuwiki/
  );
  assert.equal(calls.length, 1);
});

test('hard delete helper explicitly removes normalized external references', async () => {
  const client = {
    async query(sql, params) {
      assert.match(String(sql), /delete from atlas_v2\.person_external_references/i);
      assert.deepEqual(params, [SOURCE]);
      return { rowCount: 2, rows: [{ provider: 'namuwiki' }, { provider: 'other' }] };
    }
  };
  assert.equal(await deletePersonExternalReferences(client, SOURCE), 2);
});
