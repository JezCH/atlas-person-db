import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {triage} from './atlas-work-manager-triage.mjs';
import {validateRegistry} from './atlas-codex-task-policy.mjs';
import {extractPatchComment,validatePlan} from './atlas-codex-patch-relay.mjs';

const REPO='JezCH/atlas-person-db';
const API='https://api.github.com/repos/'+REPO;
const SHA=/^[a-f0-9]{40}$/;
const BOT_ID=199175422;
const BOT_LOGIN='chatgpt-codex-connector[bot]';
const resultLike=ref=>/^codex\/(?:task-result\/|relay-|[a-z0-9-]*result[-/])/.test(ref);
function guard(ok,why){if(!ok)throw Error('ATLAS_WORK_MANAGER_LIVE_BLOCKED: '+why);}
function equalPaths(a,b){return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&
  new Set(a).size===a.length&&JSON.stringify([...a].sort())===JSON.stringify([...b].sort());}
function decodeFile(file){
  guard(file?.encoding==='base64'&&typeof file.content==='string'&&file.content.length<1000000,'GitHub content encoding/size');
  return Buffer.from(file.content.replace(/\s/g,''),'base64');
}
function sha256(bytes){return createHash('sha256').update(bytes).digest('hex');}

export async function scanLive({fetchImpl=globalThis.fetch,token='',now=Date.now()}={}){
  guard(typeof fetchImpl==='function'&&Number.isFinite(now),'runtime/clock');
  let calls=0;
  async function get(path) {
    guard(++calls<=35,'bounded GitHub REST request limit');
    guard(typeof path==='string'&&path.startsWith('/')&&!path.includes('..'),'safe GitHub API path');
    const headers={Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
    if(token)headers.Authorization='Bearer '+token;
    const response=await fetchImpl(API+path,{method:'GET',headers,redirect:'error'});
    guard(response?.ok===true,'GitHub API failure '+(response?.status??'unknown')+' on '+path.split('?')[0]);
    const link=response.headers?.get?.('link')??'';
    guard(!/(?:rel="next"|rel="last")/.test(link),'paginated GitHub result; incomplete inventory');
    return response.json();
  }
  const start=await get('/branches/main');
  const sha=start?.commit?.sha;
  guard(typeof sha==='string'&&SHA.test(sha),'main SHA');
  const regFile=await get('/contents/config/atlas-codex-tasks.v1.json?ref='+sha);
  const registry=validateRegistry(JSON.parse(decodeFile(regFile).toString('utf8')));
  guard(!registry.enabled,'unsafe active Codex task runner');
  const open=await get('/pulls?state=open&per_page=100');
  guard(Array.isArray(open)&&open.length<100,'open PR list incomplete');
  const pulls=[];
  for(const pr of open) {
    guard(Number.isSafeInteger(pr?.number)&&typeof pr?.head?.ref==='string'&&
      SHA.test(pr?.head?.sha)&&pr?.base?.ref==='main'&&typeof pr.draft==='boolean','PR metadata');
    const item={number:pr.number,draft:pr.draft,head_ref:pr.head.ref,head_sha:pr.head.sha,base_branch:'main'};
    if(resultLike(pr.head.ref)){
      guard(pr.head.repo?.full_name===REPO,'unexpected Codex result head repository');
      const files=await get('/pulls/'+pr.number+'/files?per_page=100');
      guard(Array.isArray(files)&&files.length<100&&files.every(f=>typeof f.filename==='string'),'changed-files inventory');
      item.changed_paths=files.map(f=>f.filename);
      const runs=await get('/actions/runs?head_sha='+pr.head.sha+'&per_page=100');
      guard(Array.isArray(runs?.workflow_runs)&&runs.workflow_runs.length<100,'Integrity runs inventory');
      const integrity=runs.workflow_runs.filter(x=>x.name==='ATLAS Integrity'&&x.head_sha===pr.head.sha)
        .sort((a,b)=>b.id-a.id)[0];
      if(integrity){
        item.integrity_run_url='https://github.com/'+REPO+'/actions/runs/'+integrity.id;
        item.integrity_head_sha=integrity.head_sha;
        item.integrity_conclusion=integrity.status==='completed'?integrity.conclusion:'in_progress';
      }
      const matches=registry.tasks.filter(t=>t.status==='closed'&&equalPaths(item.changed_paths,t.paths));
      if(matches.length===1) {
        const task=matches[0];
        const comments=await get('/issues/'+task.launcher_pr+'/comments?per_page=100');
        guard(Array.isArray(comments)&&comments.length<100,'launcher comments inventory');
        const bot=comments.filter(c=>c.user?.id===BOT_ID&&c.user?.login===BOT_LOGIN&&c.user?.type==='Bot'&&
          typeof c.body==='string'&&c.body.includes('ATLAS-CODEX-PATCH-V1'));
        guard(bot.length<=1,'ambiguous Codex App response');
        if(bot.length===1) {
          const plan=validatePlan(extractPatchComment(bot[0].body),{id:task.id,paths:task.paths});
          const launcher=await get('/pulls/'+task.launcher_pr);
          const claim=await get('/git/ref/heads/codex/task-attempt/'+task.id);
          guard(launcher?.head?.sha===task.launcher_sha&&claim?.object?.sha===plan.base_sha,
            'launcher/preimage claim mismatch');
          for(let i=0;i<task.paths.length;i++){
            const path=task.paths[i];
            const before=await get('/contents/'+path+'?ref='+plan.base_sha);
            const after=await get('/contents/'+path+'?ref='+pr.head.sha);
            guard(sha256(decodeFile(before))===plan.files[i].before_sha256 &&
              decodeFile(after).equals(Buffer.from(plan.files[i].after_base64,'base64')),
              'Codex patch bytes not equal committed source');
          }
          item.codex_evidence={
            task_id:task.id,launcher_pr:task.launcher_pr,launcher_sha:task.launcher_sha,
            app_comment_id:bot[0].id,app_comment_author_id:BOT_ID,
            app_comment_author_login:BOT_LOGIN,app_comment_launcher_pr:task.launcher_pr,
            app_comment_marker:'ATLAS-CODEX-PATCH-V1',app_comment_task_id:plan.task_id,
            patch_base_sha:plan.base_sha,attempt_ref_sha:claim.object.sha,
            result_head_sha:pr.head.sha,patch_paths:plan.files.map(f=>f.path)
          };
        }
      }
    }
    pulls.push(item);
  }
  const end=await get('/branches/main');
  guard(end?.commit?.sha===sha,'main moved during inventory');
  const snapshot={version:1,repository:REPO,main_sha:sha,
    observed_at:new Date(now).toISOString(),registry,pulls};
  const decision=triage(snapshot,now);
  return {main_sha:sha,open_pr_count:pulls.length,github_reads:calls,
    selected_pr:decision.pr_number??null,decision};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  scanLive({token:process.env.GITHUB_TOKEN||''}).then(r=>console.log(JSON.stringify(r,null,2)))
    .catch(e=>{console.error(e.message);process.exitCode=1;});
}
