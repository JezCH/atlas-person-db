import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {validateRegistry,selectTask,taskRef,budgetRef,resultBranch,REPOSITORY} from './atlas-codex-task-policy.mjs';

const API='https://api.github.com/repos/'+REPOSITORY;
const SHA=/^[a-f0-9]{40}$/;
const WORKFLOW='atlas-codex-tasks.yml';
const ID=/^atlas-[a-z0-9-]{1,64}$/;
function blocked(reason){throw Error('ATLAS_AUTONOMOUS_BRIDGE_BLOCKED: '+reason);}
export function validateBridgeConfig(config){
  if(config?.version!==1||typeof config.enabled!=='boolean'||
    typeof config.dispatch_enabled!=='boolean'||config.max_dispatches_per_utc_day!==1||
    config.approval_source!=='reviewed_task_registry_only')
    blocked('invalid policy config');
  return config;
}
function validTaskIssue(task,issue){
  return Number.isSafeInteger(task.issue_number)&&task.issue_number>0&&
    issue?.number===task.issue_number&&issue.state==='open'&&!issue.pull_request &&
    (issue.repository_url===API || issue.repository_url===undefined);
}
export function decideBridge({config,registry,issues=[],pulls=[],pathsByPr={},
  attempted=[],budgetUsed=false,resultBranches=[],now=Date.now(),ciRuns=[]}={}){
  validateBridgeConfig(config);
  validateRegistry(registry);
  if(!config.enabled)return {status:'PAUSED',reason:'bridge disabled',model_calls:0};
  if(!registry.enabled)return {status:'PAUSED',reason:'Codex task registry disabled',model_calls:0};
  if(!Array.isArray(issues)||issues.length>=100||!Array.isArray(pulls)||pulls.length>=100)
    blocked('incomplete open Issue or PR inventory');
  if(!Array.isArray(ciRuns)||ciRuns.length>30)blocked('unbounded CI snapshot');
  const byIssue=new Map();
  for(const issue of issues){
    if(!Number.isSafeInteger(issue?.number)||byIssue.has(issue.number))
      blocked('bad or duplicate Issue inventory');
    byIssue.set(issue.number,issue);
  }
  const openPaths=new Set();
  for(const pr of pulls){
    if(!Number.isSafeInteger(pr?.number)||pr.number<1||
      pr.base?.ref!=='main'||!Number.isSafeInteger(pr.changed_files)||
      pr.changed_files<0||pr.changed_files>300||
      !Array.isArray(pathsByPr[pr.number])||
      pathsByPr[pr.number].length!==pr.changed_files)
      blocked('incomplete or foreign open PR files');
    for(const f of pathsByPr[pr.number]){
      if(typeof f?.filename!=='string'||!f.filename)blocked('malformed PR path');
      openPaths.add(f.filename);
      if(f.previous_filename)openPaths.add(f.previous_filename);
    }
  }
  const approved=registry.tasks.filter(t=>t.status==='approved'&&
    validTaskIssue(t,byIssue.get(t.issue_number)));
  if(!approved.length)return {status:'NO_APPROVED_ISSUE',reason:'no open Issue bound to approved registry task',model_calls:0,
    issue_count:issues.filter(x=>!x.pull_request).length,open_pr_count:pulls.length};
  const candidates=validateRegistry({...registry,tasks:approved});
  const decision=selectTask(candidates,{now,attempted,openPaths:[...openPaths],budgetUsed});
  if(!decision.task)return {status:'NO_ELIGIBLE_TASK',reason:decision.reason,model_calls:0,
    approved_issue_count:approved.length};
  if(resultBranches.includes(resultBranch(decision.task.id)))
    return {status:'DUPLICATE_RESULT',reason:'result branch already exists',model_calls:0};
  const recentFailures=ciRuns.filter(x=>x.conclusion==='failure').length;
  return {status:'APPROVED_READY',task_id:decision.task.id,issue_number:decision.task.issue_number,
    source_paths:[...decision.task.paths],recent_ci_failures_observed:recentFailures,
    can_dispatch:Boolean(config.dispatch_enabled),model_calls:0,
    reason:config.dispatch_enabled?'approved for bounded existing dispatcher':'dispatch feature gate disabled'};
}
export async function githubRequest(endpoint,{token,fetchImpl=globalThis.fetch,method='GET',body}={}){
  if(!token||typeof fetchImpl!=='function')blocked('authenticated GitHub transport required');
  const url=API+'/'+endpoint;
  const result=await fetchImpl(url,{method,redirect:'error',headers:{
    Authorization:'Bearer '+token,Accept:'application/vnd.github+json',
    'X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})
  },...(body?{body:JSON.stringify(body)}:{})});
  if(method==='POST'){
    if(result?.status!==204)blocked('workflow dispatch HTTP '+result?.status);
    return null;
  }
  if(result?.status===404&&endpoint.startsWith('git/ref/'))return null;
  if(result?.status!==200)blocked('GitHub GET HTTP '+result?.status+' '+endpoint.split('?')[0]);
  const boundedPrPage=/^pulls\/[1-9][0-9]*\/files\?per_page=100&page=[1-3]$/.test(endpoint);
  // Actions CI list is deliberately sampled (recent 30), never used for
  // approval or dispatch authority. Other inventory lists must be complete.
  const sampledCi=endpoint==='actions/runs?per_page=30';
  if(/rel="next"/.test(result.headers?.get?.('link')??'')&&!boundedPrPage&&!sampledCi)
    blocked('partial paginated evidence');
  return result.json();
}
// GitHub PRs can legitimately modify over 100 files. Examine the *whole* declared
// change set rather than blocking unrelated small tasks on a large Draft PR.
// Per-page link headers may say next, but a fixed 300-file ceiling and an exact
// independent GitHub changed_files total prevent silent partial evidence.
export async function completePrFiles(pr,github){
  if(!Number.isSafeInteger(pr?.number)||pr.number<1||
    !Number.isSafeInteger(pr.changed_files)||pr.changed_files<0||pr.changed_files>300)
    blocked('PR change count outside bounded inventory');
  if(pr.changed_files===0)return [];
  const out=[];
  for(let page=1;page<=Math.ceil(pr.changed_files/100);page++){
    const items=await github('pulls/'+pr.number+'/files?per_page=100&page='+page);
    if(!Array.isArray(items)||items.length>100)
      blocked('unexpected PR files page');
    out.push(...items);
    if(out.length>pr.changed_files)blocked('PR files exceed declared change count');
  }
  if(out.length!==pr.changed_files||
    out.some(f=>typeof f?.filename!=='string'||!f.filename)||
    new Set(out.map(f=>f.filename)).size!==out.length)
    blocked('PR change inventory incomplete or duplicated');
  return out;
}

