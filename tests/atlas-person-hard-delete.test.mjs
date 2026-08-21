import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createPersonDeleteService } = require('../server/atlas-person-delete-service.js');
const { validateRequest } = require('../server/atlas-mutation-transport.js');

const PERSON = '11111111-1111-4111-8111-111111111111';
const REL = '22222222-2222-4222-8222-222222222222';
const AFFILIATION = '33333333-3333-4333-8333-333333333333';
const PARTICIPATION = '44444444-4444-4444-8444-444444444444';

function normalized(sql) {
  return String(sql).replace(/\s+/g, ' ').trim().toLowerCase();
}

function verificationRow(overrides = {}) {
  return {
    persons: 0,
    names: 0,
    person_sources: 0,
    person_descriptions: 0,
    external_references: 0,
    activities: 0,
    people_affiliations: 0,
    event_participations: 0,
    authoring_person_refs: 0,
    active_duplicate_candidates: 0,
    active_revalidation_requirements: 0,
    ...overrides
  };
}

function createFakeClient({ personExists = true, verification = verificationRow(), requirementLedgerPresent = true } = {}) {
  const calls = [];
  return {
    calls,
    async query(sql, params = []) {
      const text = normalized(sql);
      calls.push({ text, params });

      if (text.startsWith('begin ') || text === 'commit' || text === 'rollback') return { rowCount: 0, rows: [] };
      if (text.startsWith('select to_regclass')) {
        return { rowCount: 1, rows: [{ relation: requirementLedgerPresent ? 'atlas_v2.person_duplicate_revalidation_requirements' : null }] };
      }
      if (text.includes('as active_duplicate_candidates')) return { rowCount: 1, rows: [verification] };
      if (text.startsWith('select id,canonical_key,person_type,historicity from atlas_v2.persons')) {
        return personExists
          ? { rowCount: 1, rows: [{ id: PERSON, canonical_key: 'delete-target', person_type: 'historical', historicity: 'historical' }] }
          : { rowCount: 0, rows: [] };
      }
      if (text.startsWith('select id from atlas_v2.person_politics_v2')) return { rowCount: 1, rows: [{ id: REL }] };
      if (text.startsWith('select id from atlas_v2.person_people_affiliations')) return { rowCount: 1, rows: [{ id: AFFILIATION }] };
      if (text.startsWith('select id from atlas_v2.person_event_participations')) return { rowCount: 1, rows: [{ id: PARTICIPATION }] };
      if (text.startsWith('delete from atlas_v2.person_names')) return { rowCount: 1, rows: [{ id: '55555555-5555-4555-8555-555555555555' }] };
      if (text.startsWith('delete from atlas_v2.persons')) return { rowCount: 1, rows: [{ id: PERSON }] };
      if (text.startsWith('delete from ') || text.startsWith('update atlas_v2.')) return { rowCount: 1, rows: [{}] };
      if (text.startsWith('select pg_advisory_xact_lock')) return { rowCount: 1, rows: [{}] };
      throw new Error(`Unexpected SQL in fake client: ${text}`);
    }
  };
}

function dependencies() {
  const calls = { lock: 0 };
  return {
    calls,
    frontierLock: async () => { calls.lock += 1; }
  };
}

test('delete_person accepts authenticated Person UUID without name confirmation payload', () => {
  const validation = validateRequest({
    operation: 'delete_person',
    payload: { person_id: PERSON }
  });
  assert.equal(validation.valid, true);
  assert.equal(validation.request.operation, 'delete_person');
  assert.deepEqual(validation.request.payload, { person_id: PERSON });
});

test('invalid Person UUID fails before destructive SQL', async () => {
  const client = createFakeClient();
  const deps = dependencies();
  const service = createPersonDeleteService({ client, ...deps });
  const outcome = await service.mutate({
    request_id: 'hard-delete-invalid-id',
    operation: 'delete_person',
    payload: { person_id: 'not-a-uuid' }
  });

  assert.equal(outcome.committed, false);
  assert.equal(outcome.validation_failures[0].code, 'PERSON_ID_REQUIRED');
  assert.equal(client.calls.some(({ text }) => text.startsWith('delete from ')), false);
});

test('missing Person rolls back before destructive SQL', async () => {
  const client = createFakeClient({ personExists: false });
  const deps = dependencies();
  const service = createPersonDeleteService({ client, ...deps });
  const outcome = await service.mutate({
    request_id: 'hard-delete-missing-person',
    operation: 'delete_person',
    payload: { person_id: PERSON }
  });

  assert.equal(outcome.committed, false);
  assert.equal(outcome.validation_failures[0].code, 'PERSON_DELETE_TARGET_NOT_FOUND');
  assert.equal(client.calls.some(({ text }) => text.startsWith('delete from ')), false);
  assert.equal(client.calls.at(-1).text, 'rollback');
});

test('Person hard-delete is a local cleanup and does not invoke global P10 readiness or frontier rebuild', async () => {
  const client = createFakeClient();
  const deps = dependencies();
  const service = createPersonDeleteService({
    client,
    ...deps,
    referenceReadiness: async () => { throw new Error('P10_ACTIVITY_NOT_SEMANTIC_V2_READY: malformed relation_type_id'); },
    refreshFrontier: async () => { throw new Error('global frontier rebuild must not run during hard delete'); }
  });
  const outcome = await service.mutate({
    request_id: 'hard-delete-malformed-target',
    operation: 'delete_person',
    payload: { person_id: PERSON }
  });

  assert.equal(outcome.committed, true);
  assert.equal(outcome.v2.deleted_person_id, PERSON);
  assert.equal(outcome.verification.match, true);
  assert.equal(deps.calls.lock, 1);

  const serviceSource = fs.readFileSync(new URL('../server/atlas-person-delete-service.js', import.meta.url), 'utf8');
  assert.doesNotMatch(serviceSource, /assertPersonMergeReferenceReadiness/);
  assert.doesNotMatch(serviceSource, /refreshCandidateFrontier/);
  assert.match(serviceSource, /candidate_state='STALE'/);
});

