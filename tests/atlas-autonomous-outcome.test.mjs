import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {evaluateOutcome,planOutcome,inspectRun,recordOutcome} from '../scripts/atlas-autonomous-outcome.mjs';
const SHA='a'.repeat(40),HEAD='b'.repeat(40);
const TASK='atlas-fixture-unit', PR=88, RUN=123456, COMMENT=431;
const paths=['scripts/example.mjs','tests/example.test.mjs'];
const files=['export const value=2;\n',"import '../scripts/example.mjs';\n"];
const originals=['export const value=1;\n',"import '../scripts/example.mjs';\n//old\n"];
const digest=s=>crypto.createHash('sha256').update(s).digest('hex');
const payload={version:1,task_id:TASK,base_sha:SHA,
  files:paths.map((p,i)=>({path:p,before_sha256:digest(originals[i]),
    after_base64:Buffer.from(files[i]).toString('base64')}))};
const task={id:TASK,status:'approved',issue_number:42,priority:1,launcher_pr:70,
  launcher_sha:SHA,paths,snapshot_paths:[...paths,'AGENTS.md','WORK_EXECUTION.md'],
  not_before:'2026-10-23T00:00:00Z',expires_at:'2026-10-23T23:00:00Z',
  instructions:'one bug'};
const registry={version:1,enabled:false,max_commands_per_utc_day:1,tasks:[task]};
const branch='codex/task-result/'+TASK;
const run={id:RUN,name:'ATLAS Integrity',event:'pull_request',status:'completed',
  conclusion:'success',head_branch:branch,head_sha:HEAD,
  head_repository:{full_name:'JezCH/atlas-person-db'},pull_requests:[{number:PR}],
  html_url:'https://github.com/JezCH/atlas-person-db/actions/runs/'+RUN};
const pr={number:PR,state:'open',draft:true,merged_at:null,
  body:'Codex task '+TASK+'; command receipt refs/heads/codex/task-attempt/'+TASK+
    '; source App comment '+COMMENT+'. Exact original-event patch verified; focused test PASS. Full CI/review required. No automatic merge. Production NOT LIVE.',
  base:{ref:'main',repo:{full_name:'JezCH/atlas-person-db'}},
  head:{ref:branch,sha:HEAD,repo:{full_name:'JezCH/atlas-person-db'}}};
const comment={id:COMMENT,user:{id:199175422,login:'chatgpt-codex-connector[bot]'},
  body:'ATLAS-CODEX-PATCH-V1\n'+JSON.stringify(payload)+'\nEND-ATLAS-CODEX-PATCH-V1'};
const encoded=s=>({encoding:'base64',size:Buffer.byteLength(s),
  content:Buffer.from(s).toString('base64')});
function fixture(changes={}){
 const calls=[];
 const map={
  ['actions/runs/'+RUN]:run,['pulls/'+PR]:pr,
  ['git/ref/heads/'+branch]:{object:{sha:HEAD}},
  ['git/ref/heads/codex/task-attempt/'+TASK]:{object:{sha:SHA}},
  ['commits/'+HEAD]:{sha:HEAD,parents:[{sha:SHA}]},
  ['pulls/'+PR+'/files?per_page=100']:paths.map(filename=>({filename,status:'modified'})),
  ['issues/70/comments?per_page=100']:[comment],
  ...Object.fromEntries(paths.flatMap((p,i)=>[
    ['contents/'+p+'?ref='+SHA,encoded(originals[i])],
    ['contents/'+p+'?ref='+HEAD,encoded(files[i])]]))
 };
 Object.assign(map,changes);
 const github=async end=>{calls.push(end);assert.ok(Object.hasOwn(map,end),'unexpected '+end);
   return structuredClone(map[end])};
 return {github,calls};
}
test('trusts only final successful Integrity run from correct repository',()=>{
 assert.equal(planOutcome(run,registry).status,'VERIFY_PROVENANCE');
 assert.equal(planOutcome({...run,conclusion:'failure'},registry).status,'CI_NOT_PASSED');
 assert.equal(planOutcome({...run,name:'Some other check'},registry).status,'IGNORED');
 assert.equal(planOutcome({...run,head_repository:{full_name:'attacker/fork'}},registry).status,'IGNORED');
 assert.equal(planOutcome({...run,head_branch:'fix/other'},registry).status,'IGNORED');
});
test('checks actual bot patch bytes, base receipt, exact child and PR paths; never self-approves',async()=>{
 const f=fixture();
 const out=await evaluateOutcome({run,registry,github:f.github});
 assert.equal(out.status,'CI_PASS_REVIEW_REQUIRED');
 assert.equal(out.pr_number,PR);assert.equal(out.model_calls,0);
 assert.match(out.next_action,/REVIEW_DRAFT/);
 assert.ok(f.calls.includes('issues/70/comments?per_page=100'));
 assert.equal(f.calls.filter(x=>x.startsWith('contents/')).length,4);
});
test('bad comment bot identity, files, original receipt and changed PR SHA all fail closed',async()=>{
 const cases=[
  {'issues/70/comments?per_page=100':[{...comment,user:{id:7,login:'attacker'}}]},
  {['pulls/'+PR+'/files?per_page=100']:[{filename:paths[0],status:'modified'}]},
  {['commits/'+HEAD]:{sha:HEAD,parents:[{sha:'c'.repeat(40)}]}},
  {['pulls/'+PR]:{...pr,head:{...pr.head,sha:'d'.repeat(40)}}},
  {['contents/'+paths[0]+'?ref='+SHA]:encoded('unexpected replacement')},
  {['contents/'+paths[0]+'?ref='+HEAD]:encoded('untrusted code')},
 ];
 for(const changes of cases){
   const {github}=fixture(changes);
   await assert.rejects(()=>evaluateOutcome({run,registry,github}),
     /ATLAS_AUTONOMOUS_OUTCOME_BLOCKED/);
 }
});
test('CI failure and unrelated jobs need no further Github reads or model retry',async()=>{
 let reads=0;
 const github=async()=>{reads++;throw Error('must not inspect')};
 const failed=await evaluateOutcome({run:{...run,conclusion:'failure'},registry,github});
 assert.equal(failed.status,'CI_NOT_PASSED');assert.equal(reads,0);
 const other=await evaluateOutcome({run:{...run,head_branch:'docs/README'},registry,github});
 assert.equal(other.status,'IGNORED');assert.equal(reads,0);
});
test('read-only CI result makes one immutable local artifact and will not overwrite',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'atlas-outcome-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const {github}=fixture();
 const result=await inspectRun({runId:RUN,registry,github});
 const file=path.join(dir,'result.json');
 recordOutcome(file,result);
 assert.equal(JSON.parse(fs.readFileSync(file)).status,'CI_PASS_REVIEW_REQUIRED');
 assert.throws(()=>recordOutcome(file,result),/EEXIST/);
});
test('missing/ambiguous linked PR is rejected, without searching by title',async()=>{
 const noLink={...run,pull_requests:[]};
 const {github}=fixture({
  ['pulls?state=open&head=JezCH:'+encodeURIComponent(branch)+'&per_page=30']:[]
 });
 await assert.rejects(()=>evaluateOutcome({run:noLink,registry,github}),/ambiguous/);
});
