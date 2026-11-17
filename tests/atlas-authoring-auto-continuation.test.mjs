import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTO_MARKER, assessAuthoringApply, assessProtectedPreflight
} from '../scripts/atlas-authoring-auto-continuation.mjs';

const target = 'authoring/requests/youtube39-20261023-emily-dickinson-representative.json';
const sha = 'a'.repeat(40);
const base = 'b'.repeat(40);
const ownerRepo = { full_name: 'JezCH/atlas-person-db', owner: { login: 'JezCH' } };
const pr = {
  state: 'open',
  draft: false,
  user: { login: 'JezCH' },
  body: AUTO_MARKER + '\nhttps://github.com/JezCH/atlas-person-db/actions/runs/44009472796',
  base: { ref: 'main', sha: base, repo: ownerRepo },
  head: { ref: 'atlas/auto-authoring-emily-dickinson', sha, repo: ownerRepo }
};
const ciRun = { name: 'ATLAS Integrity', event: 'pull_request', conclusion: 'success' };
const files = [{
  filename: '.github/atlas-authoring-preflight.txt',
  status: 'modified',
  additions: 1,
  deletions: 1,
  patch: '@@ -1 +1 @@\n-preflight ' + target + '\n+apply ' + target
}];
const manifest = {
  schema: 'atlas-human-authoring/v1',
  review_status: 'approved',
  request_id: 'authoring:user-youtube39-20261023:emily-dickinson:representative:v1',
  person: {
    canonical_name_en: 'Emily Dickinson',
    life_status: 'deceased',
    representative_domain_reviewed: true
  },
  polity: { existing_id: '7d09bc56-1ea0-515e-a3e7-9863361b6f15' },
  sources: [{ canonical_url: 'https://www.emilydickinsonmuseum.org/publishedinlifetime/' }],
  external_references: { namuwiki: { status: 'linked' } },
  review_context: { preflight_required: true, source_draft_pr: 2589 }
};

function inputs(overrides = {}) {
  return {
    pr: structuredClone(pr), files: structuredClone(files),
    originalSelector: 'preflight ' + target + '\n',
    headSelector: 'apply ' + target + '\n',
    manifest: structuredClone(manifest), ciRun: structuredClone(ciRun),
    ...overrides
  };
}
const protectedRun = {
  name: 'ATLAS Authoring Apply', event: 'push', status: 'completed',
  conclusion: 'success', head_branch: 'main', head_sha: base,
  actor: { login: 'JezCH' }
};
const ready = {
  ok: true, marker: 'ATLAS_HUMAN_AUTHORING_BATCH_V1',
  operation: 'preflight_batch', committed: false,
  ready_count: 1, already_present_count: 0, blocked_count: 0,
  results: [{ status: 'READY', request_id: manifest.request_id, manifest_path: target }]
};
function preflightInputs() {
  return { run: structuredClone(protectedRun), evidence: structuredClone(ready),
    pr: structuredClone(pr), target, requestId: manifest.request_id };
}

test('only exact owner-authorized one-line selector passes', () => {
  assert.deepEqual(assessAuthoringApply(inputs()),
    { ok: true, target, requestId: manifest.request_id });
});
test('missing owner-authored explicit opt-in cannot merge', () => {
  const a = inputs();
  a.pr.body = 'Ready to merge';
  assert.equal(assessAuthoringApply(a).reason, 'EXPLICIT_OPT_IN_ABSENT');
  const b = inputs();
  b.pr.user.login = 'untrusted';
  assert.equal(assessAuthoringApply(b).reason, 'UNTRUSTED_PR_OR_BRANCH');
  const c = inputs();
  c.pr.head.ref = 'feature/random-code';
  assert.equal(assessAuthoringApply(c).reason, 'UNTRUSTED_PR_OR_BRANCH');
});
test('CI or touched file changes fail closed', () => {
  const a = inputs();
  a.ciRun.conclusion = 'failure';
  assert.equal(assessAuthoringApply(a).reason, 'CI_NOT_EXACT_SUCCESS');
  const b = inputs();
  b.files.push({ filename: 'server/atlas-authoring-handler.js' });
  assert.equal(assessAuthoringApply(b).reason, 'TOUCH_SET_NOT_EXACT_SELECTOR');
  const c = inputs();
  c.files[0].patch += '\n+extra';
  assert.equal(assessAuthoringApply(c).reason, 'PATCH_NOT_EXACT_ONE_LINE');
  const d = inputs();
  d.headSelector = 'apply authoring/requests/another.json\n';
  assert.equal(assessAuthoringApply(d).reason, 'HEAD_NOT_EXACT_APPLY');
  const e = inputs();
  e.originalSelector = 'apply ' + target + '\n';
  assert.equal(assessAuthoringApply(e).reason, 'MAIN_NOT_READ_ONLY_PREFLIGHT');
});
test('only reviewed original approved Person with real Source and existing Polity', () => {
  const a = inputs();
  a.manifest.review_status = 'HOLD';
  assert.equal(assessAuthoringApply(a).reason, 'MANIFEST_APPROVAL_OR_IDENTITY_NOT_CONFIRMED');
  const b = inputs();
  delete b.manifest.polity.existing_id;
  assert.equal(assessAuthoringApply(b).reason, 'MANIFEST_APPROVAL_OR_IDENTITY_NOT_CONFIRMED');
  const c = inputs();
  c.manifest.sources = [];
  assert.equal(assessAuthoringApply(c).reason, 'MANIFEST_APPROVAL_OR_IDENTITY_NOT_CONFIRMED');
  const d = inputs();
  d.manifest.person.life_status = 'living';
  assert.equal(assessAuthoringApply(d).reason, 'MANIFEST_APPROVAL_OR_IDENTITY_NOT_CONFIRMED');
});
test('protected OIDC immutable artifact must match exact READY one', () => {
  assert.deepEqual(assessProtectedPreflight(preflightInputs()), { ok: true });
  const blocked = preflightInputs();
  blocked.evidence.results[0].status = 'BLOCKED';
  assert.equal(assessProtectedPreflight(blocked).reason, 'OIDC_NOT_EXACT_READY_ONE');
  const wrong = preflightInputs();
  wrong.evidence.results[0].manifest_path = 'authoring/requests/different.json';
  assert.equal(assessProtectedPreflight(wrong).reason, 'OIDC_NOT_EXACT_READY_ONE');
  const committed = preflightInputs();
  committed.evidence.committed = true;
  assert.equal(assessProtectedPreflight(committed).reason, 'OIDC_NOT_EXACT_READY_ONE');
  const unrelatedRun = preflightInputs();
  unrelatedRun.run.head_sha = sha;
  assert.equal(assessProtectedPreflight(unrelatedRun).reason, 'OIDC_PROVENANCE_MISMATCH');
});
