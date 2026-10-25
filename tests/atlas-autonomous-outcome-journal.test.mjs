import test from 'node:test';
import assert from 'node:assert/strict';
import {journalMarker,journalBody,postJournal,githubWrite,classifyJournalFailure,journalFailureArtifact,requireJournalWriter} from '../scripts/atlas-autonomous-outcome-journal.mjs';

const SHA='a'.repeat(40);
const report={status:'CI_PASS_REVIEW_REQUIRED',task_id:'atlas-fixture-unit',
  pr_number:88,pr_head_sha:SHA,ci_run_id:123456,
  task_attempt_base_sha:'b'.repeat(40),source_comment_id:431};
test('only verified independent CI result has bounded, unambiguous journal marker',()=>{
  assert.match(journalMarker(report),/ATLAS-AUTONOMOUS-OUTCOME-V1:88:123456/);
  assert.match(journalBody(report),/REVIEW_DRAFT_NO_MODEL_RETRY/);
  assert.match(journalBody(report),/not.*self-approval/);
  for(const edit of [
    {status:'CI_NOT_PASSED'},{pr_head_sha:'invalid'},{task_id:'unsafe\ncommand'},
    {pr_number:0},{ci_run_id:0}
  ])assert.throws(()=>journalMarker({...report,...edit}),/ATLAS_OUTCOME_JOURNAL_BLOCKED/);
});
test('writes one safe result comment only to current matching Draft PR',async()=>{
  const calls=[],github=async ep=>{
    calls.push(ep);
    if(ep==='issues/88/comments?per_page=100')return [];
    if(ep==='pulls/88')return {state:'open',draft:true,head:{sha:SHA}};
    throw Error(ep);
  };
  const written=[];
  const post=async(ep,body)=>written.push({ep,body});
  const r=await postJournal({outcome:report,github,post});
  assert.equal(r.status,'RECORDED');assert.equal(written.length,1);
  assert.equal(written[0].ep,'issues/88/comments');
  assert.match(written[0].body.body,/CI_PASS_REVIEW_REQUIRED/);
  assert.deepEqual(calls,['issues/88/comments?per_page=100','pulls/88']);
});
test('duplicate, incomplete history and changed PR SHA never publish',async()=>{
  let writes=0;
  const post=async()=>{writes++};
  const exists=await postJournal({outcome:report,
    github:async()=>[{body:journalBody(report),user:{id:281085255,login:'JezCH',type:'User'}}],post});
  assert.equal(exists.status,'ALREADY_RECORDED');
  for(const github of [
    async()=>Array.from({length:100},()=>({body:''})),
    async ep=>ep.startsWith('issues/')?[]:{state:'open',draft:true,head:{sha:'c'.repeat(40)}},
    async ep=>ep.startsWith('issues/')?[]:{state:'closed',draft:false,head:{sha:SHA}}
  ])await assert.rejects(()=>postJournal({outcome:report,github,post}),/ATLAS_OUTCOME_JOURNAL_BLOCKED/);
  assert.equal(writes,0);
});
test('failed or irrelevant CI reports are never credentialed writes',async()=>{
  let api=0;
  const adapter=async()=>{api++;throw Error('should not use API')};
  for(const status of ['CI_NOT_PASSED','BLOCKED','IGNORED']){
    assert.equal((await postJournal({outcome:{...report,status},github:adapter,post:adapter})).status,'NOT_RECORDABLE');
  }
  assert.equal(api,0);
});

test('journal POST uses its own bounded writer token, accepts only 201, never retries denied writes',async()=>{
  const requests=[];
  const post=async(url,options)=>{requests.push({url,options});return {status:201}};
  await githubWrite('issues/88/comments',{body:journalBody(report)},'fixture-writer',post);
  assert.equal(requests.length,1);
  assert.equal(requests[0].options.method,'POST');
  assert.equal(requests[0].options.headers.Authorization,'Bearer fixture-writer');
  assert.equal(requests[0].url,'https://api.github.com/repos/JezCH/atlas-person-db/issues/88/comments');
  let denied=0;
  await assert.rejects(()=>githubWrite('issues/88/comments',{body:journalBody(report)},'fixture-writer',
    async()=>{denied++;return {status:403};}),/GitHub journal POST HTTP 403/);
  assert.equal(denied,1,'no hidden retry after denied write');
  await assert.rejects(()=>githubWrite('issues/88/comments',{body:'test'},'',post),/token missing/);
  assert.equal(requests.length,1);
});

