import test from 'node:test';
import assert from 'node:assert/strict';
import {triage} from '../scripts/atlas-work-manager-triage.mjs';

const now=Date.parse('2030-04-10T10:10:00Z'),sha='a'.repeat(40);
const task={id:'atlas-test-result',status:'closed',priority:1,launcher_pr:101,launcher_sha:sha,
  paths:['scripts/example.mjs','tests/example.test.mjs'],
  snapshot_paths:['scripts/example.mjs','tests/example.test.mjs','AGENTS.md','WORK_EXECUTION.md'],
  not_before:'2030-04-09T00:00:00Z',expires_at:'2030-04-10T00:00:00Z',instructions:'Review only.'};
const registry=()=>({version:1,enabled:false,max_commands_per_utc_day:1,tasks:[structuredClone(task)]});
function snapshot(){return {version:1,repository:'JezCH/atlas-person-db',main_sha:sha,
  observed_at:'2030-04-10T10:09:00Z',registry:registry(),pulls:[
    {number:121,draft:true,head_ref:'codex/task-result/atlas-test-result',head_sha:sha,
      base_branch:'main',changed_paths:[...task.paths],integrity_conclusion:'success',
      integrity_run_url:'https://github.com/JezCH/atlas-person-db/actions/runs/1234'},
    {number:122,draft:true,head_ref:'feature/unrelated',head_sha:sha,base_branch:'main'}]};}

test('current scoped Codex Draft with successful CI gets review priority, not a model call',()=>{
  const v=triage(snapshot(),now);
  assert.equal(v.decision,'REVIEW_DRAFT');assert.equal(v.pr_number,121);assert.equal(v.model_calls,0);
});
test('unknown scope, task status, malformed CI provenance and ambiguous identity block',()=>{
  for(const edit of [
    s=>s.registry.tasks[0].status='approved',s=>s.pulls[0].draft=false,
    s=>s.pulls[0].changed_paths=['scripts/wrong.mjs','tests/example.test.mjs'],
    s=>s.pulls[0].head_ref='codex/task-result/unknown',
    s=>s.pulls[0].integrity_run_url='https://notgithub.test/actions/runs/1234',
    s=>delete s.pulls[0].changed_paths]){
    const s=snapshot();edit(s);assert.equal(triage(s,now).decision,'BLOCKED');
  }
});
test('failed or unproven CI does not become a reviewed result',()=>{
  for(const status of ['failure','cancelled','in_progress',null]){
    const s=snapshot();s.pulls[0].integrity_conclusion=status;
    assert.equal(triage(s,now).decision,'INSPECT_CI');
  }
});
test('empty result queue allows investigation but never autonomous approval or spending',()=>{
  const s=snapshot();s.pulls=s.pulls.slice(1);
  const v=triage(s,now);assert.equal(v.decision,'DISCOVER_OFFLINE_TASK');assert.equal(v.model_calls,0);
});
test('stale, future, oversized, duplicate, foreign repo, bad SHA or enabled registry fails closed',()=>{
  for(const edit of [
    s=>s.observed_at='2030-04-10T09:00:00Z',
    s=>s.observed_at='2030-04-10T10:11:00Z',
    s=>s.repository='attacker/repo',s=>s.registry.enabled=true,
    s=>s.pulls.push({...s.pulls[0]}),
    s=>s.pulls=Array.from({length:100},(_,i)=>({...s.pulls[1],number:200+i})),
    s=>s.pulls[0].head_sha='invalid']){
    const s=snapshot();edit(s);assert.throws(()=>triage(s,now),/ATLAS_WORK_MANAGER_BLOCKED|ATLAS_TASK_REJECTED/);
  }
});