// The GitHub pull-list API does NOT include changed_files. Always re-read each
// current open PR through GET /pulls/:number before bounding its file pages.
// Compare list and detail identity/head to prevent stale or partial conflict
// evidence from authorizing a model dispatch.
export async function detailedOpenPulls(summaries,github){
  if(!Array.isArray(summaries)||summaries.length>=100)
    blocked('incomplete open PR list');
  const seen=new Set(),full=[];
  for(const summary of summaries){
    if(!Number.isSafeInteger(summary?.number)||summary.number<1||
      seen.has(summary.number)||summary.state!=='open'||
      summary.base?.ref!=='main'||summary.base?.repo?.full_name!==REPOSITORY||
      !SHA.test(summary.head?.sha??''))
      blocked('invalid or changing PR list identity');
    seen.add(summary.number);
    const detail=await github('pulls/'+summary.number);
    if(detail?.number!==summary.number||detail.state!=='open'||
      detail.base?.ref!==summary.base.ref||
      detail.base?.repo?.full_name!==REPOSITORY||
      detail.head?.sha!==summary.head.sha||
      !Number.isSafeInteger(detail.changed_files)||
      detail.changed_files<0||detail.changed_files>300)
      blocked('incomplete or changed PR detail');
    full.push(detail);
  }
  return full;
}

