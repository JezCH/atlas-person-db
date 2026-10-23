import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {applyPlan, verifyPlanFromEvent} from './atlas-codex-patch-relay.mjs';
import {renderTaskLessons} from './atlas-agent-experience.mjs';
import {validateRegistry, selectTask, policyForEvent, claimDispatch, authorizedRunComment, dayKey, taskRef, budgetRef, resultBranch, REPOSITORY} from './atlas-codex-task-policy.mjs';

const REGISTRY = 'config/atlas-codex-tasks.v1.json';
function fail(message) {throw new Error('ATLAS_TASK_BLOCKED: '+message);}
function command(binary,args,input) {
  const r=spawnSync(binary,args,{input,encoding:'utf8',maxBuffer:8*1024*1024});
  if(r.status!==0) {
    const error=new Error('ATLAS_TASK_BLOCKED: '+binary+' command failed');
    error.http=Number((r.stderr||'').match(/HTTP (\d{3})/)?.[1]||0);throw error;
  }
  return r.stdout.trim();
}
function git(...args) {return command('git',args);}
function api(method,endpoint,payload,missing=false) {
  try {return JSON.parse(command('gh',['api','--method',method,'repos/'+REPOSITORY+'/'+endpoint,...(payload?['--input','-']:[])],payload?JSON.stringify(payload):undefined));}
  catch(e) {if(missing && method==='GET' && e.http===404)return null;throw e;}
}
function pages(endpoint,maxPages) {
  const result=[];
  for(let page=1;page<=maxPages;page++) {
    const items=api('GET',endpoint+(endpoint.includes('?')?'&':'?')+'per_page=100&page='+page);
    if(!Array.isArray(items))fail('unexpected paginated response');
    result.push(...items);if(items.length<100)return result;
  }
  fail('bounded GitHub inventory limit exceeded');
}
function registry() {return validateRegistry(JSON.parse(fs.readFileSync(REGISTRY,'utf8')));}
function output(name,value) {if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,name+'='+value+'\n');}
function save(file,value) {fs.writeFileSync(file,JSON.stringify(value)+'\n',{flag:'wx',mode:0o600});}
function refSha(ref) {return api('GET','git/ref/'+ref.replace(/^refs\//,''),undefined,true)?.object?.sha;}
function mainSha() {return api('GET','branches/main').commit.sha;}
function openPaths() {
  const paths=[];
  for(const pr of pages('pulls?state=open',2)) {
    paths.push(...pages('pulls/'+pr.number+'/files',30).flatMap(f=>[f.filename,f.previous_filename].filter(Boolean)));
    if(paths.length>5000)fail('bounded open-path inventory exceeded');
  }
  return paths;
}
function trustedRun() {
  if(process.env.GITHUB_REPOSITORY!==REPOSITORY || process.env.GITHUB_REF!=='refs/heads/main' || process.env.GITHUB_RUN_ATTEMPT!=='1')fail('trusted main and first attempt required');
  const base=git('rev-parse','HEAD');
  if(base!==process.env.GITHUB_SHA || mainSha()!==base)fail('main advanced');
  return base;
}
function dispatchRequest() {
  if(process.env.GITHUB_EVENT_NAME==='workflow_dispatch')return {requestedId:process.env.TASK_ID||'',launcherPr:null};
  if(process.env.GITHUB_EVENT_NAME==='issue_comment') {
    if(!process.env.GITHUB_EVENT_PATH)fail('comment event path missing');
    const cmd=authorizedRunComment(JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH,'utf8')));
    if(process.env.TASK_ID)fail('unexpected workflow input on comment trigger');
    return {requestedId:cmd.task_id,launcherPr:cmd.launcher_pr};
  }
  fail('unapproved dispatch event');
}
function checkRequestedTask(request,task) {
  if(request.requestedId && request.requestedId!==task.id)fail('comment task mismatch');
  if(request.launcherPr!==null && request.launcherPr!==task.launcher_pr)fail('comment launcher mismatch');
}
function activeTask(r,id,now) {
  const selection=selectTask(r,{now,requestedId:id});
  if(!selection.task)fail(selection.reason);return selection.task;
}
function verifyClaims(task,base,now=Date.now()) {
  if(refSha(taskRef(task.id))!==base)fail('task receipt mismatch');
  // A response just after UTC midnight may belong to yesterday's admission.
  if(![now,now-86400000].some(t=>refSha(budgetRef(t))===base))fail('daily admission receipt missing');
}
// Deterministic, advisory tools in the approved local launcher snapshot.
// No new model/API request, external fetch, mutation or task authorization.
export function taskCapabilityHints(task) {
  const paths=Array.isArray(task?.paths)?task.paths:[];
  const description=String(task?.id||'')+' '+String(task?.instructions||'')+' '+paths.join(' ');
  const choose=[
    ['atlas-temporal-evidence',/chronolog|year|bce|reign|period|activity|timeline|연도|연대|통치기간/i],
    ['atlas-person-identity',/person|homonym|alias|registration|인물|동명이인|등록/i],
    ['atlas-polity-identity',/polity|retire|tombstone|political|정치체|퇴역/i],
    ['atlas-source-provenance',/bibliograph|source|provenance|citation|evidence|사료|출처/i],
    ['atlas-experience-reuse',/regress|fix|repair|bug|defect|failure|재발|오류|수정/i]
  ].filter(([,re])=>re.test(description)).slice(0,3).map(([name])=>'skills/'+name+'/SKILL.md');
  const target=paths.find(p=>/^(?:scripts|server|api)\/[a-zA-Z0-9._/-]+\.(?:js|mjs|cjs)$/.test(p)&&!p.includes('..'));
  const graph=target?
    'If present locally, run node scripts/atlas-agent-dependency-map.mjs --path '+target+
    ' to identify static direct importers and affected-test candidates before changing source. '+
    'The map is NOT an AST, permission to edit other paths, or proof of runtime callers.\\n':'';
  const skills=choose.length?'If present locally, consult only matching Agent Skills: '+choose.join(', ')+
    '. They are advisory, not authority over the exact approved task.\\n':'';
  return graph||skills?'\\n\\nATLAS scoped capability hints (local optional tools, no network):\\n'+graph+skills:'';
}

function prompt(task,base) {
  const hashes=task.paths.map(p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'));
  const files=task.paths.map((p,i)=>({path:p,before_sha256:hashes[i],after_base64:'<complete tested file in canonical base64>'}));
  return '@codex '+task.id+' — one bounded development task, not a review. Actions run '+process.env.GITHUB_RUN_ID+'.\n\n'+
    'Read local AGENTS.md and WORK_EXECUTION.md. Launcher HEAD must be '+task.launcher_sha+'. Dispatcher verified target, dependency and policy snapshot parity with main '+base+'. Do not fetch. Verify local SHA256 before editing:\n'+
    task.paths.map((p,i)=>p+': '+hashes[i]).join('\n')+'\n\n'+task.instructions+renderTaskLessons(task)+taskCapabilityHints(task)+'\n\n'+
    'Edit exactly the two approved files; demonstrate red then green and run node --test '+task.paths[1]+' and git diff --check. Do not commit/push the launcher or create a PR. On failure return BLOCKED or NO CHANGE without a payload. No child agents, retries, internet, credentials, paid API, Vercel/Production/Supabase/Sandbox, data mutation, deployment or merge.\n'+
    'Return exactly one actual tested complete-file payload in the App response. Use the verified target preimages and the dispatcher-verified base below; do not claim local HEAD equals main.\n\nATLAS-CODEX-PATCH-V1\n'+
    JSON.stringify({version:1,task_id:task.id,base_sha:base,files})+'\nEND-ATLAS-CODEX-PATCH-V1\n\n'+
    'Expires '+task.expires_at+'. No second call or resubmission. Stop after one response. Production NOT LIVE.';
}

export function run(mode,file,artifact) {
  const r=registry();
  if(mode==='prepare') {
    // A disabled queue must be a clean no-op, including no remote API reads.
    if(!r.enabled){output('selected','false');console.log('NO WORK: disabled');return;}
    const base=trustedRun(), now=Date.now(), request=dispatchRequest();
    const attempted=pages('git/matching-refs/heads/codex/task-attempt/',2).map(x=>x.ref.split('/').at(-1));
    const selected=selectTask(r,{now,attempted,openPaths:openPaths(),budgetUsed:Boolean(refSha(budgetRef(now))),requestedId:request.requestedId});
    if(!selected.task){output('selected','false');console.log('NO WORK: '+selected.reason);return;}
    const task=selected.task;checkRequestedTask(request,task);
    const launcher=api('GET','pulls/'+task.launcher_pr);
    if(launcher.state!=='open' || !launcher.draft || launcher.head.sha!==task.launcher_sha)fail('launcher mismatch');
    for(const p of task.snapshot_paths) {
      git('ls-files','--error-unmatch','--',p);
      const local=path.resolve(p);
      if(!fs.lstatSync(local).isFile() || fs.realpathSync(local)!==local)fail('snapshot symlink/non-file');
      if(api('GET','contents/'+p+'?ref='+task.launcher_sha).sha!==git('hash-object',p))fail('launcher snapshot mismatch');
    }
    save(file,{task_id:task.id,base_sha:base,day:dayKey(now),body:prompt(task,base)});
    output('selected','true');console.log('PREPARED: '+task.id);return;
  }
  if(mode==='claim' || mode==='submit') {
    const prepared=JSON.parse(fs.readFileSync(file,'utf8')), now=Date.now();
    const task=activeTask(r,prepared.task_id,now);
    checkRequestedTask(dispatchRequest(),task);
    // The PAT step only POSTs the command; it needs no new Contents permission.
    const base=mode==='claim'?trustedRun():git('rev-parse','HEAD');
    if(process.env.GITHUB_REPOSITORY!==REPOSITORY || process.env.GITHUB_REF!=='refs/heads/main' || process.env.GITHUB_RUN_ATTEMPT!=='1' || base!==process.env.GITHUB_SHA)fail('untrusted submit context');
    if(prepared.base_sha!==base || prepared.day!==dayKey(now) || prepared.body!==prompt(task,base))fail('stale dispatch preparation');
    if(mode==='claim') {
      claimDispatch((ref,sha)=>api('POST','git/refs',{ref,sha}),task,base,now);
      console.log('ADMITTED: '+task.id);return;
    }
    const result=api('POST','issues/'+task.launcher_pr+'/comments',{body:prepared.body});
    console.log(JSON.stringify({task:task.id,command_id:result.id,url:result.html_url,author:result.user?.login}));return;
  }
  const event=JSON.parse(fs.readFileSync(file,'utf8'));
  // Authoritative policy is read only from trusted main, never from an artifact.
  const {task,plan}=policyForEvent(r,event);
  verifyClaims(task,plan.base_sha);
  if(mode==='receive') {
    if(mainSha()!==plan.base_sha)fail('stale patch base');
    save(artifact,plan);
    applyPlan(plan,process.cwd(),{policy:task});
    // This mode runs only in the separate read-only/no-PAT validation job.
    command('node',['--test',task.paths[1]]);git('diff','--check');
    const changed=git('diff','--name-only').split('\n').sort();
    if(JSON.stringify(changed)!==JSON.stringify([...task.paths].sort()))fail('unexpected changed paths');
    console.log('VALIDATED: '+task.id);return;
  }
  if(mode!=='publish')fail('unknown mode');
  verifyPlanFromEvent(event,JSON.parse(fs.readFileSync(artifact,'utf8')),task);
  if(mainSha()!==plan.base_sha || git('rev-parse','HEAD')!==plan.base_sha)fail('stale publication base');
  const conflicts=new Set(openPaths());
  if(task.paths.some(p=>conflicts.has(p)))fail('open PR path conflict');
  const branch=resultBranch(task.id);
  if(refSha('refs/heads/'+branch))fail('result branch already exists; no duplicate publication');
  applyPlan(plan,process.cwd(),{policy:task});git('diff','--check');
  git('config','user.name','github-actions[bot]');git('config','user.email','41898282+github-actions[bot]@users.noreply.github.com');
  git('switch','-c',branch);git('add','--',...task.paths);git('commit','-m','fix: '+task.id+' (Codex draft only)');
  // Recheck the remote authority immediately before the shared branch write.
  if(mainSha()!==plan.base_sha)fail('main advanced before push');
  git('push','origin','HEAD:refs/heads/'+branch);
  save(path.join(process.env.RUNNER_TEMP,'pr.json'),{head:branch,base:'main',draft:true,title:'fix: '+task.id+' (review required)',body:'Codex task '+task.id+'; command receipt '+taskRef(task.id)+'; source App comment '+event.comment.id+'. Exact original-event patch verified; focused test PASS. Full CI/review required. No automatic merge. Production NOT LIVE.'});
  console.log('PUBLISHED BRANCH: '+branch);
}

if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {run(...process.argv.slice(2));}catch(e){console.error(e.message);process.exitCode=1;}
}
