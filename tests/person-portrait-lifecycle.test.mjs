import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  reconcilePersonPortraits,
  deletePersonPortrait
} = require('../server/atlas-person-portrait-lifecycle.js');

const SOURCE = '11111111-1111-4111-8111-111111111111';
const SURVIVOR = '22222222-2222-4222-8222-222222222222';
const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);

function normalize(sql) {
  return String(sql).replace(/\s+/g, ' ').trim().toLowerCase();
}

test('portrait lifecycle moves a source-only portrait and relies on FK update cascade for provenance', async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      const text = normalize(sql);
      calls.push({ text, params });
      if (text.startsWith("select to_regclass('atlas_v2.person_portrait_generation_runs')")) {
        return {rowCount:1,rows:[{generation_runs:null,revisions:null}]};
      }
      if (text.startsWith('select pp.person_id::text')) {
        return {
          rowCount:1,
          rows:[{
            person_id:SOURCE,
            asset_sha256:HASH_A,
            portrait_kind:'reconstruction',
            evidence_level:'strong',
            source_count:3
          }]
        };
      }
      if (text.startsWith('update atlas_v2.person_portraits')) {
        assert.deepEqual(params, [SOURCE, SURVIVOR]);
        return {
          rowCount:1,
          rows:[{
            person_id:SURVIVOR,
            asset_sha256:HASH_A,
            portrait_kind:'reconstruction',
            evidence_level:'strong'
          }]
        };
      }
      throw new Error(`Unexpected SQL: ${text}`);
    }
  };

  const result = await reconcilePersonPortraits(client, SOURCE, SURVIVOR);
  assert.equal(result.moved, 1);
  assert.equal(result.source_links_moved, 3);
  assert.equal(result.portrait.person_id, SURVIVOR);
  assert.equal(calls.some(({text}) => text.startsWith('delete from atlas_v2.person_portrait_sources')), false);
});

test('portrait lifecycle refuses to choose between two existing portraits during Person merge', async () => {
  const client = {
    async query(sql) {
      const text = normalize(sql);
      if (text.startsWith("select to_regclass('atlas_v2.person_portrait_generation_runs')")) {
        return {rowCount:1,rows:[{generation_runs:null,revisions:null}]};
      }
      if (text.startsWith('select pp.person_id::text')) {
        return {
          rowCount:2,
          rows:[
            {person_id:SOURCE,asset_sha256:HASH_A,portrait_kind:'artwork',evidence_level:'direct',source_count:1},
            {person_id:SURVIVOR,asset_sha256:HASH_B,portrait_kind:'reconstruction',evidence_level:'strong',source_count:2}
          ]
        };
      }
      throw new Error('merge must fail before any portrait update');
    }
  };

  await assert.rejects(
    () => reconcilePersonPortraits(client, SOURCE, SURVIVOR),
    (error) => error?.code === 'PERSON_PORTRAIT_MERGE_CONFLICT'
  );
});

test('portrait hard-delete reports portrait and provenance rows while source objects remain external', async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      const text = normalize(sql);
      calls.push({text,params});
      if (text.startsWith('select count(*)::int as source_count')) {
        return {rowCount:1,rows:[{source_count:4}]};
      }
      if (text.startsWith('delete from atlas_v2.person_portraits')) {
        assert.deepEqual(params,[SOURCE]);
        return {rowCount:1,rows:[{person_id:SOURCE}]};
      }
      throw new Error(`Unexpected SQL: ${text}`);
    }
  };

  const result = await deletePersonPortrait(client, SOURCE);
  assert.deepEqual(result, {portraits:1,portrait_sources:4});
  assert.equal(calls.some(({text}) => text.includes('delete from atlas_v2.sources')), false);
});


test('portrait history follows the surviving Person without discarding revisions or generation attempts', async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      const text = normalize(sql);
      calls.push({text,params});
      if (text.startsWith('select pp.person_id::text')) return {rowCount:0,rows:[]};
      if (text.startsWith("select to_regclass('atlas_v2.person_portrait_generation_runs')")) {
        return {rowCount:1,rows:[{generation_runs:'atlas_v2.person_portrait_generation_runs',revisions:'atlas_v2.person_portrait_revisions'}]};
      }
      if (text === 'set constraints person_portraits_current_revision_person_fkey deferred') return {rowCount:0,rows:[]};
      if (text.startsWith('update atlas_v2.person_portrait_generation_runs')) {
        assert.deepEqual(params,[SOURCE,SURVIVOR]);
        return {rowCount:2,rows:[{id:'1'},{id:'2'}]};
      }
      if (text.startsWith('update atlas_v2.person_portrait_revisions')) {
        assert.deepEqual(params,[SOURCE,SURVIVOR]);
        return {rowCount:3,rows:[{id:'1'},{id:'2'},{id:'3'}]};
      }
      throw new Error(`Unexpected SQL: ${text}`);
    }
  };

  const result = await reconcilePersonPortraits(client, SOURCE, SURVIVOR);
  assert.deepEqual(result, {
    moved:0,
    source_links_moved:0,
    generation_runs_moved:2,
    revisions_moved:3,
    survivor_kept:false
  });
  assert.equal(calls.some(({text}) => text === 'set constraints person_portraits_current_revision_person_fkey deferred'), true);
});
