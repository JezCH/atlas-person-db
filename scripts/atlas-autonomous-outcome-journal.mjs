import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {inspectRun,githubRead} from './atlas-autonomous-outcome.mjs';
import {REPOSITORY} from './atlas-codex-task-policy.mjs';

const API='https://api.github.com/repos/'+REPOSITORY;
const SHA=/^[0-9a-f]{40}$/;
function block(reason){throw Error('ATLAS_OUTCOME_JOURNAL_BLOCKED: '+reason);}

const FAILURE_CODES=Object.freeze({
  missing_token:'JOURNAL_WRITE_TOKEN_MISSING',
  writer_permission:'JOURNAL_WRITER_PERMISSION_DENIED',
  writer_conflict:'JOURNAL_WRITE_STATE_AMBIGUOUS',
  remote_unavailable:'JOURNAL_REMOTE_UNAVAILABLE',
  blocked:'JOURNAL_PRECONDITION_BLOCKED'
});
/**
 * P1 failure classification operates only on trusted code-generated error
 * properties, not arbitrary GitHub comments or AI-authored output. Neither a
 * possible remote write nor a permission failure may request a second model.
 */
export function classifyJournalFailure(error){
  const status=error?.journalHttpStatus;
  const type=error?.journalErrorType;
  let code=FAILURE_CODES.blocked;
  let recovery='INSPECT_EVIDENCE_MANUALLY_NO_MODEL_RETRY';
  if(type==='MISSING_WRITE_TOKEN'){
    code=FAILURE_CODES.missing_token;
    recovery='CONFIGURE_REVIEWED_JOURNAL_WRITER_THEN_REVERIFY_ORIGINAL_CI';
  }else if(status===401||status===403){
    code=FAILURE_CODES.writer_permission;
    recovery='REVIEW_WRITER_PERMISSIONS_THEN_REVERIFY_ORIGINAL_CI';
  }else if(status===409||status===422){
    code=FAILURE_CODES.writer_conflict;
    recovery='READ_BACK_ORIGINAL_PR_COMMENT_BEFORE_ANY_MANUAL_REPLAY';
  }else if(status===429||(Number.isInteger(status)&&status>=500&&status<=599)||type==='TRANSPORT'){
    code=FAILURE_CODES.remote_unavailable;
    recovery='READ_BACK_ORIGINAL_PR_COMMENT_BEFORE_ANY_MANUAL_REPLAY';
  }
  return {version:1,status:'JOURNAL_BLOCKED',failure_code:code,
    http_status:Number.isInteger(status)&&status>=100&&status<=599?status:null,
    recovery,model_calls:0,automatic_model_retry:false,
    automatic_journal_retry:false,production_verified:false};
}
export function journalFailureArtifact(error,runId){
  if(!Number.isSafeInteger(runId)||runId<1)block('invalid failed journal run identifier');
  return {...classifyJournalFailure(error),ci_run_id:runId};
}
function taggedWriteError(type,message,httpStatus){
  const e=new Error('ATLAS_OUTCOME_JOURNAL_BLOCKED: '+message);
  e.journalErrorType=type;
  if(Number.isInteger(httpStatus))e.journalHttpStatus=httpStatus;
  return e;
}

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
  if(!token||typeof fetchImpl!=='function')
    throw taggedWriteError('MISSING_WRITE_TOKEN','GitHub authorizing token missing');
  // This adapter is for one PR issue-comment journal only, never a generic
  // elevated GitHub write client.
  if(!/^issues\/[1-9][0-9]*\/comments$/.test(endpoint)||
    !body||typeof body.body!=='string'||
    !body.body.includes('<!-- ATLAS-AUTONOMOUS-OUTCOME-V1:'))
    block('unexpected write endpoint or unverified journal marker');
  let response;
  try {
    response=await fetchImpl(API+'/'+endpoint,{
      method:'POST',redirect:'error',headers:{
        Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
        'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'
      },body:JSON.stringify(body)
    });
  }catch{
    throw taggedWriteError('TRANSPORT','GitHub journal POST transport failure (write status unknown)');
  }
  if(response?.status!==201)
    throw taggedWriteError('HTTP','GitHub journal POST HTTP '+(response?.status??'unknown'),
      response?.status);
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
  })().catch(e=>{
    const args=process.argv.slice(2);
    const id=args.length===2&&/^[1-9][0-9]*$/.test(args[1])?Number(args[1]):null;
    const diagnostic=Number.isSafeInteger(id)?
      journalFailureArtifact(e,id):classifyJournalFailure(e);
    console.error(JSON.stringify(diagnostic));
    if(process.env.GITHUB_STEP_SUMMARY)
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
        '### ATLAS journal stopped safely\n\n'+
        '- Failure code: '+diagnostic.failure_code+
        '\n- Next: '+diagnostic.recovery+
        '\n- Model calls/retries: 0\n');
    if(process.env.RUNNER_TEMP){
      const target=path.join(process.env.RUNNER_TEMP,'atlas-journal-failure.json');
      try{fs.writeFileSync(target,JSON.stringify(diagnostic,null,2)+'\n',
        {flag:'wx',mode:0o600});}catch{/* Never overwrite earlier evidence. */}
    }
    process.exitCode=1;
  });
}