test('successful Person hard-delete removes live references, stales only target duplicate frontier rows, verifies zero, then commits', async () => {
  const client = createFakeClient();
  const deps = dependencies();
  const service = createPersonDeleteService({ client, ...deps });
  const outcome = await service.mutate({
    request_id: 'hard-delete-success',
    operation: 'delete_person',
    payload: { person_id: PERSON }
  });

  assert.equal(outcome.committed, true);
  assert.equal(outcome.v2.committed, true);
  assert.equal(outcome.v2.deleted_person_id, PERSON);
  assert.equal(outcome.verification.checked, true);
  assert.equal(outcome.verification.match, true);
  assert.deepEqual(outcome.verification.remaining_live_references, verificationRow());
  assert.equal(deps.calls.lock, 1);
  assert.equal(outcome.v2.duplicate_frontier.staled_for_deleted_person, 1);

  const sql = client.calls.map(({ text }) => text);
  for (const expected of [
    'delete from atlas_v2.person_politics_sources',
    'delete from atlas_v2.chronology_claims',
    'delete from atlas_v2.relationship_descriptions',
    'delete from atlas_v2.person_people_affiliation_sources',
    'delete from atlas_v2.person_event_participation_sources',
    'delete from atlas_v2.person_politics_v2',
    'delete from atlas_v2.person_people_affiliations',
    'delete from atlas_v2.person_event_participations',
    'delete from atlas_v2.person_sources',
    'delete from atlas_v2.person_descriptions',
    'delete from atlas_v2.person_external_references',
    'delete from atlas_v2.person_names',
    'delete from atlas_v2.persons'
  ]) assert.ok(sql.some((text) => text.startsWith(expected)), `missing ${expected}`);

  assert.ok(sql.some((text) => text.startsWith('update atlas_v2.person_duplicate_candidates') && text.includes("candidate_state='stale'")));
  assert.ok(sql.some((text) => text.includes('person_duplicate_revalidation_requirements') && text.startsWith('update ')));
  assert.equal(sql.some((text) => text.includes('delete from atlas_v2.person_duplicate_reviews')), false);
  assert.equal(sql.some((text) => text.includes('delete from atlas_v2.person_merge_audit')), false);
  assert.equal(sql.some((text) => text.includes('delete from atlas_v2.person_duplicate_candidates')), false);
  assert.equal(sql.at(-1), 'commit');
});

test('remaining live reference after destructive statements fails closed and rolls the whole transaction back', async () => {
  const client = createFakeClient({ verification: verificationRow({ persons: 1 }) });
  const deps = dependencies();
  const service = createPersonDeleteService({ client, ...deps });
  const outcome = await service.mutate({
    request_id: 'hard-delete-verification-failure',
    operation: 'delete_person',
    payload: { person_id: PERSON }
  });

  assert.equal(outcome.committed, false);
  assert.equal(outcome.rollback, true);
  assert.match(outcome.transaction_failure, /PERSON_DELETE_VERIFICATION_FAILED/);
  const sql = client.calls.map(({ text }) => text);
  assert.ok(sql.some((text) => text.startsWith('delete from atlas_v2.persons')));
  assert.equal(sql.includes('commit'), false);
  assert.equal(sql.at(-1), 'rollback');
});

test('older schema without revalidation ledger skips its update but still verifies and commits', async () => {
  const client = createFakeClient({ requirementLedgerPresent: false });
  const deps = dependencies();
  const service = createPersonDeleteService({ client, ...deps });
  const outcome = await service.mutate({
    request_id: 'hard-delete-no-revalidation-ledger',
    operation: 'delete_person',
    payload: { person_id: PERSON }
  });

  assert.equal(outcome.committed, true);
  assert.equal(outcome.v2.deleted_counts.revalidation_requirements_retired, 0);
  const sql = client.calls.map(({ text }) => text);
  assert.equal(sql.some((text) => text.startsWith('update atlas_v2.person_duplicate_revalidation_requirements')), false);
  assert.equal(sql.at(-1), 'commit');
});

test('browser uses one confirmation and UUID-only delete while retaining DB verification before reload', () => {
  const adapter = fs.readFileSync(new URL('../atlas-server-write-adapter.js', import.meta.url), 'utf8');
  const ui = fs.readFileSync(new URL('../atlas-person-hard-delete.js', import.meta.url), 'utf8');
  const css = fs.readFileSync(new URL('../atlas-person-hard-delete.css', import.meta.url), 'utf8');
  const handler = fs.readFileSync(new URL('../server/atlas-vercel-mutation-handler.js', import.meta.url), 'utf8');
  const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(adapter, /deletePerson:\s*\(personId\)\s*=>\s*mutate\("delete_person"/);
  assert.match(adapter, /person_id:/);
  assert.doesNotMatch(adapter, /confirmation_name:/);
  assert.match(adapter, /person-hard-delete-v4/);
  assert.match(index, /atlas-server-write-adapter\.js\?v=20260821-person-profile-v1/);
  assert.match(handler, /operation\s*===\s*"delete_person"/);
  assert.match(ui, /window\.confirm/);
  assert.doesNotMatch(ui, /window\.prompt/);
  assert.match(ui, /deletePerson\(personId\)/);
  assert.match(ui, /outcome\?\.verification\?\.checked === true/);
  assert.match(ui, /outcome\?\.verification\?\.match === true/);
  assert.match(ui, /window\.location\.reload\(\)/);
  assert.match(css, /person-hard-delete-button/);
});
