import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {validateRegistry, resultBranch} from './atlas-codex-task-policy.mjs';

const REPOSITORY='JezCH/atlas-person-db';
const SHA=/^[a-f0-9]{40}$/;
const RUN_URL=/^https:\/\/github\.com\/JezCH\/atlas-person-db\/actions\/runs\/[1-9][0-9]*$/;
function valid(ok,what){if(!ok)throw Error('ATLAS_WORK_MANAGER_BLOCKED: '+what);}
function identicalPaths(actual,expected){
  return Array.isArray(actual)&&actual.length===expected.length&&
    actual.every(x=>typeof x==='string')&&
    JSON.stringify([...new Set(actual)].sort())===JSON.stringify([...expected].sort());
}

// Read-only decision over a freshly obtained GitHub snapshot.
// This cannot approve a task, consume model credits, create refs, deploy or merge.
export function triage(snapshot,now=Date.now()){
  valid(snapshot&&typeof snapshot==='object'&&snapshot.version===1,'snapshot/version');
  valid(snapshot.repository===REPOSITORY&&SHA.test(snapshot.main_sha),'repository/main');
  valid(typeof snapshot.observed_at==='string','observed_at missing');
  const seen=Date.parse(snapshot.observed_at);
  valid(Number.isFinite(seen)&&seen<=now&&now-seen<=15*60*1000,'stale or future GitHub snapshot');
  const registry=validateRegistry(snapshot.registry);
  valid(registry.enabled===false,'runner must remain disabled during triage');
  valid(Array.isArray(snapshot.pulls)&&snapshot.pulls.length<100,'incomplete/unbounded open PR inventory');
  const numbers=new Set();
  for(const pr of snapshot.pulls){
    valid(Number.isSafeInteger(pr?.number)&&pr.number>0&&!numbers.has(pr.number),'bad/duplicate open PR');
    numbers.add(pr.number);
    valid(typeof pr.draft==='boolean'&&typeof pr.head_ref==='string'&&SHA.test(pr.head_sha)&&pr.base_branch==='main','malformed PR');
  }
  const codex=snapshot.pulls.filter(pr=>pr.head_ref.startsWith('codex/task-result/')).sort((a,b)=>a.number-b.number);
  for(const pr of codex){
    const task=registry.tasks.find(t=>resultBranch(t.id)===pr.head_ref);
    if(!task||task.status!=='closed'||!pr.draft||!identicalPaths(pr.changed_paths,task.paths)){
      return {decision:'BLOCKED',reason:'unverified Codex result requires human inspection',pr_number:pr.number,model_calls:0};
    }
    if(!RUN_URL.test(pr.integrity_run_url??'')){
      return {decision:'BLOCKED',reason:'missing authenticated CI evidence',pr_number:pr.number,model_calls:0};
    }
    if(pr.integrity_conclusion!=='success'){
      return {decision:'INSPECT_CI',reason:'CI is not proven successful',pr_number:pr.number,ci:pr.integrity_conclusion??'unknown',model_calls:0};
    }
    return {decision:'REVIEW_DRAFT',reason:'existing Codex result takes priority over new model work',
      pr_number:pr.number,task_id:task.id,head_sha:pr.head_sha,main_sha:snapshot.main_sha,
      ci_run_url:pr.integrity_run_url,
      next_step:'Read diff and test evidence; check current main and overlaps; do not merge without independent review or deploy.',
      model_calls:0};
  }
  return {decision:'DISCOVER_OFFLINE_TASK',reason:'no currently open Codex result PR; seek one new source-backed isolated defect',
    next_step:'Work may propose a task and evidence but must not approve it, enable the runner, call Codex or claim zero credit spending.',
    model_calls:0};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    if(process.argv.length!==3)throw Error('usage: node scripts/atlas-work-manager-triage.mjs <fresh-github-snapshot.json>');
    console.log(JSON.stringify(triage(JSON.parse(fs.readFileSync(process.argv[2],'utf8'))),null,2));
  }catch(err){console.error(err.message);process.exitCode=1;}
}