export async function inspect({config,registry,github,now=Date.now(),expectedSha}={}){
  validateBridgeConfig(config);validateRegistry(registry);
  if(!config.enabled||!registry.enabled||!registry.tasks.some(t=>t.status==='approved'))
    return decideBridge({config,registry,now});
  if(!SHA.test(expectedSha||''))blocked('main checkout SHA required');
  const main=await github('branches/main');
  if(main?.commit?.sha!==expectedSha)blocked('main advanced or checkout mismatch');
  const [issues,pulls,runs]=await Promise.all([
    github('issues?state=open&per_page=100'),
    github('pulls?state=open&per_page=100'),
    github('actions/runs?per_page=30')
  ]);
  if(!Array.isArray(issues)||!Array.isArray(pulls)||!Array.isArray(runs?.workflow_runs))
    blocked('GitHub inventory schema');
  if(issues.length>=100||pulls.length>=100)blocked('incomplete open inventory');
  const detailedPulls=await detailedOpenPulls(pulls,github);
  const pathsByPr={};
  for(const pr of detailedPulls){
    pathsByPr[pr.number]=await completePrFiles(pr,github);
  }
  const approved=registry.tasks.filter(t=>t.status==='approved');
  const attempted=[],resultBranches=[];
  for(const t of approved){
    if(!ID.test(t.id))blocked('bad task id');
    if(await github('git/ref/heads/codex/task-attempt/'+t.id))attempted.push(t.id);
    if(await github('git/ref/heads/'+resultBranch(t.id)))resultBranches.push(resultBranch(t.id));
  }
  const budget=await github('git/ref/heads/codex/daily-attempt/'+new Date(now).toISOString().slice(0,10));
  return decideBridge({config,registry,issues,pulls:detailedPulls,pathsByPr,attempted,
    budgetUsed:!!budget,resultBranches,ciRuns:runs.workflow_runs,now});
}
export async function executeBridge({mode,config,registry,github,now=Date.now(),
    expectedSha,expectedTask='',token,fetchImpl=globalThis.fetch}={}){
  if(mode!=='audit'&&mode!=='dispatch')blocked('invalid operation');
  const result=await inspect({config,registry,github,now,expectedSha});
  if(mode==='audit'||result.status!=='APPROVED_READY'||!result.can_dispatch)
    return {...result,dispatched:false};
  if(!ID.test(expectedTask)||result.task_id!==expectedTask)
    blocked('plan/dispatched task mismatch');
  // The approved runner performs its own fresh inventory, atomic one-time task
  // receipt and UTC-day budget admission. This bridge does NOT consume credits,
  // create task refs, run model code, publish a PR or authorize any merge.
  await githubRequest('actions/workflows/'+WORKFLOW+'/dispatches',{
    token,fetchImpl,method:'POST',body:{ref:'main',inputs:{task_id:result.task_id}}
  });
  return {...result,status:'WORKFLOW_REQUESTED',dispatched:true,
    proof:'GitHub dispatch HTTP 204 only; not proof of Codex execution'};
}
function localSha(){
  const p=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8',timeout:5000});
  if(p.status!==0||!SHA.test(p.stdout.trim()))blocked('checkout git HEAD unavailable');
  return p.stdout.trim();
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  (async()=>{
    const [mode,expectedTask='']=process.argv.slice(2);
    if(!['audit','dispatch'].includes(mode)||process.argv.length>4)blocked('usage: bridge audit | dispatch TASK_ID');
    if(process.env.GITHUB_REPOSITORY!==REPOSITORY||
      process.env.GITHUB_REF!=='refs/heads/main'||
      process.env.GITHUB_RUN_ATTEMPT!=='1')blocked('untrusted workflow origin');
    const config=JSON.parse(fs.readFileSync('config/atlas-autonomous-loop.v1.json','utf8'));
    const registry=JSON.parse(fs.readFileSync('config/atlas-codex-tasks.v1.json','utf8'));
    const token=process.env.GH_TOKEN;
    const github=endpoint=>githubRequest(endpoint,{token});
    const result=await executeBridge({mode,config,registry,github,expectedTask,
      expectedSha:localSha(),token});
    console.log(JSON.stringify(result));
    if(process.env.GITHUB_OUTPUT){
      fs.appendFileSync(process.env.GITHUB_OUTPUT,'eligible='+(result.status==='APPROVED_READY'&&result.can_dispatch)+'\n');
      fs.appendFileSync(process.env.GITHUB_OUTPUT,'task_id='+(result.task_id||'')+'\n');
    }
  })().catch(e=>{console.error(e.message);process.exitCode=1});
}
