import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createIdentityService, advisoryLocks } = require('../server/atlas-identity-service.js');

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

function empty(count) {
  return Array.from({ length: count }, () => ({ rows: [] }));
}

test('advisory identity locks are deduplicated and acquired in deterministic order', async () => {
  const client = scriptedClient(empty(3));
  await advisoryLocks(client, ['z-token', 'a-token', 'z-token', 'm-token']);
  assert.deepEqual(client.calls.map((call) => call.params[0]), ['a-token', 'm-token', 'z-token']);
  assert.equal(client.calls.every((call) => /pg_advisory_xact_lock/.test(call.sql)), true);
});

test('person identity locks canonical key and all exact-name collision tokens before lookup', async () => {
  const responses = empty(10);
  responses[7] = { rows: [{ id: 'person-1' }] };
  const client = scriptedClient(responses);
  const outcome = await createIdentityService({ client }).mutate('create_person', {
    canonical_name_en: ' Belisarius ',
    display_name_ko: ' 벨리사리우스 '
  });
  assert.equal(outcome.committed, true);
  assert.equal(outcome.id, 'person-1');
  const lockKeys = client.calls.slice(1, 4).map((call) => call.params[0]);
  assert.deepEqual(lockKeys, [...lockKeys].sort());
  assert.deepEqual(new Set(lockKeys), new Set([
    'atlas-identity:person:key:Belisarius',
    'atlas-identity:person:name:Belisarius',
    'atlas-identity:person:name:벨리사리우스'
  ]));
  assert.match(client.calls[4].sql, /where p\.canonical_key=\$1/);
  assert.match(client.calls[5].sql, /from atlas_v2\.person_names/);
  assert.match(client.calls[5].sql, /where name=\$1/);
  assert.doesNotMatch(client.calls[5].sql, /locale=|is_preferred/);
  assert.match(client.calls[7].sql, /insert into atlas_v2\.persons/i);
  assert.match(client.calls[8].sql, /insert into atlas_v2\.person_names/i);
  assert.deepEqual(client.calls[8].params, ['person-1', 'Belisarius', '벨리사리우스']);
  assert.match(client.calls.at(-1).sql, /^commit$/i);
});

test('exact same person canonical request is idempotent replay after collision-token locks', async () => {
  const responses = empty(6);
  responses[4] = { rows: [{
    id: 'person-1', person_type: 'historical', historicity: 'historical',
    canonical_name_en: 'Belisarius', display_name_ko: '벨리사리우스'
  }] };
  const client = scriptedClient(responses);
  const outcome = await createIdentityService({ client }).mutate('create_person', {
    canonical_name_en: 'Belisarius', display_name_ko: '벨리사리우스'
  });
  assert.equal(outcome.replay, true);
  assert.equal(outcome.id, 'person-1');
  assert.equal(client.calls.some((call) => /insert into/i.test(call.sql)), false);
  assert.match(client.calls.at(-1).sql, /^commit$/i);
});

test('canonical EN collision with any existing alias fails closed and rolls back', async () => {
  const responses = empty(7);
  responses[5] = { rows: [{ owner_id: 'other-person' }] };
  const client = scriptedClient(responses);
  await assert.rejects(
    createIdentityService({ client }).mutate('create_person', {
      canonical_name_en: 'Belisarius', display_name_ko: '벨리사리우스', canonical_key: 'Belisarius-2'
    }),
    /PERSON_CANONICAL_NAME_COLLISION/
  );
  assert.match(client.calls[5].sql, /where name=\$1/);
  assert.doesNotMatch(client.calls[5].sql, /locale=|is_preferred/);
  assert.match(client.calls.at(-1).sql, /^rollback$/i);
});

test('KO display collision requires explicit review override', async () => {
  const responses = empty(8);
  responses[6] = { rows: [{ owner_id: 'other-person' }] };
  const client = scriptedClient(responses);
  await assert.rejects(
    createIdentityService({ client }).mutate('create_person', {
      canonical_name_en: 'Catherine II', display_name_ko: '예카테리나 2세'
    }),
    /PERSON_DISPLAY_NAME_COLLISION_REVIEW_REQUIRED/
  );
  assert.match(client.calls.at(-1).sql, /^rollback$/i);
});

test('polity identity uses the same deterministic key/name lock boundary', async () => {
  const responses = empty(10);
  responses[7] = { rows: [{ id: 'polity-1' }] };
  const client = scriptedClient(responses);
  const outcome = await createIdentityService({ client }).mutate('create_polity', {
    canonical_name_en: 'Byzantine Empire', display_name_ko: '비잔티움 제국'
  });
  assert.equal(outcome.entity, 'polity');
  assert.deepEqual(client.calls[7].params, ['Byzantine Empire', 'historical_polity', 'historical']);
  assert.deepEqual(new Set(client.calls.slice(1, 4).map((call) => call.params[0])), new Set([
    'atlas-identity:polity:key:Byzantine Empire',
    'atlas-identity:polity:name:Byzantine Empire',
    'atlas-identity:polity:name:비잔티움 제국'
  ]));
});

test('role identity locks every resolver token and creates exact vocabulary', async () => {
  const responses = empty(10);
  responses[7] = { rows: [{ id: 'role-1' }] };
  const client = scriptedClient(responses);
  const outcome = await createIdentityService({ client }).mutate('create_role', {
    code: 'emperor', source_label: 'Emperor', display_name_ko: '황제', category: 'sovereign'
  });
  assert.equal(outcome.entity, 'role');
  assert.equal(outcome.code, 'emperor');
  assert.deepEqual(new Set(client.calls.slice(1, 4).map((call) => call.params[0])), new Set([
    'atlas-identity:role:token:emperor',
    'atlas-identity:role:token:Emperor',
    'atlas-identity:role:token:황제'
  ]));
  assert.deepEqual(client.calls[7].params, ['emperor', 'sovereign', 'Emperor']);
  assert.deepEqual(client.calls[8].params, ['role-1', 'Emperor', '황제']);
});

test('distinct canonical roles may share the same localized display label', async () => {
  const responses = empty(10);
  responses[7] = { rows: [{ id: 'role-governor-general' }] };
  const client = scriptedClient(responses);
  const outcome = await createIdentityService({ client }).mutate('create_role', {
    code: 'governor_general', source_label: 'Governor General', display_name_ko: '총독', category: 'governance'
  });
  assert.equal(outcome.id, 'role-governor-general');
  assert.equal(outcome.replay, false);
  const collisionChecks = client.calls.filter((call) => /from atlas_v2\.roles r/.test(call.sql) && /role_names rn/.test(call.sql));
  assert.deepEqual(collisionChecks.map((call) => call.params[0]), ['governor_general', 'Governor General']);
  assert.equal(collisionChecks.some((call) => call.params[0] === '총독'), false);
  assert.deepEqual(client.calls[8].params, ['role-governor-general', 'Governor General', '총독']);
  assert.match(client.calls.at(-1).sql, /^commit$/i);
});

test('new role code cannot reuse an existing role label or alias', async () => {
  const responses = empty(7);
  responses[5] = { rows: [{ id: 'existing-role' }] };
  const client = scriptedClient(responses);
  await assert.rejects(
    createIdentityService({ client }).mutate('create_role', {
      code: 'Emperor', source_label: 'Imperial sovereign', display_name_ko: '제국 군주', category: 'sovereign'
    }),
    /ROLE_CODE_COLLIDES_WITH_EXISTING_VOCABULARY/
  );
  assert.deepEqual(client.calls[5].params, ['Emperor', null]);
  assert.match(client.calls.at(-1).sql, /^rollback$/i);
});
