import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyFailure,createClaim,recoverOnce} from '../scripts/atlas-autonomous-recovery.mjs';
const REPO='JezCH/atlas-person-db',SHA='a'.repeat(40);
const now=Date.parse('2026-10-24T15:36:00Z');
const run={id:500,name:'ATLAS Autonomous Loop — Independent PR Outcome',status:'completed',
  conclusion:'failure',event:'workflow_run',run_attempt:1,head_branch:'main',
  head_sha:SHA,head_repository:{full_name:REPO},updated_at:'2026-10-24T15:35:00Z'};
const event={action:'completed',repository:{full_name:REPO},workflow_run:{id:500,head_sha:SHA}};
const jobs={total_count:2,jobs:[
  {name:'independent-outcome',conclusion:'success'},
  {name:'journal-verified-draft',conclusion:'failure'}]};
const artifacts={total_count:1,artifacts:[{name:'atlas-outcome-123',
  expired:false,workflow_run:{id:500}}]};
test('only a fresh independently successful verification followed by journal failure is recoverable',()=>{
  assert.equal(classifyFailure({event,run,jobs,artifacts,now}).ci_run_id,123);
  for(const change of [
    {run:{...run,conclusion:'success'}},{run:{...run,event:'workflow_dispatch'}},
    {run:{...run,head_branch:'untrusted'}},{run:{...run,run_attempt:2}},
    {event:{...event,repository:{full_name:'attacker/repo'}}},
    {jobs:{total_count:2,jobs:[{...jobs.jobs[0],conclusion:'failure'},jobs.jobs[1]]}},
    {artifacts:{...artifacts,artifacts:[{...artifacts.artifacts[0],expired:true}]}},
  ])assert.notEqual(classifyFailure({event,run,jobs,artifacts,now,...change}).status,'CANDIDATE_FOR_REVERIFY');
  assert.equal(classifyFailure({event,run,jobs,artifacts,now:now+2*86400000}).status,'EXPIRED_STOP');
});
test('partial or contradictory external evidence fails closed',()=>{
  assert.equal(classifyFailure({event,run,jobs:{...jobs,total_count:3},artifacts,now}).status,'BLOCKED_UNCERTAIN');
  assert.equal(classifyFailure({event,run,jobs,artifacts:{...artifacts,total_count:2},now}).status,'BLOCKED_UNCERTAIN');
  assert.equal(classifyFailure({event,run,jobs,artifacts:{total_count:2,artifacts:[
    artifacts.artifacts[0],{...artifacts.artifacts[0],name:'atlas-outcome-124'}]},now}).status,'BLOCKED_UNCERTAIN');
});
test('bounded branch claim never retries a denied reference write',async()=>{
  const calls=[];
  const fetchImpl=async(url,opts)=>{calls.push({url,opts});return {status:201}};
  await createClaim('atlas/journal-recovery-once/ci-123',SHA,'fixture-token',fetchImpl);
  assert.equal(calls.length,1);
  assert.equal(calls[0].opts.method,'POST');
  assert.deepEqual(JSON.parse(calls[0].opts.body),{
    ref:'refs/heads/atlas/journal-recovery-once/ci-123',sha:SHA});
  let attempt=0;
  await assert.rejects(()=>createClaim('atlas/journal-recovery-once/ci-123',SHA,'fixture-token',
    async()=>{attempt++;return {status:422}}),/never retry/);
  assert.equal(attempt,1);
  await assert.rejects(()=>createClaim('refs/heads/malicious',SHA,'fixture-token',fetchImpl),/invalid/);
});
test('no authority from mismatched CI preflight or non-completed event (zero writes)',async()=>{
  let calls=0;
  const github=async()=>{calls++;throw Error('unexpected network')};
  const registry={version:1,enabled:false,max_commands_per_utc_day:1,tasks:[]};
  const r=await recoverOnce({event:{...event,action:'requested'},github,registry,
    mainSha:SHA,expectedCiRunId:123,claim:async()=>{throw Error('claim')},
    post:async()=>{throw Error('post')}});
  assert.equal(r.status,'IGNORED');assert.equal(calls,0);
});
