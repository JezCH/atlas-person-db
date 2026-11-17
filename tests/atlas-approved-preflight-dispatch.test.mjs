import test from 'node:test';
import assert from 'node:assert/strict';
import { assessApprovedPreflightHandoff, assessApprovedBatchPreflightHandoff, approvedBatchSelectorPaths, continueApprovedPreflight, hasReviewedBatchRequestIdentity } from '../scripts/atlas-approved-preflight-dispatch.mjs';

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


test('successful ordinary Authoring main push never fetches stale selector or preflight artifact', async () => {
  const calls = [];
  await continueApprovedPreflight({
    event: {action:'completed',repository:{full_name:'JezCH/atlas-person-db'},workflow_run:run},
    api: async (url, options) => { calls.push([url,options]); return {files:[{filename:'authoring/requests/another-reviewed.json'}]}; },
    content: async () => { throw Error('must not read stale selector'); },
    evidenceReader: async () => { throw Error('must not read nonexistent preflight artifact'); }
  });
  assert.equal(calls.length,1);
  assert.match(calls[0][0], /\/commits\/[a-f0-9]{40}$/);
  assert.equal(calls[0][1],undefined);
});

const selectedPath = 'authoring/requests/selected62-remaining30-20261018-davis.json';
const selectedId = 'authoring:selected62-remaining30-20261018:davis:representative:v1';
function legacyBatchCase() {
  const a = batchCase();
  const seed = structuredClone(a.manifests[1]);
  seed.request_id = selectedId;
  seed.person.canonical_name_en = 'Miles Davis';
  seed.polity = { canonical_name_en: 'United States of America', display_name_ko:'미국', polity_type:'historical_polity', historicity:'historical' };
  seed.review_context = { task:'#2545 approved 62, remaining 30 after #2543/#2544/#2546', registration_state:'NEEDS_PREFLIGHT' };
  const reviewed = structuredClone(seed);
  reviewed.polity.canonical_name_en = 'United States';
  reviewed.polity.existing_id = '7d09bc56-1ea0-515e-a3e7-9863361b6f15';
  reviewed.review_context = { source_draft_pr:2549, auto_continue_after_preflight:true, preflight_required:true };
  a.manifests[1] = reviewed;
  a.selector = 'preflight ' + target + '\npreflight ' + selectedPath + '\n';
  a.evidence.results[1] = { status:'READY', request_id:selectedId, manifest_path:selectedPath };
  a.changedPaths[1] = selectedPath;
  a.originalManifests = { [selectedPath]:seed };
  return a;
}

test('legacy selected62 stable ID is accepted only when original approved historical content is preserved', () => {
  const a = legacyBatchCase();
  assert.equal(assessApprovedBatchPreflightHandoff(a).ok, true);
  assert.equal(hasReviewedBatchRequestIdentity(selectedPath,a.manifests[1],a.originalManifests[selectedPath]),true);
  for (const corrupt of [
    b => { delete b.originalManifests[selectedPath]; },
    b => { b.originalManifests[selectedPath].review_status = 'hold'; },
    b => { b.originalManifests[selectedPath].review_context.task = 'unrelated'; },
    b => { b.manifests[1].person.canonical_name_en = 'Other person'; },
    b => { b.manifests[1].review_context.source_draft_pr = 2589; },
    b => { b.manifests[1].sources[0].canonical_url = 'https://example.org/changed'; },
    b => { b.manifests[1].polity.existing_id = '8d09bc56-1ea0-515e-a3e7-9863361b6f15'; },
    b => { b.manifests[1].request_id = 'authoring:selected62-remaining30-20261018:other:representative:v1'; },
    b => { b.manifests[1].activity = {start_year:1999}; }
  ]) {
    const b = legacyBatchCase();
    corrupt(b);
    assert.equal(assessApprovedBatchPreflightHandoff(b).ok,false,String(corrupt));
  }
});

test('mixed modern and legacy reviewed batch dispatches once after immutable original proof', async () => {
  const a = legacyBatchCase(), calls = [], source = [];
  const snapshot = a.manifests.map((m,i)=>({sha:'blob'+i,text:JSON.stringify(m)}));
  await continueApprovedPreflight({
    event:{action:'completed', repository:{full_name:'JezCH/atlas-person-db'},workflow_run:{...a.run,id:123}},
    api:async (url,opts)=> {
      calls.push({url, opts});
      return {files:a.changedPaths.map(filename=>({filename}))};
    },
    content:async (repo,path,ref)=>{
      if (path === '.github/atlas-authoring-preflight.txt') return {sha:'selector',text:a.selector};
      if (path === selectedPath && ref !== 'main' && ref !== a.run.head_sha) {
        source.push(ref);
        return {sha:'original',text:JSON.stringify(a.originalManifests[path])};
      }
      return snapshot[path===target?0:1];
    },
    evidenceReader:async ()=>a.evidence
  });
  assert.equal(source.length,1);
  assert.match(source[0],/^[a-f0-9]{40}$/);
  const writes=calls.filter(c=>c.opts?.method==='POST');
  assert.equal(writes.length,1);
  assert.deepEqual(JSON.parse(writes[0].opts.json.inputs.manifests_json),[target,selectedPath]);
  assert.equal(writes[0].opts.json.inputs.approved_sha,a.run.head_sha);
});
