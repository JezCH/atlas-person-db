import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const reconciliation = require('../server/atlas-relationship-reconciliation.js');
const interlock = require('../server/atlas-person-merge-interlock.js');
const { createDuplicateReviewHandler, mergeExecutionStateWithReadiness } = require('../server/atlas-duplicate-review-handler.js');
const handlerSource = fs.readFileSync('server/atlas-duplicate-review-handler.js', 'utf8');
const mergeSource = fs.readFileSync('server/atlas-person-merge-service.js', 'utf8');
const adminSource = fs.readFileSync('admin.js', 'utf8');
const adminHtml = fs.readFileSync('admin.html', 'utf8');
const authoringReadme = fs.readFileSync('authoring/README.md', 'utf8');

function responseCapture() {
  return {
    statusCode: null,
    headers: {},
    body: null,
    setHeader(name, value) { this.headers[name] = value; },
    end(value) { this.body = JSON.parse(value); }
  };
}

test('P10-D activates v2 relationship reconciliation and current physical merge code lifecycle', () => {
  assert.equal(reconciliation.RECONCILIATION_SEMANTIC_VERSION, 'v2-relation-full-temporal');
  const state = interlock.personMergeExecutionState();
  assert.equal(state.allowed, true);
  assert.equal(state.reconciliation_semantic_version, 'v2-relation-full-temporal');
  assert.equal(state.required_reconciliation_semantic_version, 'v2-relation-full-temporal');
  assert.equal(state.person_merge_lifecycle_version, 'p10-v2-revalidated');
  assert.equal(state.required_person_merge_lifecycle_version, 'p10-v2-revalidated');
  assert.equal(interlock.assertPersonMergeExecutionAllowed().allowed, true);
});

test('authenticated EXECUTE_APPROVED_MERGE reaches the database only after static P10 lifecycle compatibility', async () => {
  let databaseConnections = 0;
  const handler = createDuplicateReviewHandler({
    env: {
      SUPABASE_DB_URL: 'postgresql://example.invalid/atlas',
      ATLAS_MUTATION_TOKEN: 'test-mutation-token',
      ATLAS_SESSION_SECRET: 'test-session-secret'
    },
    clientFactory: async () => {
      databaseConnections += 1;
      throw new Error('synthetic connection failure after static lifecycle gate');
    }
  });
  const res = responseCapture();
  await handler({
    method: 'POST',
    headers: { authorization: 'Bearer test-mutation-token' },
    body: {
      operation: 'EXECUTE_APPROVED_MERGE',
      candidate_id: '00000000-0000-4000-8000-000000000001',
      survivor_person_id: '00000000-0000-4000-8000-000000000002',
      request_id: 'p10d-probe'
    }
  }, res);

  assert.equal(databaseConnections, 1);
  assert.equal(res.statusCode, 503);
  assert.equal(res.body?.ok, false);
  assert.equal(res.body?.code, 'DATABASE_UNAVAILABLE');
});

test('destructive execution requires live duplicate revalidation inside the serializable merge transaction', () => {
  const begin = mergeSource.indexOf('BEGIN ISOLATION LEVEL SERIALIZABLE');
  const readiness = mergeSource.indexOf('await assertPersonDuplicateRevalidationReadiness(client)');
  const mutation = mergeSource.indexOf('for (const item of reconciliationPlan.coalesces)');
  assert.ok(begin >= 0 && readiness > begin && mutation > readiness);
  assert.match(mergeSource, /P10_OVERLAPPING_REVALIDATION_REQUIREMENT_REQUIRES_REBIND/);
  assert.match(mergeSource, /await refreshCandidateFrontier\(client\)/);
});

test('candidate rebuild and identity review operations remain active while destructive execution has stricter DB gates', () => {
  assert.match(handlerSource, /REBUILD_CANDIDATES/);
  assert.match(handlerSource, /REVIEW_CANDIDATE/);
  assert.match(handlerSource, /EXECUTE_APPROVED_MERGE/);
  const staticGate = handlerSource.indexOf('assertPersonMergeExecutionAllowed()');
  const databaseOpen = handlerSource.indexOf('client = await clientFactory(databaseUrl)');
  assert.ok(staticGate > 0 && databaseOpen > staticGate);
});

test('duplicate review GET combines lifecycle compatibility with live revalidation readiness', () => {
  const blocked = mergeExecutionStateWithReadiness({ ready: false, blockers: ['CANDIDATE_REVIEW_PENDING:fixture'] });
  assert.equal(blocked.lifecycle_code_ready, true);
  assert.equal(blocked.revalidation_ready, false);
  assert.equal(blocked.allowed, false);
  assert.deepEqual(blocked.revalidation_blockers, ['CANDIDATE_REVIEW_PENDING:fixture']);

  const ready = mergeExecutionStateWithReadiness({ ready: true, blockers: [] });
  assert.equal(ready.lifecycle_code_ready, true);
  assert.equal(ready.revalidation_ready, true);
  assert.equal(ready.allowed, true);
  assert.match(handlerSource, /merge_execution_state:mergeExecutionStateWithReadiness\(revalidationReadiness\)/);
});

test('admin UI consumes merge lifecycle state and offers physical execution only when server readiness allows it', () => {
  assert.match(adminSource, /payload\.merge_execution_state/);
  assert.match(adminSource, /if \(!mergeExecutionState\.allowed\)/);
  assert.match(adminSource, /실제 병합 실행 대기/);
  assert.match(adminHtml, /병합 승인/);
});

test('current authoring surfaces reject historical year zero instead of documenting a fake unknown value', () => {
  assert.match(adminSource, /start === 0 \|\| end === 0/);
  assert.match(authoringReadme, /Historical year `?0`? is forbidden/);
  assert.doesNotMatch(authoringReadme, /"activity_start": 0/);
  assert.doesNotMatch(authoringReadme, /"activity_end": 0/);
});
