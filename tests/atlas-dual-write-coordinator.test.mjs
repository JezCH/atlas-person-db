import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createCoordinator } = require('../atlas-dual-write-coordinator.js');

function legacySuccess() {
  return {
    request_id: 'atlas-create-abc12345',
    errors: [],
    legacy: { attempted: true, committed: true, record_ids: [7] }
  };
}

{
  const calls = [];
  const coordinator = createCoordinator({
    legacyAdapter: { createActivity: async (row) => { calls.push(['legacy', row]); return legacySuccess(); } },
    planner: { plan: (op, payload) => ({ operation: op, payload, commit: false, writes_performed: 0, blockers: [], commands: [] }) },
    v2Writer: async ({ context }) => { calls.push(['v2', context.request_id]); return { committed: true, transaction: true, transaction_failure: null }; }
  });
  const result = await coordinator.execute('create', { person_name: 'A' });
  assert.equal(result.promoted, true);
  assert.equal(result.rollback_required, false);
  assert.equal(result.drift, false);
  assert.deepEqual(calls.map((x) => x[0]), ['legacy', 'v2']);
}

{
  let v2Called = false;
  const coordinator = createCoordinator({
    legacyAdapter: { createActivity: async () => ({ errors: ['legacy failed'], legacy: { committed: false } }) },
    planner: { plan: () => { throw new Error('planner must not run'); } },
    v2Writer: async () => { v2Called = true; return {}; }
  });
  const result = await coordinator.execute('create', { person_name: 'A' });
  assert.equal(result.promoted, false);
  assert.equal(result.rollback_required, false);
  assert.equal(v2Called, false);
}

{
  let v2Called = false;
  const coordinator = createCoordinator({
    legacyAdapter: { createActivity: async () => legacySuccess() },
    planner: { plan: () => ({ commit: false, writes_performed: 0, blockers: [{ code: 'PERSON_IDENTITY_REQUIRED' }], commands: [] }) },
    v2Writer: async () => { v2Called = true; return {}; }
  });
  const result = await coordinator.execute('create', { person_name: 'A' });
  assert.equal(result.promoted, false);
  assert.equal(result.rollback_required, true);
  assert.equal(v2Called, false);
}

{
  const coordinator = createCoordinator({
    legacyAdapter: { updateActivity: async (id, value) => ({ ...legacySuccess(), operation: 'update', seen: { id, value } }) },
    planner: { plan: () => ({ commit: false, writes_performed: 0, blockers: [], commands: [] }) },
    v2Writer: async () => ({ committed: false, transaction: true, transaction_failure: 'boom' })
  });
  const result = await coordinator.execute('update', { id: 9, value: { person_name: 'A' } });
  assert.equal(result.promoted, false);
  assert.equal(result.rollback_required, true);
  assert.equal(result.errors[0], 'boom');
}

console.log('atlas-dual-write-coordinator tests: PASS');
