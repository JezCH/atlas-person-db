import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createIntegration } = require('../atlas-reconciliation-integration.js');
const plannerApi = require('../atlas-reconciliation-planner.js');
const controllerApi = require('../atlas-reconciliation-controller.js');
const executorApi = require('../atlas-legacy-reconciliation-executor.js');

function fakeDb(rows = []) {
  const calls = [];
  const db = {
    calls,
    from(table) {
      calls.push(['from', table]);
      return {
        select() { calls.push(['select']); return { order: async () => ({ data: rows, error: null }) }; },
        delete() { return { eq: async (...args) => { calls.push(['delete', ...args]); return { error: null }; } }; },
        update(payload) { return { eq: async (...args) => { calls.push(['update', payload, ...args]); return { error: null }; } }; },
        insert: async (payload) => { calls.push(['insert', payload]); return { error: null }; }
      };
    }
  };
  return db;
}

const canonicalApi = {
  OBSOLETE_KEYS: new Set(),
  async loadCanonical() {
    return {
      rows: [{ person_name: 'Ada Lovelace', politic_name: 'United Kingdom', activity_start: 1842, activity_end: 1852, role: 'Mathematician', period_basis: 'intellectual_activity', notes: null }],
      excludedNames: []
    };
  }
};

test('disabled integration performs zero database reads or writes', async () => {
  const db = fakeDb();
  const integration = createIntegration({ canonicalApi, db, plannerApi, controllerApi, executorApi, state: 'disabled' });
  const result = await integration.run();
  assert.equal(result.state, 'disabled');
  assert.equal(result.commit, false);
  assert.equal(result.database_writes, 0);
  assert.equal(db.calls.length, 0);
});

test('dry-run loads canonical and legacy rows but commits nothing', async () => {
  const db = fakeDb([]);
  const integration = createIntegration({ canonicalApi, db, plannerApi, controllerApi, executorApi, state: 'dry-run' });
  const result = await integration.run();
  assert.equal(result.state, 'dry-run');
  assert.equal(result.commit, false);
  assert.equal(result.database_writes, 0);
  assert.equal(result.plan.proposed_inserts.length, 1);
  assert.equal(db.calls.some((call) => call[0] === 'insert' || call[0] === 'update' || call[0] === 'delete'), false);
});

test('legacy-commit executes only the planner output through the legacy executor', async () => {
  const db = fakeDb([]);
  const integration = createIntegration({ canonicalApi, db, plannerApi, controllerApi, executorApi, state: 'legacy-commit' });
  const result = await integration.run();
  assert.equal(result.commit, true);
  assert.equal(result.database_writes, 1);
  assert.equal(db.calls.some((call) => call[0] === 'insert'), true);
  assert.equal(db.calls.filter((call) => call[0] === 'from').every((call) => call[1] === 'person_politics'), true);
  assert.equal(result.v2_committed, false);
});

test('unknown state fails closed before database access', async () => {
  const db = fakeDb();
  const integration = createIntegration({ canonicalApi, db, plannerApi, controllerApi, executorApi, state: 'not-authorized', warn: () => {} });
  const result = await integration.run();
  assert.equal(result.state, 'disabled');
  assert.equal(db.calls.length, 0);
});
