import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const reconciliation = require('../server/atlas-relationship-reconciliation.js');
const interlock = require('../server/atlas-person-merge-interlock.js');
const { createDuplicateReviewHandler } = require('../server/atlas-duplicate-review-handler.js');
const handlerSource = fs.readFileSync('server/atlas-duplicate-review-handler.js', 'utf8');
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

test('P9 activates v2 relationship reconciliation while physical Person merge remains blocked until P10 revalidation', () => {
  assert.equal(reconciliation.RECONCILIATION_SEMANTIC_VERSION, 'v2-relation-full-temporal');
  const state = interlock.personMergeExecutionState();
  assert.equal(state.allowed, false);
  assert.equal(state.reconciliation_semantic_version, 'v2-relation-full-temporal');
  assert.equal(state.required_reconciliation_semantic_version, 'v2-relation-full-temporal');
  assert.equal(state.person_merge_lifecycle_version, 'pre-p10-blocked');
  assert.equal(state.required_person_merge_lifecycle_version, 'p10-v2-revalidated');
  assert.throws(
    () => interlock.assertPersonMergeExecutionAllowed(),
    (error) => error?.code === 'PERSON_MERGE_BLOCKED_UNTIL_P10_V2_REVALIDATION'
  );
});

test('authenticated EXECUTE_APPROVED_MERGE requests remain blocked before any database connection until P10', async () => {
  let databaseConnections = 0;
  const handler = createDuplicateReviewHandler({
    env: {
      SUPABASE_DB_URL: 'postgresql://example.invalid/atlas',
      ATLAS_MUTATION_TOKEN: 'test-mutation-token',
      ATLAS_SESSION_SECRET: 'test-session-secret'
    },
    clientFactory: async () => {
      databaseConnections += 1;
      throw new Error('database must not be reached by blocked physical merge');
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
      request_id: 'blocked-probe'
    }
  }, res);

  assert.equal(databaseConnections, 0);
  assert.equal(res.statusCode, 409);
  assert.equal(res.body?.ok, false);
  assert.equal(res.body?.code, 'PERSON_MERGE_BLOCKED_UNTIL_P10_V2_REVALIDATION');
  assert.equal(res.body?.reconciliation_semantic_version, 'v2-relation-full-temporal');
  assert.equal(res.body?.required_reconciliation_semantic_version, 'v2-relation-full-temporal');
  assert.equal(res.body?.person_merge_lifecycle_version, 'pre-p10-blocked');
});

test('candidate rebuild and identity review operations remain active while destructive execution alone is gated', () => {
  assert.match(handlerSource, /REBUILD_CANDIDATES/);
  assert.match(handlerSource, /REVIEW_CANDIDATE/);
  assert.match(handlerSource, /EXECUTE_APPROVED_MERGE/);
  const gate = handlerSource.indexOf('assertPersonMergeExecutionAllowed()');
  const databaseOpen = handlerSource.indexOf('client = await clientFactory(databaseUrl)');
  assert.ok(gate > 0 && databaseOpen > gate, 'physical merge interlock must run before database connection');
});

test('duplicate review GET exposes the same merge lifecycle state that the server enforces', () => {
  assert.match(handlerSource, /merge_execution_state:\s*personMergeExecutionState\(\)/);
  assert.match(handlerSource, /personMergeExecutionState/);
});

test('admin UI consumes merge lifecycle state and does not offer physical execution while P10 is blocked', () => {
  assert.match(adminSource, /payload\.merge_execution_state/);
  assert.match(adminSource, /if \(!mergeExecutionState\.allowed\)/);
  assert.match(adminSource, /실제 병합 실행 대기/);
  assert.match(adminSource, /P10 후보 재검증/);
  assert.match(adminHtml, /지금은 판정만 가능하며 physical Person 병합/);
});

test('current authoring surfaces reject historical year zero instead of documenting a fake unknown value', () => {
  assert.match(adminSource, /start === 0 \|\| end === 0/);
  assert.match(authoringReadme, /Historical year `?0`? is forbidden/);
  assert.doesNotMatch(authoringReadme, /"activity_start": 0/);
  assert.doesNotMatch(authoringReadme, /"activity_end": 0/);
});
