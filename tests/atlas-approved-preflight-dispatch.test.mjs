import test from 'node:test';
import assert from 'node:assert/strict';
import { assessApprovedPreflightHandoff, assessApprovedBatchPreflightHandoff, approvedBatchSelectorPaths } from '../scripts/atlas-approved-preflight-dispatch.mjs';

const target = 'authoring/requests/youtube39-20261023-edgar-allan-poe-representative.json';
const requestId = 'authoring:user-youtube39-20261023:edgar-allan-poe:representative:v1';
const run = {
  name: 'ATLAS Authoring Apply', event: 'push', head_branch: 'main',
  status: 'completed', conclusion: 'success', actor: { login: 'JezCH' },
  head_sha: 'a'.repeat(40), run_attempt: 1
};
const manifest = {
  schema: 'atlas-human-authoring/v1', review_status: 'approved',
  request_id: requestId,
  person: { canonical_name_en: 'Edgar Allan Poe', life_status: 'deceased', representative_domain_reviewed: true },
  polity: { existing_id: '7d09bc56-1ea0-515e-a3e7-9863361b6f15' },
  sources: [{ canonical_url: 'https://blogs.loc.gov/catbird/2015/01/edgar-allan-poe-and-the-raven/' }],
  external_references: { namuwiki: { status: 'linked' } },
  review_context: { preflight_required: true, auto_continue_after_preflight: true, source_draft_pr: 2589 }
};
const evidence = {
  ok: true, marker: 'ATLAS_HUMAN_AUTHORING_BATCH_V1', operation: 'preflight_batch',
  committed: false, ready_count: 1, already_present_count: 0, blocked_count: 0,
  results: [{ status: 'READY', request_id: requestId, manifest_path: target }]
};
const original = () => ({
  run: structuredClone(run),
  selector: 'preflight ' + target + '\n',
  manifest: structuredClone(manifest),
  evidence: structuredClone(evidence),
  changedPaths: ['authoring/requests/' + target.split('/').at(-1), '.github/atlas-authoring-preflight.txt']
});

test('protected authoring completed+READY+explicit reviewed scope may dispatch', () => {
  assert.deepEqual(assessApprovedPreflightHandoff(original()), { ok: true, requestPath: target, requestId });
});
test('no unreviewed, unapproved or ambiguous request is automatically applied', () => {
  const a = original(); delete a.manifest.review_context.auto_continue_after_preflight;
  assert.equal(assessApprovedPreflightHandoff(a).reason, 'NO_EXPLICIT_REVIEWED_PERSON_AUTOCONTINUE');
  const b = original(); b.manifest.review_status = 'HOLD';
  assert.equal(assessApprovedPreflightHandoff(b).reason, 'NO_EXPLICIT_REVIEWED_PERSON_AUTOCONTINUE');
  const c = original(); delete c.manifest.polity.existing_id;
  assert.equal(assessApprovedPreflightHandoff(c).reason, 'NO_EXPLICIT_REVIEWED_PERSON_AUTOCONTINUE');
  const d = original(); d.manifest.sources = [];
  assert.equal(assessApprovedPreflightHandoff(d).reason, 'NO_EXPLICIT_REVIEWED_PERSON_AUTOCONTINUE');
});
test('OIDC preflight must be exact READY one with zero canonical writes', () => {
  const a = original(); a.evidence.results[0].status = 'BLOCKED';
  assert.equal(assessApprovedPreflightHandoff(a).reason, 'OIDC_ARTIFACT_NOT_READY_ONE');
  const b = original(); b.evidence.committed = true;
  assert.equal(assessApprovedPreflightHandoff(b).reason, 'OIDC_ARTIFACT_NOT_READY_ONE');
  const c = original(); c.evidence.results[0].manifest_path = 'authoring/requests/unrelated.json';
  assert.equal(assessApprovedPreflightHandoff(c).reason, 'OIDC_ARTIFACT_NOT_READY_ONE');
  const d = original(); d.evidence.already_present_count = 1;
  assert.equal(assessApprovedPreflightHandoff(d).reason, 'OIDC_ARTIFACT_NOT_READY_ONE');
});
test('not first owner push, stale/incorrect selector or push event fails closed', () => {
  const a = original(); a.run.run_attempt = 2;
  assert.equal(assessApprovedPreflightHandoff(a).reason, 'NOT_FIRST_SUCCESSFUL_OWNER_MAIN_PREFLIGHT');
  const b = original(); b.run.actor.login = 'stranger';
  assert.equal(assessApprovedPreflightHandoff(b).reason, 'NOT_FIRST_SUCCESSFUL_OWNER_MAIN_PREFLIGHT');
  const c = original(); c.selector = 'apply ' + target + '\n';
  assert.equal(assessApprovedPreflightHandoff(c).reason, 'NOT_EXACT_READ_ONLY_SELECTOR');
  const d = original(); d.changedPaths = [target];
  assert.equal(assessApprovedPreflightHandoff(d).reason, 'SELECTOR_NOT_CHANGED_BY_PROTECTED_PUSH');
  const e = original(); e.run.event = 'workflow_dispatch';
  assert.equal(assessApprovedPreflightHandoff(e).reason, 'NOT_FIRST_SUCCESSFUL_OWNER_MAIN_PREFLIGHT');
});

