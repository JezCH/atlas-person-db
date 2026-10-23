import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {validateRegistry,resultBranch,taskRef,REPOSITORY} from './atlas-codex-task-policy.mjs';
import {extractPatchComment,validatePlan,CODEX_BOT_ID} from './atlas-codex-patch-relay.mjs';

const REPO_API='https://api.github.com/repos/'+REPOSITORY;
const SHA=/^[0-9a-f]{40}$/;
const RESULT=/^codex\/task-result\/(atlas-[a-z0-9-]{1,64})$/;
const PR_BODY=/^Codex task (atlas-[a-z0-9-]{1,64}); command receipt refs\/heads\/codex\/task-attempt\/\1; source App comment ([1-9][0-9]*)\. Exact original-event patch verified; focused test PASS\. Full CI\/review required\. No automatic merge\. Production NOT LIVE\.$/;
function block(reason){throw Error('ATLAS_AUTONOMOUS_OUTCOME_BLOCKED: '+reason);}
function digest(bytes){return crypto.createHash('sha256').update(bytes).digest('hex');}
function decodeBlob(data){
  if(data?.encoding!=='base64'||typeof data?.content!=='string'||data.size>200000)
    block('missing bounded GitHub content');
  const text=data.content.replace(/\s/g,'');
  if(!/^[A-Za-z0-9+/]*={0,2}$/.test(text))block('invalid blob encoding');
  const out=Buffer.from(text,'base64');
  if(out.toString('base64')!==text)block('noncanonical blob');
  return out;
}
function ciEventOK(run){
  return run?.name==='ATLAS Integrity'&&run?.event==='pull_request'&&
    run?.status==='completed'&&Number.isSafeInteger(run.id)&&run.id>0&&
    run?.head_repository?.full_name===REPOSITORY &&
    typeof run.head_branch==='string'&&RESULT.test(run.head_branch);
}
export function planOutcome(run,registry){
  validateRegistry(registry);
  if(!ciEventOK(run))return {status:'IGNORED',reason:'not a completed trusted Codex result CI run',model_calls:0};
  const [,taskId]=RESULT.exec(run.head_branch);
  const task=registry.tasks.find(t=>t.id===taskId);
  if(!task)return {status:'BLOCKED',task_id:taskId,reason:'task not in reviewed registry',model_calls:0};
  if(run.conclusion!=='success')return {status:'CI_NOT_PASSED',task_id:taskId,
    ci_run_id:run.id,ci_conclusion:run.conclusion??'unknown',
    next_action:'STOP_NO_MODEL_RETRY',model_calls:0};
  if(!SHA.test(run.head_sha??''))return {status:'BLOCKED',task_id:taskId,
    reason:'CI source SHA invalid',model_calls:0};
  return {status:'VERIFY_PROVENANCE',task_id:taskId,ci_run_id:run.id,
    ci_head_sha:run.head_sha,model_calls:0};
}
async function matchPR(github,run){
  const issueRefs=Array.isArray(run.pull_requests)?run.pull_requests:[];
  if(issueRefs.length>1)block('ambiguous CI pull requests');
  if(issueRefs.length===1){
    const pr=await github('pulls/'+issueRefs[0].number);
    if(pr.number!==issueRefs[0].number)block('PR identity changed');
    return pr;
  }
  const all=await github('pulls?state=open&head=JezCH:'+encodeURIComponent(run.head_branch)+'&per_page=30');
  if(!Array.isArray(all)||all.length!==1)block('missing or ambiguous current Draft PR');
  return github('pulls/'+all[0].number);
}
function expectedPR(pr,task,run){
  const [match,bodyTask,commentId]=PR_BODY.exec(pr?.body??'')||[];
  return Boolean(match&&bodyTask===task.id&&
    Number.isSafeInteger(pr.number)&&pr.number>0&&
    pr.state==='open'&&pr.draft===true&&!pr.merged_at&&
    pr.base?.ref==='main'&&pr.base?.repo?.full_name===REPOSITORY&&
    pr.head?.ref===resultBranch(task.id)&&pr.head?.repo?.full_name===REPOSITORY&&
    pr.head?.sha===run.head_sha&&SHA.test(pr.head.sha)&&
    Number(commentId)>0);
}
export async function evaluateOutcome({run,registry,github}={}){
  const initial=planOutcome(run,registry);
  if(initial.status!=='VERIFY_PROVENANCE')return initial;
  if(typeof github!=='function')block('read-only Github client required');
  const task=registry.tasks.find(t=>t.id===initial.task_id);
  const pr=await matchPR(github,run);
  if(!expectedPR(pr,task,run))block('PR differs from trusted Draft publication contract');
  const commentId=Number(PR_BODY.exec(pr.body)[2]);
  const branch=await github('git/ref/heads/'+resultBranch(task.id));
  if(branch?.object?.sha!==pr.head.sha)block('PR/result branch SHA mismatch');
  const receipt=await github('git/ref/heads/codex/task-attempt/'+task.id);
  const original=receipt?.object?.sha;
  if(!SHA.test(original??''))block('missing original task-attempt receipt');
  const commit=await github('commits/'+pr.head.sha);
  if(commit?.sha!==pr.head.sha||!Array.isArray(commit.parents)||commit.parents.length!==1||
    commit.parents[0].sha!==original)block('result commit is not one child of admitted base');
  const changed=await github('pulls/'+pr.number+'/files?per_page=100');
  if(!Array.isArray(changed)||changed.length!==2||
    changed.some(x=>x.status!=='modified'||!task.paths.includes(x.filename))||
    new Set(changed.map(x=>x.filename)).size!==2||
    task.paths.some(p=>!changed.some(x=>x.filename===p)))
    block('result file changes differ from approved source/test pair');
  const comments=await github('issues/'+task.launcher_pr+'/comments?per_page=100');
  if(!Array.isArray(comments)||comments.length>=100)block('incomplete bot comment evidence');
  const matches=comments.filter(x=>x.id===commentId);
  if(matches.length!==1||matches[0]?.user?.login!=='chatgpt-codex-connector[bot]'||
    matches[0]?.user?.id!==CODEX_BOT_ID)block('untrusted source patch comment');
  const patch=validatePlan(extractPatchComment(matches[0].body),task);
  if(patch.task_id!==task.id||patch.base_sha!==original)block('patch identity/base mismatch');
  for(const file of patch.files){
    const [before,after]=await Promise.all([
      github('contents/'+file.path+'?ref='+original),
      github('contents/'+file.path+'?ref='+pr.head.sha)
    ]);
    if(digest(decodeBlob(before))!==file.before_sha256 ||
      !decodeBlob(after).equals(Buffer.from(file.after_base64,'base64')))
      block('observed source differs from trusted bot patch preimage/replacement');
  }
  return {status:'CI_PASS_REVIEW_REQUIRED',task_id:task.id,
    issue_number:task.issue_number??null,pr_number:pr.number,pr_head_sha:pr.head.sha,
    ci_run_id:run.id,ci_url:run.html_url,ci_conclusion:run.conclusion,
    source_comment_id:commentId,task_attempt_base_sha:original,
    verified_paths:[...task.paths],review_requirement:'Independent human review before merge; not Production verified',
    next_action:'REVIEW_DRAFT_NO_MODEL_RETRY',model_calls:0};
}
export async function githubRead(endpoint,{token,fetchImpl=globalThis.fetch}={}){
  if(!token||typeof fetchImpl!=='function')block('read-only GitHub token required');
  const response=await fetchImpl(REPO_API+'/'+endpoint,{method:'GET',redirect:'error',headers:{
    Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
    'X-GitHub-Api-Version':'2022-11-28'
  }});
  if(response?.status!==200)block('GET HTTP '+response?.status+' '+endpoint.split('?')[0]);
  if(/rel="next"/.test(response.headers?.get?.('link')??''))block('paginated evidence');
  return response.json();
}
export async function inspectRun({runId,registry,github}={}){
  if(!Number.isSafeInteger(runId)||runId<1)block('invalid CI run identifier');
  const run=await github('actions/runs/'+runId);
  if(run?.id!==runId)block('run identity mismatch');
  return evaluateOutcome({run,registry,github});
}
export function recordOutcome(file,result){
  if(!file||typeof file!=='string'||!result||typeof result.status!=='string')
    block('bad outcome record');
  fs.writeFileSync(file,JSON.stringify({version:1,...result},null,2)+'\n',
    {flag:'wx',mode:0o600});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  (async()=>{
    const args=process.argv.slice(2);
    if(args.length!==2||args[0]!=='--run'||!/^[1-9][0-9]*$/.test(args[1]))
      block('usage: node scripts/atlas-autonomous-outcome.mjs --run CI_RUN_ID');
    if(process.env.GITHUB_REPOSITORY!==REPOSITORY||
      process.env.GITHUB_REF!=='refs/heads/main'||process.env.GITHUB_RUN_ATTEMPT!=='1')
      block('outcome must execute trusted main once');
    const registry=JSON.parse(fs.readFileSync('config/atlas-codex-tasks.v1.json','utf8'));
    const github=e=>githubRead(e,{token:process.env.GH_TOKEN});
    const result=await inspectRun({runId:Number(args[1]),registry,github});
    const output=path.join(process.env.RUNNER_TEMP||'/tmp','atlas-autonomous-outcome.json');
    recordOutcome(output,result);
    if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      '## ATLAS Autonomous Loop — independent outcome\n\n'+
      '- CI run: '+result.ci_run_id+'\n- Status: '+result.status+
      '\n- Task: '+(result.task_id??'unresolved')+
      '\n- PR: '+(result.pr_number??'unresolved')+
      '\n- Next: '+(result.next_action??'manual investigation')+'\n');
    console.log(JSON.stringify(result));
    // A verified report with pending human review is not an automation failure.
    // Missing or contradictory evidence is blocked and must not be retried as a new model call.
    if(result.status==='BLOCKED')process.exitCode=1;
  })().catch(e=>{
    console.error(e.message);
    const output=path.join(process.env.RUNNER_TEMP||'/tmp','atlas-autonomous-outcome.json');
    try{recordOutcome(output,{status:'BLOCKED',reason:String(e.message).slice(0,240),
      next_action:'STOP_NO_MODEL_RETRY; inspect GitHub evidence manually',model_calls:0})}catch{}
    process.exitCode=1;
  });
}
