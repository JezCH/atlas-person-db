import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {inspectRun,githubRead} from './atlas-autonomous-outcome.mjs';
import {REPOSITORY} from './atlas-codex-task-policy.mjs';

const API='https://api.github.com/repos/'+REPOSITORY;
const SHA=/^[0-9a-f]{40}$/;
function block(reason){throw Error('ATLAS_OUTCOME_JOURNAL_BLOCKED: '+reason);}
export function journalMarker(outcome){
  if(outcome?.status!=='CI_PASS_REVIEW_REQUIRED'||
    !Number.isSafeInteger(outcome.pr_number)||outcome.pr_number<1||
    !Number.isSafeInteger(outcome.ci_run_id)||outcome.ci_run_id<1||
    !SHA.test(outcome.pr_head_sha??'')||
    !/^atlas-[a-z0-9-]{1,64}$/.test(outcome.task_id??''))
    block('unverified outcome shape');
  return '<!-- ATLAS-AUTONOMOUS-OUTCOME-V1:'+outcome.pr_number+':'+
    outcome.ci_run_id+':'+outcome.pr_head_sha+' -->';
}
export function journalBody(outcome){
  const marker=journalMarker(outcome);
  return [marker,
    '### ATLAS independent development evidence — awaiting review',
    '- Status: CI_PASS_REVIEW_REQUIRED',
    '- Task: '+outcome.task_id,
    '- Draft PR: #'+outcome.pr_number,
    '- PR head SHA: '+outcome.pr_head_sha,
    '- Original task admission SHA: '+outcome.task_attempt_base_sha,
    '- Authenticated Codex patch comment ID: '+outcome.source_comment_id,
    '- Independent CI: https://github.com/'+REPOSITORY+'/actions/runs/'+outcome.ci_run_id,
    '- Next: REVIEW_DRAFT_NO_MODEL_RETRY',
    '- This evidence is **not** an AI self-approval, human code review, merge or Production verification.',
    '- No next model task is dispatched from this checkpoint.'
  ].join('\n').slice(0,2600);
}
export async function postJournal({outcome,github,post}={}){
  // The privileged GitHub job MUST re-run inspectRun() on its own trusted main
  // checkout before calling this helper. No untrusted artifact is an authority.
  if(outcome?.status!=='CI_PASS_REVIEW_REQUIRED')return {status:'NOT_RECORDABLE',model_calls:0};
  if(typeof github!=='function'||typeof post!=='function')block('GitHub adapter missing');
  const marker=journalMarker(outcome),endpoint='issues/'+outcome.pr_number+'/comments?per_page=100';
  const history=await github(endpoint);
  if(!Array.isArray(history)||history.length>=100)
    block('incomplete comment inventory; do not risk duplicate write');
  if(history.some(item=>typeof item?.body==='string'&&item.body.includes(marker)))
    return {status:'ALREADY_RECORDED',pr_number:outcome.pr_number,model_calls:0};
  const pr=await github('pulls/'+outcome.pr_number);
  if(pr?.state!=='open'||pr?.draft!==true||pr?.head?.sha!==outcome.pr_head_sha)
    block('Draft/head no longer matches verified record');
  await post('issues/'+outcome.pr_number+'/comments',{body:journalBody(outcome)});
  return {status:'RECORDED',pr_number:outcome.pr_number,
    ci_run_id:outcome.ci_run_id,next_action:'REVIEW_DRAFT_NO_MODEL_RETRY',model_calls:0};
}
export async function githubWrite(endpoint,body,token,fetchImpl=globalThis.fetch){
  if(!token||typeof fetchImpl!=='function')block('GitHub authorizing token missing');
  const response=await fetchImpl(API+'/'+endpoint,{
    method:'POST',redirect:'error',headers:{
      Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
      'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'
    },body:JSON.stringify(body)
  });
  if(response?.status!==201)block('GitHub journal POST HTTP '+(response?.status??'unknown'));
}
function checkoutSha(){
  const r=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8',timeout:5000});
  if(r.status!==0||!SHA.test(r.stdout.trim()))block('not a trusted checkout');
  return r.stdout.trim();
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  (async()=>{
    const args=process.argv.slice(2);
    if(args.length!==2||args[0]!=='--run'||!/^[1-9][0-9]*$/.test(args[1]))
      block('usage: node scripts/atlas-autonomous-outcome-journal.mjs --run CI_RUN_ID');
    if(process.env.GITHUB_REPOSITORY!==REPOSITORY||
      process.env.GITHUB_REF!=='refs/heads/main'||
      process.env.GITHUB_RUN_ATTEMPT!=='1')block('untrusted workflow context');
    const token=process.env.GH_TOKEN;
    const writer=process.env.JOURNAL_WRITE_TOKEN;
    if(!token)block('missing read-only GitHub token');
    if(!writer)block('missing independently scoped PR-journal writer token');
    const github=e=>githubRead(e,{token});
    const main=await github('branches/main');
    if(main?.commit?.sha!==checkoutSha())block('main moved during trusted checkout');
    const registry=JSON.parse(fs.readFileSync('config/atlas-codex-tasks.v1.json','utf8'));
    const outcome=await inspectRun({runId:Number(args[1]),registry,github});
    console.log(JSON.stringify(await postJournal({outcome,github,
      post:(e,b)=>githubWrite(e,b,writer)})));
  })().catch(e=>{console.error(e.message);process.exitCode=1});
}
