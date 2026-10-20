import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateRegistry,selectTask,policyForEvent,claimDispatch,taskRef,budgetRef} from '../scripts/atlas-codex-task-policy.mjs';
import {verifyPlanFromEvent} from '../scripts/atlas-codex-patch-relay.mjs';

const now=Date.parse('2030-01-02T12:00:00Z');
const base='a'.repeat(40);
function task(id='atlas-one',priority=0) {return {id,status:'approved',priority,launcher_pr:101+priority,launcher_sha:base,paths:['scripts/example.mjs','tests/example.test.mjs'],snapshot_paths:['scripts/example.mjs','tests/example.test.mjs','AGENTS.md','WORK_EXECUTION.md'],not_before:'2030-01-02T00:00:00Z',expires_at:'2030-01-03T00:00:00Z',instructions:'Fix one reviewed offline defect.'};}
function registry(tasks=[task()]) {return {version:1,enabled:true,max_commands_per_utc_day:1,tasks};}
function proposal(t) {return {version:1,task_id:t.id,base_sha:base,files:t.paths.map(p=>({path:p,before_sha256:'b'.repeat(64),after_base64:Buffer.from('// tested replacement\n').toString('base64')}))};}
function event(t) {return {action:'created',repository:{full_name:'JezCH/atlas-person-db'},issue:{number:t.launcher_pr,pull_request:{}},comment:{id:123,user:{login:'chatgpt-codex-connector[bot]',type:'Bot',id:199175422},created_at:new Date(now-1000).toISOString(),body:'ATLAS-CODEX-PATCH-V1\n'+JSON.stringify(proposal(t))+'\nEND-ATLAS-CODEX-PATCH-V1'}};}

test('disabled, completed, attempted, expired, conflicted or budget-exhausted work is never selected',()=>{
  const r=registry();r.enabled=false;assert.equal(selectTask(r,{now}).task,null);
  r.enabled=true;
  for(const extra of [{attempted:['atlas-one']},{budgetUsed:true},{openPaths:['scripts/example.mjs']},{now:now+86400001}]) {
    assert.equal(selectTask(r,{now,...extra}).task,null);
  }
  r.tasks[0].status='closed';assert.equal(selectTask(r,{now}).task,null);
  const actual=JSON.parse(fs.readFileSync(new URL('../config/atlas-codex-tasks.v1.json',import.meta.url)));
  assert.doesNotThrow(()=>validateRegistry(actual));
});
test('selection is deterministic and skips only the concrete overlapping task',()=>{
  const a=task('atlas-one',1), b=task('atlas-two',2);
  b.paths=['scripts/other.mjs','tests/other.test.mjs'];b.snapshot_paths=[...b.paths,'AGENTS.md','WORK_EXECUTION.md'];
  assert.equal(selectTask(registry([b,a]),{now}).task.id,a.id);
  assert.equal(selectTask(registry([b,a]),{now,openPaths:[a.paths[1]]}).task.id,b.id);
  assert.equal(selectTask(registry([b,a]),{now,requestedId:b.id}).task.id,b.id);
});
test('task and daily ref creation prevents duplicate calls under competing dispatchers',()=>{
  const refs=new Map();const create=(ref,sha)=>{if(refs.has(ref))throw Error('already exists');refs.set(ref,sha);};
  claimDispatch(create,task(),base,now);
  assert.throws(()=>claimDispatch(create,task(),base,now),/already exists/);
  assert.throws(()=>claimDispatch(create,task('atlas-two',2),base,now),/already exists/);
  assert.equal(refs.get(budgetRef(now)),base);
  assert.equal(refs.get(taskRef('atlas-two')),base); // failure remains consumed
  assert.throws(()=>claimDispatch(create,task(),base,now+86400000),/already exists/); // next day is not a task retry
});
test('uncertain budget reservation is never rolled back or retried',()=>{
  const calls=[];const create=(ref)=>{calls.push(ref);if(ref.includes('daily-attempt'))throw Error('network uncertainty');};
  assert.throws(()=>claimDispatch(create,task(),base,now),/uncertainty/);
  assert.deepEqual(calls,[taskRef('atlas-one'),budgetRef(now)]);
});
test('original bot, approved task, launcher, time and exact paths bind each patch',()=>{
  const t=task(),r=registry([t]),e=event(t);
  assert.equal(policyForEvent(r,e,now).task.id,t.id);
  for(const mutate of [e=>e.issue.number++,e=>e.comment.user.id++,e=>e.comment.created_at='bad',e=>e.comment.created_at=new Date(now-1800001).toISOString()]) {
    const bad=structuredClone(e);mutate(bad);assert.throws(()=>policyForEvent(r,bad,now));
  }
  const p=proposal(t);p.files[0].path='scripts/unapproved.mjs';
  const bad=event(t);bad.comment.body='ATLAS-CODEX-PATCH-V1\n'+JSON.stringify(p)+'\nEND-ATLAS-CODEX-PATCH-V1';
  assert.throws(()=>policyForEvent(r,bad,now),/outside approved task paths/);
  const changed=proposal(t);changed.files[0].after_base64=Buffer.from('// substituted\n').toString('base64');
  assert.throws(()=>verifyPlanFromEvent(e,changed,t),/artifact differs/);
  r.enabled=false;assert.throws(()=>policyForEvent(r,e,now),/disabled/);
});
test('registry rejects duplicate identities, broad mutation paths and unsafe invocation budgets',()=>{
  for(const mutate of [r=>r.tasks.push({...r.tasks[0]}),r=>r.max_commands_per_utc_day=2,r=>r.tasks[0].paths[0]='scripts/apply-data.mjs',r=>r.tasks[0].paths[0]='scripts/atlas-codex-task-runner.mjs',r=>r.tasks[0].snapshot_paths.push('../secrets'),r=>r.tasks[0].expires_at='2031-01-01T00:00:00Z']) {
    const r=registry();mutate(r);assert.throws(()=>validateRegistry(r));
  }
});
