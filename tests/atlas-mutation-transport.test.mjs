import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createMutationTransport, validateRequest } = require('../server/atlas-mutation-transport.js');

test('validates only current mutation envelope operations', () => {
  assert.equal(validateRequest({ operation: 'delete', payload: { id:'11111111-1111-4111-8111-111111111111' } }).valid, true);
  for (const operation of ['create','update','import','reconcile']) {
    assert.equal(validateRequest({ operation, payload:{} }).valid, false);
  }
  const timelineRequest = {
    operation: 'set_person_timeline_disposition',
    request_id: 'person-profile:maimonides:chronology-unresolved-to-timeline:20261009:v1',
    payload: {
      person_id: '3f3cb937-b022-4b5c-9380-2a8625b33a2e',
      disposition: 'timeline',
      expected_current_disposition: {
        disposition: 'chronology_unresolved',
        reason: 'reviewed exclusion',
        review_evidence: { source: 'reviewed evidence' }
      }
    }
  };
  assert.equal(validateRequest(timelineRequest).valid, true);
  assert.deepEqual(validateRequest(timelineRequest).request, timelineRequest);
  assert.equal(validateRequest({ operation: 'unknown', payload: {} }).valid, false);
  assert.equal(validateRequest({ operation: 'delete' }).valid, false);
});

test('rejects non-POST without calling service', async () => {
  let calls = 0;
  const transport = createMutationTransport({ mutationService: { async mutate() { calls += 1; return { committed: true }; } } });
  const response = await transport.handle({ method: 'GET' });
  assert.equal(response.status, 405);
  assert.equal(calls, 0);
});

test('authorization fails closed before mutation', async () => {
  let calls = 0;
  const transport = createMutationTransport({
    mutationService: { async mutate() { calls += 1; return { committed: true }; } },
    authorize: async () => ({ authorized: false, reason: 'blocked' })
  });
  const response = await transport.handle({ method: 'POST', body: JSON.stringify({ operation: 'create', payload: {} }) });
  assert.equal(response.status, 401);
  assert.equal(calls, 0);
});

test('forwards validated request and preserves service outcome', async () => {
  let seen = null;
  const transport = createMutationTransport({
    mutationService: { async mutate(request) { seen = request; return { committed: true, request_id: request.request_id || 'generated' }; } },
    authorize: async () => ({ authorized: true })
  });
  const response = await transport.handle({
    method: 'POST',
    body: JSON.stringify({ operation: 'delete', payload: { id: 7 }, request_id: 'req-1' })
  });
  assert.equal(response.status, 200);
  assert.equal(seen.operation, 'delete');
  assert.equal(seen.request_id, 'req-1');
  const body = JSON.parse(response.body);
  assert.equal(body.ok, true);
  assert.equal(body.outcome.committed, true);
});

test('maps validation blocker to conflict and transaction failure to server error', async () => {
  const blocked = createMutationTransport({ mutationService: { async mutate() { return { committed: false, validation_failures: [{ code: 'BLOCKED' }] }; } } });
  assert.equal((await blocked.handle({ method: 'POST', body: { operation: 'delete', payload: { id:'x' } } })).status, 409);

  const failed = createMutationTransport({ mutationService: { async mutate() { return { committed: false, validation_failures: [], transaction_failure: 'boom' }; } } });
  assert.equal((await failed.handle({ method: 'POST', body: { operation: 'delete', payload: { id:'x' } } })).status, 500);
});