const otherPath = 'authoring/requests/youtube39-20261023-james-baldwin-representative.json';
const batchCase = () => {
  const a = original();
  const other = structuredClone(a.manifest);
  other.request_id = 'authoring:user-youtube39-20261023:james-baldwin:representative:v1';
  other.person.canonical_name_en = 'James Baldwin';
  return {
    run: a.run,
    selector: 'preflight ' + target + '\npreflight ' + otherPath + '\n',
    manifests: [a.manifest, other],
    evidence: {
      ...a.evidence, count: 2, ready_count: 2,
      results: [
        { status: 'READY', request_id: requestId, manifest_path: target },
        { status: 'READY', request_id: other.request_id, manifest_path: otherPath }
      ]
    },
    changedPaths: [target, otherPath, '.github/atlas-authoring-preflight.txt']
  };
};

test('bounded batch requires two to five distinct exact preflight lines', () => {
  const a = batchCase();
  assert.deepEqual(approvedBatchSelectorPaths(a.selector), [target, otherPath]);
  assert.equal(approvedBatchSelectorPaths('preflight ' + target + '\n'), null);
  assert.equal(approvedBatchSelectorPaths('apply ' + target + '\npreflight ' + otherPath + '\n'), null);
  assert.equal(approvedBatchSelectorPaths(a.selector + 'preflight ' + target + '\n'), null);
  assert.equal(approvedBatchSelectorPaths(a.selector.slice(0, -1)), null);
  assert.equal(approvedBatchSelectorPaths(('preflight ' + target + '\n').repeat(6)), null);
});

test('OIDC all-READY batch from exact main push may dispatch one writer batch', () => {
  const a = batchCase();
  assert.deepEqual(assessApprovedBatchPreflightHandoff(a), {
    ok: true,
    requests: [
      { path: target, requestId },
      { path: otherPath, requestId: a.manifests[1].request_id }
    ]
  });
  a.evidence.results.reverse();
  assert.equal(assessApprovedBatchPreflightHandoff(a).ok, true);
});

test('batch refuses mixed/ambiguous/non-unique identity or provenance', () => {
  const modifications = [
    a => { a.run.actor.login = 'untrusted'; },
    a => { a.run.run_attempt = 2; },
    a => { a.changedPaths.push('scripts/unrelated.js'); },
    a => { a.changedPaths.pop(); },
    a => { a.manifests[1].request_id = a.manifests[0].request_id; },
    a => { a.manifests[1].review_status = 'hold'; },
    a => { a.manifests[1].review_context.auto_continue_after_preflight = false; },
    a => { a.manifests[1].review_context.source_draft_pr = null; },
    a => { a.manifests[1].polity.existing_id = null; },
    a => { a.manifests[1].sources = []; },
    a => { a.evidence.committed = true; },
    a => { a.evidence.ready_count = 1; },
    a => { a.evidence.already_present_count = 1; },
    a => { a.evidence.blocked_count = 1; },
    a => { a.evidence.results[1].status = 'ALREADY_PRESENT'; },
    a => { a.evidence.results[1].manifest_path = target; },
    a => { a.evidence.results[1].request_id = requestId; }
  ];
  for (const corrupt of modifications) {
    const a = batchCase();
    corrupt(a);
    assert.equal(assessApprovedBatchPreflightHandoff(a).ok, false, String(corrupt));
  }
});
