// P1: bounded, no-model recovery of a failed PR journal checkpoint.
// Only the original trusted CI and original immutable Codex patch grant authority.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {validateRegistry,REPOSITORY} from './atlas-codex-task-policy.mjs';
import {inspectRun} from './atlas-autonomous-outcome.mjs';
import {githubRequest} from './atlas-autonomous-loop-bridge.mjs';
import {journalMarker,postJournal,githubWrite} from './atlas-autonomous-outcome-journal.mjs';

const NAME='ATLAS Autonomous Loop — Independent PR Outcome';
const BASE='https://api.github.com/repos/'+REPOSITORY;
const SHA=/^[a-f0-9]{40}$/;
function fail(why){throw Error('ATLAS_RECOVERY_BLOCKED: '+why)}
const validInt=n=>Number.isSafeInteger(n)&&n>0;
const claimName=n=>'atlas/journal-recovery-once/ci-'+n;

export function classifyFailure({event,run,jobs,artifacts,now=Date.now()}={}){
  if(event?.action!=='completed'||event?.repository?.full_name!==REPOSITORY||
    !validInt(event?.workflow_run?.id)||run?.id!==event.workflow_run.id||
    run?.name!==NAME||run?.status!=='completed'||run?.conclusion!=='failure'||
    run?.event!=='workflow_run'||run?.run_attempt!==1||
    run?.head_repository?.full_name!==REPOSITORY||run?.head_branch!=='main'||
    !SHA.test(run?.head_sha??'')||run.head_sha!==event.workflow_run.head_sha)
    return {status:'IGNORED',model_calls:0};
  const updated=Date.parse(run.updated_at??'');
  if(!Number.isFinite(updated)||!Number.isFinite(now)||updated>now+300000||
    now-updated>86400000)
    return {status:'EXPIRED_STOP',model_calls:0,reason:'bounded 24h recovery horizon exceeded'};
  if(jobs?.total_count!==2||!Array.isArray(jobs.jobs)||jobs.jobs.length!==2||
    new Set(jobs.jobs.map(x=>x.name)).size!==2)
    return {status:'BLOCKED_UNCERTAIN',model_calls:0,reason:'incomplete or changed workflow jobs'};
  const verify=jobs.jobs.find(j=>j.name==='independent-outcome');
  const journal=jobs.jobs.find(j=>j.name==='journal-verified-draft');
  if(verify?.conclusion!=='success'||journal?.conclusion!=='failure')
    return {status:'STOP_NO_REPLAY',model_calls:0,reason:'failure was not verified journal-only'};
  if(!Number.isSafeInteger(artifacts?.total_count)||artifacts.total_count<1||
    artifacts.total_count>20||!Array.isArray(artifacts.artifacts)||
    artifacts.artifacts.length!==artifacts.total_count)
    return {status:'BLOCKED_UNCERTAIN',model_calls:0,reason:'incomplete workflow evidence artifacts'};
  const matches=artifacts.artifacts.filter(a=>/^atlas-outcome-[1-9][0-9]*$/.test(a?.name??''));
  if(matches.length!==1||matches[0].expired!==false||
    matches[0].workflow_run?.id!==run.id)
    return {status:'BLOCKED_UNCERTAIN',model_calls:0,reason:'missing unambiguous original CI reference'};
  const ciRunId=Number(matches[0].name.slice('atlas-outcome-'.length));
  if(!validInt(ciRunId))return {status:'BLOCKED_UNCERTAIN',model_calls:0,reason:'invalid original CI identifier'};
  return {status:'CANDIDATE_FOR_REVERIFY',ci_run_id:ciRunId,
    failed_outcome_run_id:run.id,model_calls:0};
}

