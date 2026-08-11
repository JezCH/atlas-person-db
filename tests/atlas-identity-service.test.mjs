import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createIdentityService } = require('../server/atlas-identity-service.js');

function scriptedClient(responses = []) {
  const calls = [];
  return {
    calls,
    async query(sql, params = []) {
      calls.push({ sql: String(sql), params });
      const response = responses.shift();
      if (response instanceof Error) throw response;
      return response || { rows: [] };
    }
  };
}

test('person identity is created atomically with canonical EN and preferred KO names', async () => {
  const client = scriptedClient([
    { rows: [] }, // begin
    { rows: [] }, // advisory lock
    { rows: [] }, // existing canonical key
    { rows: [] }, // EN collision
    { rows: [] }, // KO collision
    { rows: [{ id: 'person-1' }] },
    { rows: [] }, // names
    { rows: [] } // commit
  ]);
  const service = createIdentityService({ client });
  const outcome = await service.mutate('create_person', {
    canonical_name_en: ' Belisarius ',
    display_name_ko: ' 벨리사리우스 ',
    person_type: 'historical',
    historicity: 'historical'
  });
  assert.equal(outcome.committed, true);
  assert.equal(outcome.entity, 'person');
  assert.equal(outcome.id, 'person-1');
  assert.equal(outcome.canonical_key, 'Belisarius');
  assert.equal(outcome.replay, false);
  assert.match(client.calls[0].sql, /serializable/i);
  assert.match(client.calls[5].sql, /insert into atlas_v2\.persons/i);
  assert.match(client.calls[6].sql, /insert into atlas_v2\.person_names/i);
  assert.deepEqual(client.calls[6].params, ['person-1', 'Belisarius', '벨리사리우스']);
  assert.match(client.calls.at(-1).sql, /^commit$/i);
});

test('exact same person canonical request is idempotent replay', async () => {
  const client = scriptedClient([
    { rows: [] },
    { rows: [] },
    { rows: [{
      id: 'person-1', person_type: 'historical', historicity: 'historical',
      canonical_name_en: 'Belisarius', display_name_ko: '벨리사리우스'
    }] },
    { rows: [] }
  ]);
  const outcome = await createIdentityService({ client }).mutate('create_person', {
    canonical_name_en: 'Belisarius',
    display_name_ko: '벨리사리우스'
  });
  assert.equal(outcome.replay, true);
  assert.equal(outcome.id, 'person-1');
  assert.equal(client.calls.some((call) => /insert into/i.test(call.sql)), false);
  assert.match(client.calls.at(-1).sql, /^commit$/i);
});

test('canonical EN collision fails closed and rolls back', async () => {
  const client = scriptedClient([
    { rows: [] },
    { rows: [] },
    { rows: [] },
    { rows: [{ owner_id: 'other-person' }] },
    { rows: [] }
  ]);
  await assert.rejects(
    createIdentityService({ client }).mutate('create_person', {
      canonical_name_en: 'Belisarius',
      display_name_ko: '벨리사리우스',
      canonical_key: 'Belisarius-2'
    }),
    /PERSON_CANONICAL_NAME_COLLISION/
  );
  assert.match(client.calls.at(-1).sql, /^rollback$/i);
});

test('KO display collision requires explicit review override', async () => {
  const client = scriptedClient([
    { rows: [] }, { rows: [] }, { rows: [] }, { rows: [] },
    { rows: [{ owner_id: 'other-person' }] }, { rows: [] }
  ]);
  await assert.rejects(
    createIdentityService({ client }).mutate('create_person', {
      canonical_name_en: 'Catherine II',
      display_name_ko: '예카테리나 2세'
    }),
    /PERSON_DISPLAY_NAME_COLLISION_REVIEW_REQUIRED/
  );
  assert.match(client.calls.at(-1).sql, /^rollback$/i);
});

test('polity identity preserves historical compiler defaults', async () => {
  const client = scriptedClient([
    { rows: [] }, { rows: [] }, { rows: [] }, { rows: [] }, { rows: [] },
    { rows: [{ id: 'polity-1' }] }, { rows: [] }, { rows: [] }
  ]);
  const outcome = await createIdentityService({ client }).mutate('create_polity', {
    canonical_name_en: 'Byzantine Empire', display_name_ko: '비잔티움 제국'
  });
  assert.equal(outcome.entity, 'polity');
  assert.deepEqual(client.calls[5].params, ['Byzantine Empire', 'historical_polity', 'historical']);
});

test('role identity creates exact vocabulary with explicit category', async () => {
  const client = scriptedClient([
    { rows: [] }, { rows: [] }, { rows: [] }, { rows: [] }, { rows: [] },
    { rows: [{ id: 'role-1' }] }, { rows: [] }, { rows: [] }
  ]);
  const outcome = await createIdentityService({ client }).mutate('create_role', {
    code: 'emperor', source_label: 'Emperor', display_name_ko: '황제', category: 'sovereign'
  });
  assert.equal(outcome.entity, 'role');
  assert.equal(outcome.code, 'emperor');
  assert.deepEqual(client.calls[5].params, ['emperor', 'sovereign', 'Emperor']);
  assert.deepEqual(client.calls[6].params, ['role-1', 'Emperor', '황제']);
});