test('P1 diagnoses the real GitHub 403 without authorizing any retry',async()=>{
  let attempts=0,fail;
  try{
    await githubWrite('issues/88/comments',{body:journalBody(report)},'fixture-writer',
      async()=>{attempts++;return {status:403}});
  }catch(e){fail=e}
  assert.equal(attempts,1,'HTTP 403 must never be retried');
  const evidence=journalFailureArtifact(fail,40107543662);
  assert.equal(evidence.status,'JOURNAL_BLOCKED');
  assert.equal(evidence.failure_code,'JOURNAL_WRITER_PERMISSION_DENIED');
  assert.equal(evidence.http_status,403);
  assert.equal(evidence.automatic_journal_retry,false);
  assert.equal(evidence.automatic_model_retry,false);
  assert.equal(evidence.model_calls,0);
  assert.equal(evidence.production_verified,false);
  assert.equal(evidence.ci_run_id,40107543662);
});
test('P1 distinguishes missing writer, ambiguous status and transport uncertainty',async()=>{
  const body={body:journalBody(report)};
  for(const [http,expected] of [
    [401,'JOURNAL_WRITER_PERMISSION_DENIED'],
    [409,'JOURNAL_WRITE_STATE_AMBIGUOUS'],
    [422,'JOURNAL_WRITE_STATE_AMBIGUOUS'],
    [429,'JOURNAL_REMOTE_UNAVAILABLE'],
    [503,'JOURNAL_REMOTE_UNAVAILABLE']
  ]){
    await assert.rejects(async()=>{
      try{await githubWrite('issues/88/comments',body,'fixture',async()=>({status:http}))}
      catch(e){
        const d=classifyJournalFailure(e);
        assert.equal(d.failure_code,expected);
        assert.equal(d.automatic_journal_retry,false);
        throw e;
      }
    },/GitHub journal POST HTTP/);
  }
  const e=await githubWrite('issues/88/comments',body,'fixture',async()=>{throw Error('network')})
    .then(()=>null,x=>x);
  assert.equal(classifyJournalFailure(e).failure_code,'JOURNAL_REMOTE_UNAVAILABLE');
  const noToken=await githubWrite('issues/88/comments',body,'',async()=>({status:201}))
    .then(()=>null,x=>x);
  assert.equal(classifyJournalFailure(noToken).failure_code,'JOURNAL_WRITE_TOKEN_MISSING');
  assert.equal(classifyJournalFailure(Error('stale original Codex proof')).failure_code,
    'JOURNAL_PRECONDITION_BLOCKED');
  assert.throws(()=>journalFailureArtifact(e,0),/invalid failed journal run/);
});
test('P1 privileged POST adapter refuses unrelated targets or unsigned bodies',async()=>{
  let attempts=0;
  for(const [endpoint,body] of [
    ['issues/88/comments',{body:'unmarked'}],
    ['actions/workflows/atlas-codex-tasks.yml/dispatches',{body:journalBody(report)}],
    ['issues/88/labels',{body:journalBody(report)}]
  ]){
    await assert.rejects(()=>githubWrite(endpoint,body,'fixture',
      async()=>{attempts++;return {status:201}}),/unexpected write endpoint/);
  }
  assert.equal(attempts,0);
});

test('P1 CLI preflight reports the real missing PAT category before any POST',()=>{
  for(const candidate of [undefined,null,'','   ',0]){
    let error;
    try{requireJournalWriter(candidate)}catch(e){error=e}
    assert.ok(error,'invalid writer must stop before GitHub');
    const evidence=classifyJournalFailure(error);
    assert.equal(evidence.failure_code,'JOURNAL_WRITE_TOKEN_MISSING');
    assert.equal(evidence.recovery,'CONFIGURE_REVIEWED_JOURNAL_WRITER_THEN_REVERIFY_ORIGINAL_CI');
    assert.equal(evidence.automatic_journal_retry,false);
    assert.equal(evidence.automatic_model_retry,false);
  }
  assert.equal(requireJournalWriter('fixture-secret'),'fixture-secret');
});

test('an unrelated user cannot spoof an existing verified checkpoint marker',async()=>{
  let posts=0;
  const post=async()=>{posts++};
  const valid={body:journalBody(report),user:{id:281085255,login:'JezCH',type:'User'}};
  for(const history of [
    [{...valid,user:{id:99,login:'attacker',type:'User'}}],
    [{...valid,body:valid.body+'\\nmodified'}],
    [valid,valid],
    [{...valid,user:{id:281085255,login:'JezCH',type:'Bot'}}]
  ]){
    await assert.rejects(()=>postJournal({outcome:report,
      github:async()=>history,post}),/untrusted, modified or duplicate outcome marker/);
  }
  assert.equal(posts,0);
});

test('P1 resolves uncertain successful GitHub POST using exactly one read, never a second write',async()=>{
  const canonical={body:journalBody(report),user:{id:281085255,login:'JezCH',type:'User'}};
  const calls=[],github=async ep=>{
    calls.push(ep);
    if(ep==='pulls/88')return {state:'open',draft:true,head:{sha:SHA}};
    if(ep==='issues/88/comments?per_page=100')return calls.length===1?[]:[canonical];
    throw Error(ep);
  };
  let attempts=0;
  const post=async()=>{attempts++;const e=Error('ambiguous timeout');e.journalErrorType='TRANSPORT';throw e};
  const result=await postJournal({outcome:report,github,post});
  assert.equal(result.status,'CONFIRMED_AFTER_AMBIGUOUS_POST');
  assert.equal(result.journal_retried,false);
  assert.equal(attempts,1);
  assert.deepEqual(calls,['issues/88/comments?per_page=100','pulls/88',
    'issues/88/comments?per_page=100']);
});

test('P1 uncertain write with no authentic read-back stays blocked without replay',async()=>{
  for(const postError of [
    Object.assign(Error('transport'),{journalErrorType:'TRANSPORT'}),
    Object.assign(Error('429'),{journalHttpStatus:429,journalErrorType:'HTTP'}),
    Object.assign(Error('409'),{journalHttpStatus:409,journalErrorType:'HTTP'})
  ]){
    let posts=0,reads=0;
    const github=async ep=>{
      if(ep==='pulls/88')return {state:'open',draft:true,head:{sha:SHA}};
      reads++;
      return [];
    };
    await assert.rejects(()=>postJournal({outcome:report,github,
      post:async()=>{posts++;throw postError}}),x=>x===postError);
    assert.equal(posts,1);assert.equal(reads,2);
  }
  let checks=0,posts=0;
  const denied=Object.assign(Error('403'),{journalHttpStatus:403,journalErrorType:'HTTP'});
  await assert.rejects(()=>postJournal({outcome:report,
    github:async ep=>{
      checks++;return ep.startsWith('issues/')?[]:{state:'open',draft:true,head:{sha:SHA}}},
    post:async()=>{posts++;throw denied}}),x=>x===denied);
  assert.equal(checks,2,'403 permission errors do not trigger a speculative readback');
  assert.equal(posts,1);
});
