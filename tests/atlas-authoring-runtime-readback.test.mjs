import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyPersonReadback, verifyProtectedProducer } from '../scripts/atlas-authoring-runtime-readback.mjs';

const personId = '44d38e5f-e48a-4bc5-9357-ab30f8625399';
const activityId = '34d56578-a361-402a-a710-c643b52e8f2e';
const polityId = '7d09bc56-1ea0-515e-a3e7-9863361b6f15';
const source = { title: 'Library of Congress', canonical_url: 'https://www.loc.gov', citation_text: 'Reviewed literary biography', source_type: 'web_bibliographic_reference' };
const manifest = {
  person: { person_type: 'historical', canonical_name_en: 'Mark Twain', representative_domain: 'culture' },
  activity: { relation_type: 'active_in', start_year: 1885, end_year: 1885 },
  polity: { existing_id: polityId },
  sources: [source],
  external_references: { namuwiki: { status: 'linked' } }
};
const response = {
  ok: true,
  schema: 'atlas-person-read/v1',
  mode: 'detail',
  person: {
    id: personId, canonical_name_en: 'Mark Twain', person_type: 'historical',
    representative_domain: 'culture', external_references: { namuwiki: { status: 'linked' } },
    activities: [{
      id: activityId, person_id: personId, polity: { id: polityId },
      relation: { code: 'active_in' }, start: { year: 1885 }, end: { year: 1885 },
      sources: [source]
    }]
  }
};
const applied = { person_id: personId, relationship_id: activityId };
const run = (alter) => {
  const args = { person: structuredClone(response), manifest: structuredClone(manifest), applied: structuredClone(applied) };
  if (alter) alter(args);
  return verifyPersonReadback(args);
};
test('exact user-visible Production Person/Activity/Polity/Source data accepted', () => {
  assert.deepEqual(run(), { ok: true, personId, activityId });
});
test('wrong Person ID or unreviewed representative domain fails', () => {
  assert.equal(run((x) => { x.person.person.id = 'other'; }).reason, 'PERSON_IDENTITY_OR_DOMAIN_MISMATCH');
  assert.equal(run((x) => { x.person.person.representative_domain = 'governance'; }).reason, 'PERSON_IDENTITY_OR_DOMAIN_MISMATCH');
});
test('wrong Activity, Polity, period or relation never passes', () => {
  assert.equal(run((x) => { x.applied.relationship_id = 'other'; }).reason, 'ACTIVITY_POLITY_OR_YEAR_MISMATCH');
  assert.equal(run((x) => { x.person.person.activities[0].polity.id = 'another'; }).reason, 'ACTIVITY_POLITY_OR_YEAR_MISMATCH');
  assert.equal(run((x) => { x.person.person.activities[0].start.year = 1884; }).reason, 'ACTIVITY_POLITY_OR_YEAR_MISMATCH');
  assert.equal(run((x) => { x.person.person.activities[0].relation.code = 'serves'; }).reason, 'ACTIVITY_POLITY_OR_YEAR_MISMATCH');
});
test('the same URL and title cannot claim a different historical assertion in live Runtime', () => {
  assert.equal(run((x) => { x.person.person.activities[0].sources[0].citation_text='Unrelated historical claim'; }).reason,
    'ACTIVITY_SOURCE_PROVENANCE_MISMATCH');
  assert.equal(run((x) => { x.person.person.activities[0].sources[0].source_type='unknown'; }).reason,
    'ACTIVITY_SOURCE_PROVENANCE_MISMATCH');
  assert.equal(run((x) => { x.person.person.activities[0].sources[0].title='British monarch title'; }).reason,
    'ACTIVITY_SOURCE_PROVENANCE_MISMATCH');
  assert.equal(run((x) => { x.person.person.activities[0].sources[0].citation_text='  Reviewed   literary biography  '; }).ok, true);
});

test('no provenance or NamuWiki mismatch is silently accepted', () => {
  assert.equal(run((x) => { x.person.person.activities[0].sources = []; }).reason, 'ACTIVITY_SOURCE_PROVENANCE_MISMATCH');
  assert.equal(run((x) => { x.person.person.external_references.namuwiki.status = 'not_found'; }).reason, 'NAMUWIKI_REVIEW_MISMATCH');
  assert.equal(run((x) => { x.person.ok = false; }).reason, 'PERSON_DETAIL_NOT_LIVE');
});

const trustedProducer = Object.freeze({
  name: 'ATLAS Authoring Apply',
  path: '.github/workflows/atlas-authoring-apply.yml',
  event: 'workflow_dispatch',
  head_branch: 'main',
  repository: { full_name: 'JezCH/atlas-person-db' },
  head_repository: { full_name: 'JezCH/atlas-person-db' },
  actor: { login: 'JezCH', type: 'User' },
  status: 'completed',
  conclusion: 'success',
  head_sha: 'a'.repeat(40)
});

test('protected user and GitHub Actions service actor are both authenticated with exact repository and workflow', () => {
  assert.deepEqual(verifyProtectedProducer(trustedProducer), { ok: true });
  assert.deepEqual(verifyProtectedProducer({
    ...trustedProducer, actor: { login: 'github-actions[bot]', type: 'Bot' }
  }), { ok: true });
  assert.deepEqual(verifyProtectedProducer({
    ...trustedProducer, actor: { login: 'github-actions[bot]', type: 'Bot' },
    status: 'in_progress', conclusion: null
  }), { ok: true });
});

test('no other actor, workflow, repository, event, branch or SHA can claim protected handoff', () => {
  const failures = [
    [{ actor: { login: 'third-party[bot]', type: 'Bot' } }, 'UNTRUSTED_ACTOR'],
    [{ actor: { login: 'github-actions[bot]', type: 'User' } }, 'UNTRUSTED_ACTOR'],
    [{ actor: { login: 'JezCH', type: 'Bot' } }, 'UNTRUSTED_ACTOR'],
    [{ path: '.github/workflows/untrusted.yml' }, 'WORKFLOW_OR_BRANCH'],
    [{ name: 'ATLAS Runtime Projection Compile' }, 'WORKFLOW_OR_BRANCH'],
    [{ event: 'push' }, 'WORKFLOW_OR_BRANCH'],
    [{ head_branch: 'main-malicious' }, 'WORKFLOW_OR_BRANCH'],
    [{ repository: { full_name: 'other/repo' } }, 'REPOSITORY_OR_HEAD'],
    [{ head_repository: { full_name: 'other/repo' } }, 'REPOSITORY_OR_HEAD'],
    [{ status: 'completed', conclusion: 'failure' }, 'STATUS_OR_CONCLUSION'],
    [{ status: 'queued' }, 'STATUS_OR_CONCLUSION'],
    [{ head_sha: 'not-a-commit' }, 'INVALID_COMMIT_SHA'],
    [{ head_sha: null }, 'INVALID_COMMIT_SHA']
  ];
  for (const [changes, reason] of failures) {
    assert.deepEqual(verifyProtectedProducer({ ...trustedProducer, ...changes }), { ok: false, reason });
  }
  assert.deepEqual(verifyProtectedProducer(null), { ok: false, reason: 'WORKFLOW_OR_BRANCH' });
});
