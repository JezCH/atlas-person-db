import test from 'node:test';
import assert from 'node:assert/strict';
import {journalMarker,journalBody,postJournal,githubWrite} from '../scripts/atlas-autonomous-outcome-journal.mjs';

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
    github:async()=>[{body:journalBody(report)}],post});
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
  await assert.rejects(()=>githubWrite('issues/88/comments',{body:'test'},'fixture-writer',
    async()=>{denied++;return {status:403};}),/GitHub journal POST HTTP 403/);
  assert.equal(denied,1,'no hidden retry after denied write');
  await assert.rejects(()=>githubWrite('issues/88/comments',{body:'test'},'',post),/token missing/);
  assert.equal(requests.length,1);
});
