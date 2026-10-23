import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {independentlyVerify,eventGate,resultMarker,resultComment,recordOutcome}
  from '../scripts/atlas-autonomous-result-verifier.mjs';
const SHA='a'.repeat(40),HEAD='b'.repeat(40),REPO='JezCH/atlas-person-db';
const files=['scripts/example.mjs','tests/example.test.mjs'];
const before=['export const x = 1;\n',"import test from 'node:test'; test('one',()=>{});\n"];
const after=['export const x = 2;\n',"import test from 'node:test'; test('two',()=>{});\n"];
const task={id:'atlas-demo-patch',status:'approved',launcher_pr:77,launcher_sha:SHA,
  issue_number:44,paths:files,priority:1,not_before:'2026-10-22T00:00:00Z',
  expires_at:'2026-10-23T00:00:00Z',instructions:'Authorized test only',
  snapshot_paths:[...files,'AGENTS.md','WORK_EXECUTION.md']};
const registry={version:1,enabled:false,max_commands_per_utc_day:1,tasks:[task]};
const plan={version:1,task_id:task.id,base_sha:SHA,
  files:files.map((p,i)=>({path:p,
    before_sha256:crypto.createHash('sha256').update(before[i]).digest('hex'),
    after_base64:Buffer.from(after[i]).toString('base64')}))};
const payload='ATLAS-CODEX-PATCH-V1\n'+JSON.stringify(plan)+'\nEND-ATLAS-CODEX-PATCH-V1';
const comment={id:929,user:{id:199175422,login:'chatgpt-codex-connector[bot]',type:'Bot'},
  issue_url:'https://api.github.com/repos/'+REPO+'/issues/77',created_at:'2026-10-22T12:00:00Z',body:payload};
const pr={number:121,state:'open',draft:true,
  body:'Codex task atlas-demo-patch; command receipt refs/heads/codex/task-attempt/atlas-demo-patch; source App comment 929. Exact original-event patch verified;',
  base:{ref:'main',repo:{full_name:REPO}},
  head:{ref:'codex/task-result/atlas-demo-patch',sha:HEAD,repo:{full_name:REPO}}};
const run={id:2121,name:'ATLAS Integrity',event:'pull_request',status:'completed',
  conclusion:'success',head_sha:HEAD,run_attempt:1,pull_requests:[{number:121}]};
const event={action:'completed',repository:{full_name:REPO},workflow_run:run};
function blob(string){
  const bytes=Buffer.from(string);
  return {type:'file',encoding:'base64',content:bytes.toString('base64'),
    sha:crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex')};
}
function snapshot(options={}){
  const calls=[];
  const github=async ep=>{
    calls.push(ep);
    if(ep==='actions/runs/2121')return {...run,...options.run};
    if(ep==='pulls/121')return {...pr,...options.pr};
    if(ep==='issues/comments/929')return {...comment,...options.comment};
    if(ep==='pulls/121/files?per_page=100')return options.files??files.map(filename=>({filename,status:'modified'}));
    if(ep==='git/ref/heads/codex/task-attempt/'+task.id)return {object:{sha:SHA}};
    if(ep==='git/ref/heads/codex/daily-attempt/2026-10-22')return {object:{sha:SHA}};
    if(ep==='git/ref/heads/codex/daily-attempt/2026-10-21')return null;
    for(let i=0;i<files.length;i++){
      if(ep==='contents/'+files[i]+'?ref='+SHA)return blob(before[i]);
      if(ep==='contents/'+files[i]+'?ref='+HEAD)return blob(options.after?.[i]??after[i]);
    }
    throw Error('unknown endpoint '+ep);
  };
  return {github,calls};
}
test('original bot payload and exact binary file blobs plus CI produce review-only state',async()=>{
  const f=snapshot(),r=await independentlyVerify({event,github:f.github,registry});
  assert.equal(r.status,'CI_PASS_REVIEW_REQUIRED');assert.equal(r.verified_provenance,true);
  assert.equal(r.next_action,'INDEPENDENT_REVIEW_REQUIRED_BEFORE_MERGE');
  assert.equal(r.production_verified,false);
  assert.ok(f.calls.some(x=>x.includes('issues/comments/929')));
  assert.ok(f.calls.filter(x=>x.startsWith('contents/')).length===4);
});
test('failed CI is recorded as stopped without another model call',async()=>{
  const r=await independentlyVerify({event,github:snapshot({run:{conclusion:'failure'}}).github,registry});
  assert.equal(r.status,'CI_FAILED');assert.equal(r.next_action,'STOP_NO_AUTOMATIC_MODEL_RETRY');
  assert.equal(r.model_calls,0);
});
test('impersonation, extra diff, mismatched source and modified blob all fail closed',async()=>{
  for(const options of [
    {comment:{user:{...comment.user,id:44}}},
    {comment:{body:'fake'}},
    {comment:{issue_url:'https://example.test/forged'}},
    {files:[...files.map(filename=>({filename,status:'modified'})),{filename:'db/migrations/new.sql',status:'added'}]},
    {after:[after[0]+'injected',after[1]]},
    {pr:{head:{...pr.head,sha:SHA}}}
  ]){
    await assert.rejects(()=>independentlyVerify({event,registry,github:snapshot(options).github}),
      /ATLAS_RESULT_BLOCKED|ATLAS_PATCH_REJECTED/);
  }
});
test('foreign or non-Codex workflow events do not gain authority',async()=>{
  assert.equal(eventGate({...event,action:'requested'},run),false);
  assert.equal(eventGate(event,{...run,pull_requests:[]}),false);
  const f=snapshot();
  const r=await independentlyVerify({event:{...event,repository:{full_name:'other/repo'}},
    github:f.github,registry});
  assert.equal(r.status,'NOT_APPLICABLE');assert.equal(f.calls.length,0);
});
test('idempotent review journal never posts duplicate CI result and cannot claim release',async()=>{
  const r=await independentlyVerify({event,github:snapshot().github,registry});
  let posts=0;
  const post=async()=>{posts++};
  const fresh=await recordOutcome({result:r,github:async()=>[],post});
  assert.equal(fresh.status,'RECORDED');assert.equal(posts,1);
  const again=await recordOutcome({result:r,github:async()=>[{body:resultComment(r)}],post});
  assert.equal(again.status,'ALREADY_RECORDED');assert.equal(posts,1);
  assert.match(resultMarker(r),/ATLAS-AUTONOMOUS-RESULT-V1/);
  assert.match(resultComment(r),/not a semantic acceptance|not a semantic/);
  assert.equal((await recordOutcome({result:{status:'CI_PASS_REVIEW_REQUIRED'},github:async()=>[],post})).status,'NO_RECORD');
});
