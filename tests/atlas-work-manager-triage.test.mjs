import test from 'node:test';
import assert from 'node:assert/strict';
import {triage} from '../scripts/atlas-work-manager-triage.mjs';

const now=Date.parse('2030-04-10T10:10:00Z'),sha='a'.repeat(40);
const task={id:'atlas-test-result',status:'closed',priority:1,launcher_pr:101,launcher_sha:sha,
  paths:['scripts/example.mjs','tests/example.test.mjs'],
  snapshot_paths:['scripts/example.mjs','tests/example.test.mjs','AGENTS.md','WORK_EXECUTION.md'],
  not_before:'2030-04-09T00:00:00Z',expires_at:'2030-04-10T00:00:00Z',instructions:'Review only.'};
const registry=()=>({version:1,enabled:false,max_commands_per_utc_day:1,tasks:[structuredClone(task)]});
function codexEvidence(){
  return {task_id:task.id,launcher_pr:task.launcher_pr,launcher_sha:task.launcher_sha,
    app_comment_id:929,app_comment_author_id:199175422,
    app_comment_author_login:'chatgpt-codex-connector[bot]',
    app_comment_launcher_pr:task.launcher_pr,app_comment_marker:'ATLAS-CODEX-PATCH-V1',
    app_comment_task_id:task.id,patch_base_sha:sha,attempt_ref_sha:sha,
    result_head_sha:sha,patch_paths:[...task.paths]};
}
function snapshot(){return {version:1,repository:'JezCH/atlas-person-db',main_sha:sha,
  observed_at:'2030-04-10T10:09:00Z',registry:registry(),pulls:[
    {number:121,draft:true,head_ref:'codex/task-result/atlas-test-result',head_sha:sha,
      base_branch:'main',changed_paths:[...task.paths],codex_evidence:codexEvidence(),
      integrity_head_sha:sha,integrity_conclusion:'success',
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
    s=>s.pulls[0].codex_evidence.task_id='atlas-unknown',
    s=>s.pulls[0].integrity_run_url='https://notgithub.test/actions/runs/1234',
    s=>s.pulls[0].integrity_head_sha='f'.repeat(40),
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


test('legacy Codex result is recognized by real provenance, not a branch naming convention',()=>{
  const s=snapshot();
  s.pulls[0].head_ref='codex/integrated-root-result-20261020';
  assert.equal(triage(s,now).decision,'REVIEW_DRAFT');
  s.pulls[0].head_ref='review/older-codex-output';
  assert.equal(triage(s,now).decision,'REVIEW_DRAFT');
});
test('legacy-looking result without checked bot payload fails closed instead of disappearing',()=>{
  const s=snapshot();
  s.pulls[0].head_ref='codex/integrated-root-result-20261020';
  delete s.pulls[0].codex_evidence;
  assert.equal(triage(s,now).decision,'BLOCKED');
});
test('unrelated PR title and branch do not grant Codex provenance',()=>{
  const s=snapshot();
  s.pulls[0].head_ref='feature/not-a-codex-result';
  delete s.pulls[0].codex_evidence;
  assert.equal(triage(s,now).decision,'DISCOVER_OFFLINE_TASK');
});
test('spoofed bot/task/launcher/receipt/head/file evidence is blocked',()=>{
  const changes=[
    e=>e.app_comment_author_id=42,
    e=>e.app_comment_author_login='chatgpt-codex-connector',
    e=>e.app_comment_id=0,
    e=>e.launcher_pr=999,
    e=>e.launcher_sha='b'.repeat(40),
    e=>e.app_comment_launcher_pr=999,
    e=>e.app_comment_marker='@codex',
    e=>e.app_comment_task_id='atlas-other',
    e=>e.patch_base_sha='b'.repeat(40),
    e=>e.attempt_ref_sha='b'.repeat(40),
    e=>e.result_head_sha='b'.repeat(40),
    e=>e.patch_paths[0]='scripts/other.mjs',
  ];
  for(const edit of changes){
    const s=snapshot();s.pulls[0].head_ref='codex/integrated-root-result-20261020';
    edit(s.pulls[0].codex_evidence);
    assert.equal(triage(s,now).decision,'BLOCKED');
  }
});

test('historical Codex relay branch without independently checked task proof blocks new work',()=>{
  const s=snapshot();
  s.pulls[0].head_ref='codex/relay-pilot-20261020';
  delete s.pulls[0].codex_evidence;
  assert.equal(triage(s,now).decision,'BLOCKED');
});


test('existing scoped fix with current CI gets review priority, never a model command',()=>{
  const s=snapshot();
  s.pulls=s.pulls.slice(1);
  s.pulls.push({number:555,draft:true,head_ref:'fix/safe-defect',head_sha:sha,
    base_branch:'main',changed_paths:['scripts/example.mjs','tests/example.test.mjs'],
    review_evidence:{
      changed_paths:['scripts/example.mjs','tests/example.test.mjs'],
      integrity_head_sha:sha,integrity_conclusion:'success',
      integrity_run_url:'https://github.com/JezCH/atlas-person-db/actions/runs/9001'
    }});
  const v=triage(s,now);
  assert.equal(v.decision,'REVIEW_EXISTING_PR');
  assert.equal(v.pr_number,555);
  assert.equal(v.model_calls,0);
});
test('existing review cannot override unverified Codex result priority',()=>{
  const s=snapshot();
  s.pulls[1]={number:555,draft:true,head_ref:'fix/another',head_sha:sha,base_branch:'main',
    changed_paths:['scripts/example.mjs','tests/example.test.mjs'],
    review_evidence:{changed_paths:['scripts/example.mjs','tests/example.test.mjs'],
      integrity_head_sha:sha,integrity_conclusion:'success',
      integrity_run_url:'https://github.com/JezCH/atlas-person-db/actions/runs/9001'}};
  assert.equal(triage(s,now).decision,'REVIEW_DRAFT');
});
test('existing candidate wrong paths or wrong CI head cannot be treated as verified',()=>{
  for(const edit of [
    p=>p.review_evidence.changed_paths[0]='scripts/changed.mjs',
    p=>p.review_evidence.integrity_head_sha='c'.repeat(40),
    p=>p.review_evidence.integrity_run_url='https://untrusted.test/runs/1',
    p=>p.head_ref='pilot/not-a-fix',
    p=>p.draft=false
  ]){
    const s=snapshot();s.pulls=s.pulls.slice(1);
    const p={number:555,draft:true,head_ref:'fix/safe-defect',head_sha:sha,base_branch:'main',
      changed_paths:['scripts/example.mjs','tests/example.test.mjs'],
      review_evidence:{changed_paths:['scripts/example.mjs','tests/example.test.mjs'],
        integrity_head_sha:sha,integrity_conclusion:'success',
        integrity_run_url:'https://github.com/JezCH/atlas-person-db/actions/runs/9001'}};
    edit(p);s.pulls.push(p);
    assert.equal(triage(s,now).decision,'BLOCKED');
  }
});
test('existing candidate CI failure is INSPECT_CI, not review-ready',()=>{
  const s=snapshot();s.pulls=s.pulls.slice(1);
  s.pulls.push({number:555,draft:true,head_ref:'fix/candidate',head_sha:sha,base_branch:'main',
    changed_paths:['scripts/a.mjs','tests/a.test.mjs'],
    review_evidence:{changed_paths:['scripts/a.mjs','tests/a.test.mjs'],integrity_head_sha:sha,
      integrity_conclusion:'failure',
      integrity_run_url:'https://github.com/JezCH/atlas-person-db/actions/runs/9001'}});
  assert.equal(triage(s,now).decision,'INSPECT_CI');
});