export async function planRecovery({event,github,registry,now=Date.now()}={}){
  if(event?.action!=='completed'||event?.repository?.full_name!==REPOSITORY||
    !validInt(event.workflow_run?.id))
    return {status:'IGNORED',model_calls:0};
  validateRegistry(registry);
  if(typeof github!=='function')fail('read-only authenticated GitHub client required');
  const failed=await github('actions/runs/'+event.workflow_run.id);
  const basic=classifyFailure({event,run:failed,
    jobs:await github('actions/runs/'+failed.id+'/jobs?per_page=100'),
    artifacts:await github('actions/runs/'+failed.id+'/artifacts?per_page=100'),now});
  if(basic.status!=='CANDIDATE_FOR_REVERIFY')return basic;
  // CI run + Codex bot ID + original complete-file patch + task receipt + PR
  // blobs are independently verified again, not trusted from artifact contents.
  const outcome=await inspectRun({runId:basic.ci_run_id,registry,github});
  if(outcome.status!=='CI_PASS_REVIEW_REQUIRED')
    return {status:'STOP_NO_REPLAY',reason:'original Integrity/provenance not proven',model_calls:0};
  const commentList=await github('issues/'+outcome.pr_number+'/comments?per_page=100');
  if(!Array.isArray(commentList)||commentList.length>=100)
    return {status:'BLOCKED_UNCERTAIN',reason:'incomplete existing PR journal',model_calls:0};
  if(commentList.some(x=>typeof x?.body==='string'&&x.body.includes(journalMarker(outcome))))
    return {status:'ALREADY_RECORDED',ci_run_id:basic.ci_run_id,model_calls:0};
  const pr=await github('pulls/'+outcome.pr_number);
  if(pr?.state!=='open'||pr.draft!==true||pr.head?.sha!==outcome.pr_head_sha)
    return {status:'STOP_NO_REPLAY',reason:'PR no longer exact open Draft',model_calls:0};
  const claim=await github('git/ref/heads/'+claimName(basic.ci_run_id));
  if(claim)return {status:'ALREADY_ATTEMPTED',ci_run_id:basic.ci_run_id,model_calls:0};
  return {status:'READY_JOURNAL_ONLY',ci_run_id:basic.ci_run_id,
    pr_number:outcome.pr_number,head_sha:outcome.pr_head_sha,
    failed_outcome_run_id:failed.id,outcome,model_calls:0};
}
export async function recoverOnce({event,github,registry,now=Date.now(),
    expectedCiRunId,mainSha,claim,post}={}){
  if(!validInt(expectedCiRunId)||!SHA.test(mainSha??'')||
    typeof claim!=='function'||typeof post!=='function')
    fail('missing trusted recovery preconditions');
  const plan=await planRecovery({event,github,registry,now});
  if(plan.status!=='READY_JOURNAL_ONLY')
    return {status:plan.status,model_calls:0,reason:plan.reason??'not replayable'};
  if(plan.ci_run_id!==expectedCiRunId)fail('original CI changed since read-only plan');
  const main=await github('branches/main');
  if(main?.commit?.sha!==mainSha)fail('trusted main advanced');
  // Create-only atomic claim: a retry after an uncertain GitHub POST may not
  // spend a second comment write, even if the original POST timed out.
  await claim(claimName(plan.ci_run_id),mainSha);
  const confirmed=await github('git/ref/heads/'+claimName(plan.ci_run_id));
  if(confirmed?.object?.sha!==mainSha)fail('one-shot recovery claim mismatch');
  const output=await postJournal({outcome:plan.outcome,github,post});
  return {...output,recovery_claim:claimName(plan.ci_run_id),
    original_ci_run_id:plan.ci_run_id,model_calls:0};
}
export async function createClaim(name,sha,token,fetchImpl=globalThis.fetch){
  if(!/^atlas\/journal-recovery-once\/ci-[1-9][0-9]*$/.test(name)||!SHA.test(sha??'')||
    typeof token!=='string'||!token||typeof fetchImpl!=='function')
    fail('invalid create-only recovery reference');
  const resp=await fetchImpl(BASE+'/git/refs',{method:'POST',redirect:'error',
    headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
      'Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'},
    body:JSON.stringify({ref:'refs/heads/'+name,sha})});
  if(resp?.status!==201)fail('claim rejected; HTTP '+resp?.status+'; never retry');
}
function checkoutSha(){
  const r=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8',timeout:5000});
  if(r.status!==0||!SHA.test(r.stdout.trim()))fail('no trusted main checkout');
  return r.stdout.trim();
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  (async()=>{
    const mode=process.argv[2];
    if(!['plan','recover'].includes(mode)||process.argv.length!==3)
      fail('usage: recovery plan|recover');
    if(process.env.GITHUB_REPOSITORY!==REPOSITORY||
      process.env.GITHUB_REF!=='refs/heads/main'||
      process.env.GITHUB_RUN_ATTEMPT!=='1')fail('not trusted default branch one-shot');
    const event=JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH,'utf8'));
    const token=process.env.GH_TOKEN;
    if(!token)fail('missing read token');
    const github=e=>githubRequest(e,{token});
    const main=await github('branches/main');
    const sha=checkoutSha();
    if(main?.commit?.sha!==sha)fail('main moved relative to checkout');
    const registry=JSON.parse(fs.readFileSync('config/atlas-codex-tasks.v1.json','utf8'));
    if(mode==='plan'){
      const plan=await planRecovery({event,github,registry});
      console.log(JSON.stringify({status:plan.status,ci_run_id:plan.ci_run_id??null,
        failed_outcome_run_id:plan.failed_outcome_run_id??null,
        model_calls:0}));
      if(process.env.GITHUB_OUTPUT){
        fs.appendFileSync(process.env.GITHUB_OUTPUT,'eligible='+(plan.status==='READY_JOURNAL_ONLY')+'\n');
        fs.appendFileSync(process.env.GITHUB_OUTPUT,'ci_run_id='+(plan.ci_run_id??'')+'\n');
      }
      return;
    }
    const expected=Number(process.env.EXPECTED_ORIGINAL_CI_RUN_ID);
    const writeToken=process.env.JOURNAL_WRITE_TOKEN;
    if(!writeToken)fail('missing existing PR-comment writer PAT');
    const result=await recoverOnce({event,github,registry,mainSha:sha,expectedCiRunId:expected,
      claim:(name,commitSha)=>createClaim(name,commitSha,token),
      post:(endpoint,body)=>githubWrite(endpoint,body,writeToken)});
    console.log(JSON.stringify(result));
  })().catch(e=>{console.error(e.message);process.exitCode=1});
}
