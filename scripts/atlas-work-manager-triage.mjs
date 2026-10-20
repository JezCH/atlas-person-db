import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {validateRegistry} from './atlas-codex-task-policy.mjs';

const REPOSITORY='JezCH/atlas-person-db';
const SHA=/^[a-f0-9]{40}$/;
const RUN_URL=/^https:\/\/github\.com\/JezCH\/atlas-person-db\/actions\/runs\/[1-9][0-9]*$/;
const APP_ID=199175422;
const APP_LOGIN='chatgpt-codex-connector[bot]';
function valid(ok,what){if(!ok)throw Error('ATLAS_WORK_MANAGER_BLOCKED: '+what);}
function identicalPaths(actual,expected){
  return Array.isArray(actual)&&actual.length===expected.length&&
    actual.every(x=>typeof x==='string')&&
    JSON.stringify([...new Set(actual)].sort())===JSON.stringify([...expected].sort());
}

// PR branch or title is not proof of Codex origin. An inventory collector must
// inspect the actual bot comment and patch payload on the registered launcher PR,
// the immutable attempt ref and the result's GitHub source/test blobs. The fields
// below cross-check those separately observed facts before human review priority.
function verifiedCodexEvidence(pr,task) {
  const e=pr.codex_evidence;
  return e && e.task_id===task.id && e.launcher_pr===task.launcher_pr &&
    e.launcher_sha===task.launcher_sha &&
    Number.isSafeInteger(e.app_comment_id) && e.app_comment_id>0 &&
    e.app_comment_author_id===APP_ID && e.app_comment_author_login===APP_LOGIN &&
    e.app_comment_launcher_pr===task.launcher_pr &&
    e.app_comment_marker==='ATLAS-CODEX-PATCH-V1' &&
    e.app_comment_task_id===task.id &&
    SHA.test(e.patch_base_sha) && e.attempt_ref_sha===e.patch_base_sha &&
    e.result_head_sha===pr.head_sha &&
    identicalPaths(e.patch_paths,task.paths);
}
function looksLikeCodexResult(pr) {
  // Legacy branch patterns are only used to fail closed when evidence is missing,
  // never to grant verification or select a task.
  return pr.codex_evidence!=null || /^codex\/(?:task-result\/|relay-|[a-z0-9-]*result[-/])/.test(pr.head_ref);
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
  const codex=snapshot.pulls.filter(looksLikeCodexResult).sort((a,b)=>a.number-b.number);
  for(const pr of codex){
    const task=registry.tasks.find(t=>t.id===pr.codex_evidence?.task_id);
    if(!task || task.status!=='closed' || !pr.draft ||
      !identicalPaths(pr.changed_paths,task.paths) ||
      !verifiedCodexEvidence(pr,task)){
      return {decision:'BLOCKED',reason:'Codex result lacks independently checked bot/receipt/path evidence',
        pr_number:pr.number,model_calls:0};
    }
    if(!RUN_URL.test(pr.integrity_run_url??'') || pr.integrity_head_sha!==pr.head_sha){
      return {decision:'BLOCKED',reason:'missing or head-mismatched GitHub CI evidence',
        pr_number:pr.number,model_calls:0};
    }
    if(pr.integrity_conclusion!=='success'){
      return {decision:'INSPECT_CI',reason:'CI is not proven successful',pr_number:pr.number,
        ci:pr.integrity_conclusion??'unknown',model_calls:0};
    }
    return {decision:'REVIEW_DRAFT',reason:'verified Codex result precedes any new model task',
      pr_number:pr.number,task_id:task.id,head_sha:pr.head_sha,main_sha:snapshot.main_sha,
      app_comment_id:pr.codex_evidence.app_comment_id,ci_run_url:pr.integrity_run_url,
      next_step:'Independently inspect diff/current main, semantic conflicts and CI; human review is required before merge; no deployment claim.',
      model_calls:0};
  }
  return {decision:'DISCOVER_OFFLINE_TASK',reason:'no open verified Codex result awaiting review; investigate non-Codex work and new offline defects',
    next_step:'Work may propose a task and evidence but must not approve it, enable the runner, call Codex or claim zero credit spending.',
    model_calls:0};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  try{
    if(process.argv.length!==3)throw Error('usage: node scripts/atlas-work-manager-triage.mjs <fresh-github-snapshot.json>');
    console.log(JSON.stringify(triage(JSON.parse(fs.readFileSync(process.argv[2],'utf8'))),null,2));
  }catch(err){console.error(err.message);process.exitCode=1;}
}
