import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createPlanFromEvent} from './atlas-codex-patch-relay.mjs';
import {validateRegistry,taskRef,budgetRef,resultBranch,REPOSITORY} from './atlas-codex-task-policy.mjs';
import {githubRequest} from './atlas-autonomous-loop-bridge.mjs';

const SHA=/^[a-f0-9]{40}$/;
const BOT_ID=199175422;
const BOT='chatgpt-codex-connector[bot]';
const RUN_NAME='ATLAS Integrity';
const STATUS=new Set(['CI_PASS_REVIEW_REQUIRED','CI_FAILED']);
const PR_BODY=/^Codex task (atlas-[a-z0-9-]{1,64}); command receipt (refs\/heads\/codex\/task-attempt\/atlas-[a-z0-9-]{1,64}); source App comment ([1-9][0-9]*)\./;
function block(reason){throw Error('ATLAS_RESULT_BLOCKED: '+reason);}
function shaBlob(bytes){
  return crypto.createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
}
function validBlob(content){
  if(content?.type!=='file'||content.encoding!=='base64'||
    typeof content.content!=='string'||typeof content.sha!=='string')block('invalid GitHub content shape');
  const string=content.content.replace(/\s/g,'');
  if(!/^[A-Za-z0-9+/]*={0,2}$/.test(string))block('invalid base64');
  const bytes=Buffer.from(string,'base64');
  if(bytes.length>50000||bytes.toString('base64')!==string||shaBlob(bytes)!==content.sha)
    block('GitHub blob checksum mismatch');
  return bytes;
}
function outcome(run,pr,task,plan,commentId){
  const ok=run.conclusion==='success';
  const status=ok?'CI_PASS_REVIEW_REQUIRED':'CI_FAILED';
  return {version:1,status,pr_number:pr.number,task_id:task.id,
    head_sha:pr.head.sha,base_sha:plan.base_sha,
    run_id:run.id,run_attempt:run.run_attempt,
    ci_conclusion:run.conclusion,app_comment_id:commentId,issue_number:task.issue_number??null,
    verified_provenance:true,model_calls:0,
    next_action:ok?'INDEPENDENT_REVIEW_REQUIRED_BEFORE_MERGE':'STOP_NO_AUTOMATIC_MODEL_RETRY',
    production_verified:false};
}
export function eventGate(event,run){
  if(event?.action!=='completed'||event?.repository?.full_name!==REPOSITORY||
    event?.workflow_run?.id!==run?.id||
    run?.name!==RUN_NAME||run?.event!=='pull_request'||run?.status!=='completed'||
    !['success','failure','cancelled','timed_out'].includes(run.conclusion)||
    !SHA.test(run.head_sha??'')||!Number.isSafeInteger(run.id)||run.id<1||
    !Number.isSafeInteger(run.run_attempt)||run.run_attempt<1)
    return false;
  const linked=run.pull_requests;
  return Array.isArray(linked)&&linked.length===1&&
    Number.isSafeInteger(linked[0].number)&&linked[0].number>0;
}
export async function independentlyVerify({event,github,registry}={}){
  validateRegistry(registry);
  if(event?.action!=='completed'||event?.repository?.full_name!==REPOSITORY||
    event?.workflow_run?.name!==RUN_NAME||event?.workflow_run?.event!=='pull_request')
    return {status:'NOT_APPLICABLE',model_calls:0};
  const run=await github('actions/runs/'+event.workflow_run.id);
  if(!eventGate(event,run))
    return {status:'NO_CONFIRMED_PR',reason:'workflow event/PR association not independently established',model_calls:0};
  const n=run.pull_requests[0].number;
  const pr=await github('pulls/'+n);
  const match=/^codex\/task-result\/(atlas-[a-z0-9-]{1,64})$/.exec(pr?.head?.ref??'');
  if(!match)return {status:'NOT_APPLICABLE',model_calls:0};
  if(!pr.draft||pr.state!=='open'||pr.base?.ref!=='main'||
    pr.base?.repo?.full_name!==REPOSITORY||pr.head?.repo?.full_name!==REPOSITORY||
    pr.head.sha!==run.head_sha||run.pull_requests[0].number!==pr.number)
    block('PR repository/head/state mismatch');
  const task=registry.tasks.find(t=>t.id===match[1]);
  if(!task||!['approved','closed'].includes(task.status))
    block('unknown or unapproved task');
  const body=PR_BODY.exec(pr.body??'');
  if(!body||body[1]!==task.id||body[2]!==taskRef(task.id))
    block('untrusted or inconsistent PR source claim');
  const commentId=Number(body[3]);
  if(!Number.isSafeInteger(commentId)||commentId<1)block('bad origin comment id');
  const [comment,files,attempt]=await Promise.all([
    github('issues/comments/'+commentId),github('pulls/'+n+'/files?per_page=100'),
    github('git/ref/heads/codex/task-attempt/'+task.id)
  ]);
  if(comment?.user?.id!==BOT_ID||comment?.user?.login!==BOT||
    comment?.user?.type!=='Bot'||comment.id!==commentId||
    comment.issue_url!=='https://api.github.com/repos/'+REPOSITORY+'/issues/'+task.launcher_pr)
    block('not the original authenticated Codex App comment');
  const stamp=Date.parse(comment.created_at);
  if(!Number.isFinite(stamp)||stamp<Date.parse(task.not_before)||stamp>Date.parse(task.expires_at))
    block('bot comment outside approval window');
  const eventFromBot={action:'created',repository:{full_name:REPOSITORY},
    issue:{number:task.launcher_pr,pull_request:{}},comment};
  const plan=createPlanFromEvent(eventFromBot,task);
  if(!attempt||attempt.object?.sha!==plan.base_sha||!SHA.test(plan.base_sha))
    block('immutable task admission receipt mismatch');
  const days=[stamp,stamp-86400000];
  const budgetRefs=await Promise.all(days.map(d=>github('git/ref/heads/'+budgetRef(d).replace(/^refs\/heads\//,''))));
  if(!budgetRefs.some(x=>x?.object?.sha===plan.base_sha))
    block('missing matching UTC-day command budget receipt');
  if(!Array.isArray(files)||files.length!==2||
    files.some(f=>f.status!=='modified'||f.previous_filename)||
    JSON.stringify(files.map(f=>f.filename).sort())!==JSON.stringify([...task.paths].sort()))
    block('PR changed paths not equal to approved source/test');
  // Confirm GitHub's PR blobs equal the original Codex complete-file payload,
  // and the approved preimage hashes equal the originally admitted main SHA.
  // No PR code is checked out or executed in this verifier.
  for(const f of plan.files){
    const [before,after]=await Promise.all([
      github('contents/'+f.path+'?ref='+plan.base_sha),
      github('contents/'+f.path+'?ref='+pr.head.sha)
    ]);
    const prior=validBlob(before),newBytes=validBlob(after);
    if(crypto.createHash('sha256').update(prior).digest('hex')!==f.before_sha256||
      !newBytes.equals(Buffer.from(f.after_base64,'base64'))||
      prior.equals(newBytes))
      block('preimage or actual PR file differs from verified Codex patch');
  }
  return outcome(run,pr,task,plan,commentId);
}
export function resultMarker(result){
  if(!STATUS.has(result?.status)||!Number.isSafeInteger(result.pr_number)||
    !Number.isSafeInteger(result.run_id)||!SHA.test(result.head_sha??''))
    block('invalid result marker');
  return '<!-- ATLAS-AUTONOMOUS-RESULT-V1:'+result.pr_number+':'+result.run_id+':'+result.head_sha+' -->';
}
export function resultComment(result){
  if(result?.verified_provenance!==true)block('unverified result cannot be journaled');
  const m=resultMarker(result);
  return [m,'### ATLAS autonomous development — independent evidence checkpoint',
    '- State: '+result.status,
    '- Task: '+result.task_id,
    '- Draft PR: #'+result.pr_number,
    '- PR head: '+result.head_sha,
    '- Codex source App comment: '+result.app_comment_id,
    '- Verified original main preimage: '+result.base_sha,
    '- Independent ATLAS Integrity CI: https://github.com/'+REPOSITORY+'/actions/runs/'+result.run_id,
    '- CI conclusion: '+result.ci_conclusion,
    '- Next decision: '+result.next_action,
    '- No automatic model retry, task approval, merge, Production or DB action.',
    '- This verifies source, file content and CI outcome; it is not a semantic acceptance or Production verification.'
  ].join('\n').slice(0,3200);
}
export async function recordOutcome({result,github,post}={}){
  if(!result||!STATUS.has(result.status)||result.verified_provenance!==true)
    return {status:'NO_RECORD',model_calls:0};
  const existing=await github('issues/'+result.pr_number+'/comments?per_page=100');
  if(!Array.isArray(existing)||existing.length>=100)block('incomplete comment history');
  const marker=resultMarker(result);
  if(existing.some(x=>typeof x?.body==='string'&&x.body.includes(marker)))
    return {status:'ALREADY_RECORDED',model_calls:0};
  await post('issues/'+result.pr_number+'/comments',{body:resultComment(result)});
  return {status:'RECORDED',pr_number:result.pr_number,run_id:result.run_id,
    result:result.status,model_calls:0,next_action:result.next_action};
}
function localSha(){
  const p=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8',timeout:5000});
  if(p.status!==0||!SHA.test(p.stdout.trim()))block('not a main checkout');
  return p.stdout.trim();
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  (async()=>{
    const mode=process.argv[2];
    if(!['evaluate','record'].includes(mode)||process.argv.length!==3)
      block('usage: result-verifier evaluate|record');
    if(process.env.GITHUB_REPOSITORY!==REPOSITORY||
      process.env.GITHUB_REF!=='refs/heads/main'||
      process.env.GITHUB_RUN_ATTEMPT!=='1')block('untrusted workflow');
    const token=process.env.GH_TOKEN;
    if(!token)block('no GitHub token');
    const github=endpoint=>githubRequest(endpoint,{token});
    const event=JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH,'utf8'));
    const main=await github('branches/main');
    if(main?.commit?.sha!==localSha())block('main advanced');
    const registry=JSON.parse(fs.readFileSync('config/atlas-codex-tasks.v1.json','utf8'));
    const result=await independentlyVerify({event,github,registry});
    if(mode==='evaluate'){
      console.log(JSON.stringify(result));
      if(process.env.GITHUB_OUTPUT){
        fs.appendFileSync(process.env.GITHUB_OUTPUT,'recordable='+(STATUS.has(result.status)&&result.verified_provenance===true)+'\n');
      }
      const dest=process.env.RUNNER_TEMP;
      if(dest)fs.writeFileSync(path.join(dest,'atlas-autonomous-result.json'),JSON.stringify(result,null,2)+'\n');
      return;
    }
    const post=async(endpoint,body)=>{
      const response=await fetch('https://api.github.com/repos/'+REPOSITORY+'/'+endpoint,{
        method:'POST',redirect:'error',headers:{
          Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
          'Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'},
        body:JSON.stringify(body)});
      if(response.status!==201)block('GitHub journal POST HTTP '+response.status);
    };
    console.log(JSON.stringify(await recordOutcome({result,github,post})));
  })().catch(e=>{console.error(e.message);process.exitCode=1});
}
}
