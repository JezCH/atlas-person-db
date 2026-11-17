import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PERSON_READ_SQL } = require('../server/atlas-person-read-service.js');
const { PERSON_LIST_SEMANTIC_SQL } = require('../server/atlas-person-list-semantic-service.js');
const {
  createPersonReadHandler,
  PERSON_LIST_SNAPSHOT_BEGIN_SQL,
  withConsistentPersonListSnapshot
} = require('../server/atlas-person-read-handler.js');

const PERSON_ID = '1894b92f-d7aa-4642-9841-13b8f661bb00';
const ACTIVITY_ID = '00000000-0000-4000-8000-000000000101';

function response() {
  return {
    statusCode: 0, headers: {}, body: '',
    setHeader(key, value) { this.headers[key] = value; },
    end(text) { this.body = String(text ?? ''); }
  };
}

function personRow(count) {
  return {
    id: PERSON_ID,
    person_type: 'historical',
    historicity: 'historical',
    representative_domain: 'culture',
    names: [{ locale: 'en', name: 'Oscar Wilde', name_type: 'canonical', is_preferred: true }],
    descriptions: [],
    external_references: {},
    activity_count: count,
    first_activity_year: count ? 1895 : null,
    last_activity_year: count ? 1895 : null
  };
}

function activityRow() {
  return {
    id: ACTIVITY_ID,
    person_id: PERSON_ID,
    polity_id: '08c06b79-58de-508a-9ace-2948baa9e9e6',
    relation_type_id: '67a57b37-1853-5f2a-b7ab-e6b2d32b56b6',
    relation_type_code: 'active_in',
    relation_type_category: 'affiliation',
    period_basis_id: 'e78bcf72-81e3-5db8-a76a-8c2ca9c6d745',
    period_basis_code: 'intellectual_activity',
    activity_start: 1895,
    activity_end: 1895,
    confidence: 'well_established',
    chronology_status: 'reviewed',
    source_count: 1
  };
}

test('Person list summary is projected from the exact published Runtime Activity table', () => {
  const sql = PERSON_READ_SQL;
  const matches = sql.match(/from atlas_v2\.runtime_person_politics_v1 pp where pp\.person_id = p\.id/g) || [];
  assert.equal(matches.length, 3, 'count, min-year and max-year must use the same Runtime publication as activity facets');
  assert.doesNotMatch(sql, /from atlas_v2\.person_politics_v2 pp where pp\.person_id = p\.id/);
});

test('normal concurrent Runtime compile cannot make the Person list return HTTP500', async () => {
  let committedRuntimeActivities = 0;
  const queries = [];
  let sessions = 0;
  const handler = createPersonReadHandler({
    env: { SUPABASE_DB_URL: 'postgresql://example.invalid/atlas' },
    clientFactory: async () => {
      ++sessions;
      let snapshot = null, inTransaction = false;
      return {
        async query(sql) {
          queries.push(sql);
          if (sql === PERSON_LIST_SNAPSHOT_BEGIN_SQL) {
            assert.equal(inTransaction, false);
            inTransaction = true;
            snapshot = committedRuntimeActivities;
            return {rows:[]};
          }
          if (sql === PERSON_READ_SQL) {
            assert.equal(inTransaction, true);
            const rows = [personRow(snapshot)];
            // Simulate an atomic runtime compile occurring while this HTTP
            // request is between its list and facet SELECT statements.
            committedRuntimeActivities = 1;
            return {rows};
          }
          if (sql === PERSON_LIST_SEMANTIC_SQL) {
            assert.equal(inTransaction, true);
            return {rows: snapshot ? [activityRow()] : []};
          }
          if (sql === 'COMMIT') {
            assert.equal(inTransaction, true);
            inTransaction = false;
            return {rows:[]};
          }
          if (sql === 'ROLLBACK') throw Error('unexpected rollback in successful list read');
          throw Error('unexpected Person SQL');
        },
        async end() { assert.equal(inTransaction, false); }
      };
    }
  });
  const before = response();
  await handler({method:'GET', url:'/api/atlas-person-read'}, before);
  assert.equal(before.statusCode, 200);
  const first = JSON.parse(before.body);
  assert.equal(first.persons.length, 1);
  assert.equal(first.persons[0].activity_count, 0);
  assert.deepEqual(first.persons[0].activity_summaries, []);
  assert.equal(first.persons[0].facets.polities.length, 0);

  const after = response();
  await handler({method:'GET', url:'/api/atlas-person-read?q=Oscar%20Wilde'}, after);
  assert.equal(after.statusCode, 200);
  const second = JSON.parse(after.body);
  assert.equal(second.persons.length, 1);
  assert.equal(second.persons[0].activity_count, 1);
  assert.equal(second.persons[0].activity_summaries.length, 1);
  assert.equal(second.persons[0].activity_summaries[0].id, ACTIVITY_ID);
  assert.equal(sessions, 2);
  assert.deepEqual(queries.filter(sql => sql === PERSON_LIST_SNAPSHOT_BEGIN_SQL).length, 2);
  assert.deepEqual(queries.filter(sql => sql === 'COMMIT').length, 2);
});

test('true same-snapshot integrity errors still fail closed and rollback exactly once', async () => {
  const queries = [];
  const client = {
    async query(sql) {
      queries.push(sql);
      return {rows:[]};
    }
  };
  const failure = new Error('CONSISTENCY_FAILURE');
  await assert.rejects(
    withConsistentPersonListSnapshot(client, async () => { throw failure; }),
    error => error === failure
  );
  assert.deepEqual(queries, [PERSON_LIST_SNAPSHOT_BEGIN_SQL, 'ROLLBACK']);
});

test('transaction is committed once, with no extra SQL or authoring writes', async () => {
  const queries = [];
  const client = { async query(sql) { queries.push(sql); return {rows:[]}; } };
  const value = await withConsistentPersonListSnapshot(client, async () => ({state:'READ_ONLY'}));
  assert.deepEqual(value, {state:'READ_ONLY'});
  assert.deepEqual(queries, [PERSON_LIST_SNAPSHOT_BEGIN_SQL, 'COMMIT']);
});
