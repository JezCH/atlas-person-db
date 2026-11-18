import test from 'node:test';
import assert from 'node:assert/strict';
import { assessApprovedPreflightHandoff, assessApprovedBatchPreflightHandoff, approvedBatchSelectorPaths, continueApprovedPreflight, assessApprovedBatchIntake, checkChangedBatchIntake } from '../scripts/atlas-approved-preflight-dispatch.mjs';

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

test('approved legacy selected62 IDs preserve exact immutable batch identities (#2545/#2685)', () => {
  const a = batchCase();
  for (const [slug, name] of [['ellington','Duke Ellington'], ['davis','Miles Davis'], ['welles','Orson Welles']]) {
    const legacy = structuredClone(a.manifests[0]);
    const path = 'authoring/requests/selected62-remaining30-20261018-' + slug + '.json';
    legacy.request_id = 'authoring:selected62-remaining30-20261018:' + slug + ':representative:v1';
    legacy.person.canonical_name_en = name;
    legacy.review_context.source_draft_pr = 2549;
    a.manifests.push(legacy);
    a.selector += 'preflight ' + path + '\n';
    a.changedPaths.push(path);
    a.evidence.results.push({status:'READY', request_id:legacy.request_id, manifest_path:path});
  }
  a.evidence.count = a.evidence.ready_count = 5;
  assert.equal(assessApprovedBatchPreflightHandoff(a).ok, true);
  for (const mutate of [
    b => { b.manifests[2].person.canonical_name_en = 'Henri Matisse'; },
    b => { b.manifests[2].review_context.source_draft_pr = 2589; },
    b => { b.manifests[2].review_context.auto_continue_after_preflight = false; },
    b => { b.manifests[2].review_status = 'hold'; },
    b => { b.manifests[2].request_id = b.manifests[2].request_id.replace('ellington','matisse'); b.evidence.results[2].request_id = b.manifests[2].request_id; },
    b => { const before = b.evidence.results[2].manifest_path; const after = before.replace('ellington','other'); b.selector = b.selector.replace(before,after); b.changedPaths = b.changedPaths.map(p => p === before ? after : p); b.evidence.results[2].manifest_path = after; },
  ]) {
    const b = structuredClone(a);
    mutate(b);
    assert.equal(assessApprovedBatchPreflightHandoff(b).ok, false, String(mutate));
  }
});


test('PR intake uses the same static predicate as protected batch handoff, without fake OIDC evidence', () => {
  const a = batchCase();
  const intake = assessApprovedBatchIntake(a);
  assert.equal(intake.ok,true);
  assert.deepEqual(intake.requests.map(r=>r.requestId),a.manifests.map(m=>m.request_id));
  assert.deepEqual(assessApprovedBatchPreflightHandoff({...a,evidence:null}),{ok:false, reason:'BATCH_OIDC_NOT_ALL_READY'});
  const b=structuredClone(a);
  b.manifests[1].request_id='authoring:unreviewed:other:v1';
  assert.equal(assessApprovedBatchIntake(b).ok,false);
  const c=structuredClone(a);
  c.changedPaths[2]=c.changedPaths[0];
  assert.equal(assessApprovedBatchIntake(c).reason,'BATCH_TOUCH_SET_MISMATCH');
});

test('actual changed selector delta blocks non-human schema, unknown ID and mixed opt-in before OIDC', () => {
  const baseSha='a'.repeat(40),headSha='b'.repeat(40);
  const check=(a,changedPaths=a.changedPaths)=>{
    const calls=[];
    const result=checkChangedBatchIntake({baseSha,headSha,git:(args)=>{
      calls.push(args);
      if(args[0]==='diff') return changedPaths.join('\0')+'\0';
      assert.equal(args[0],'show');
      assert.ok(args[1].startsWith(headSha+':'));
      const path=args[1].slice(headSha.length+1);
      if(path==='.github/atlas-authoring-preflight.txt')return a.selector;
      const paths=approvedBatchSelectorPaths(a.selector);
      return JSON.stringify(a.manifests[paths.indexOf(path)]);
    }});
    return {result,calls};
  };
  const a=batchCase();
  assert.deepEqual(check(a).result,{ok:true,disposition:'STATIC_HANDOFF_ELIGIBLE_ONLY',count:2});
  assert.equal(check(a,['README.md']).calls.length,1);
  assert.equal(check(a,['README.md']).result.disposition,'UNCHANGED_SELECTOR');
  const mixedSchema=structuredClone(a); mixedSchema.manifests[1].schema='atlas-authoring-manifest/v2';
  assert.equal(check(mixedSchema).result.reason,'READ_ONLY_BATCH_REQUIRES_APPROVED_HUMAN_SCHEMA');
  const legacy=structuredClone(a);legacy.manifests[1].request_id='authoring:selected62-remaining30-20261018:unknown:representative:v1';
  assert.equal(check(legacy).result.reason,'BATCH_MANIFEST_NOT_INDIVIDUALLY_APPROVED');
  const mixedOpt=structuredClone(a);mixedOpt.manifests[1].review_context.auto_continue_after_preflight=false;
  assert.equal(check(mixedOpt).result.reason,'BATCH_MANIFEST_NOT_INDIVIDUALLY_APPROVED');
  mixedOpt.manifests[0].review_context.auto_continue_after_preflight=false;
  assert.deepEqual(check(mixedOpt).result,{ok:true,disposition:'READ_ONLY_NO_AUTO_CONTINUATION',count:2});
  const malformed=structuredClone(a);malformed.selector=malformed.selector.replace('preflight ','apply ');
  assert.equal(check(malformed).result.reason,'INVALID_EXACT_BATCH_SELECTOR');
  assert.equal(check(a,[...a.changedPaths,'server/unrelated.js']).result.reason,'BATCH_TOUCH_SET_MISMATCH');
});
