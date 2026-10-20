import {createPlanFromEvent, extractPatchComment} from './atlas-codex-patch-relay.mjs';

export const REPOSITORY = 'JezCH/atlas-person-db';
const SHA = /^[a-f0-9]{40}$/;
const ID = /^atlas-[a-z0-9-]{1,64}$/;
const SOURCE = /^scripts\/(?!atlas-codex-|apply-|deploy-|verify-vercel-resource-budget)[A-Za-z0-9_-]+\.mjs$/;
const TEST = /^tests\/(?!atlas-codex-)[A-Za-z0-9._-]+\.test\.mjs$/;
function requireValid(ok, message) { if (!ok) throw new Error('ATLAS_TASK_REJECTED: '+message); }
export function dayKey(now) { return new Date(now).toISOString().slice(0,10); }
export function taskRef(id) { return 'refs/heads/codex/task-attempt/'+id; }
export function budgetRef(now) { return 'refs/heads/codex/daily-attempt/'+dayKey(now); }
export function resultBranch(id) { return 'codex/task-result/'+id; }

export function validateRegistry(value) {
  requireValid(value?.version===1 && typeof value.enabled==='boolean', 'registry version/enabled');
  // This bounds development commands, not model tokens, credits or account spend.
  requireValid(value.max_commands_per_utc_day===1, 'daily command cap must be exactly one');
  requireValid(Array.isArray(value.tasks) && value.tasks.length<=100, 'task list');
  const ids=new Set(), launchers=new Set();
  for (const t of value.tasks) {
    requireValid(t && ID.test(t.id) && !ids.has(t.id), 'unique task id');ids.add(t.id);
    requireValid(['approved','hold','closed'].includes(t.status), 'task status');
    requireValid(Number.isSafeInteger(t.launcher_pr) && t.launcher_pr>0 && !launchers.has(t.launcher_pr), 'unique launcher');launchers.add(t.launcher_pr);
    requireValid(SHA.test(t.launcher_sha), 'launcher SHA');
    requireValid(Array.isArray(t.paths) && t.paths.length===2 && SOURCE.test(t.paths[0]) && TEST.test(t.paths[1]), 'offline source/test paths');
    requireValid(Number.isInteger(t.priority) && t.priority>=0 && t.priority<=100, 'priority');
    const start=Date.parse(t.not_before), end=Date.parse(t.expires_at);
    requireValid(Number.isFinite(start) && Number.isFinite(end) && end>start && end-start<=86400000, 'at most 24-hour task window');
    requireValid(typeof t.instructions==='string' && t.instructions.trim().length>0 && t.instructions.length<=8000, 'bounded instructions');
    requireValid(Array.isArray(t.snapshot_paths) && t.snapshot_paths.length<=20 && t.paths.every(p=>t.snapshot_paths.includes(p)) && ['AGENTS.md','WORK_EXECUTION.md'].every(p=>t.snapshot_paths.includes(p)), 'snapshot targets/policy');
    requireValid(t.snapshot_paths.every(p=>typeof p==='string' && /^[A-Za-z0-9._/-]+$/.test(p) && !p.startsWith('/') && !p.split('/').some(x=>x==='..'||x==='.'||!x)), 'snapshot paths');
  }
  return value;
}

export function selectTask(registry, {now=Date.now(), attempted=[], openPaths=[], budgetUsed=false, requestedId=''}={}) {
  validateRegistry(registry);
  if (!registry.enabled) return {task:null, reason:'disabled'};
  if (budgetUsed) return {task:null, reason:'daily budget consumed'};
  const attempts=new Set(attempted), conflicts=new Set(openPaths);
  const task=registry.tasks.filter(t=>!requestedId || t.id===requestedId)
    .filter(t=>t.status==='approved' && Date.parse(t.not_before)<=now && now<=Date.parse(t.expires_at))
    .filter(t=>!attempts.has(t.id) && !t.paths.some(p=>conflicts.has(p)))
    .sort((a,b)=>a.priority-b.priority || a.id.localeCompare(b.id))[0];
  return {task:task || null, reason:task?'selected':'no eligible nonconflicting task'};
}

export function policyForEvent(registry, event, now=Date.now()) {
  validateRegistry(registry);
  requireValid(registry.enabled, 'disabled');
  const payload=extractPatchComment(event?.comment?.body);
  const t=registry.tasks.find(x=>x.id===payload?.task_id);
  requireValid(t?.status==='approved', 'task not approved');
  const plan=createPlanFromEvent(event,t);
  const created=Date.parse(event.comment.created_at);
  requireValid(Number.isFinite(now) && now>=Date.parse(t.not_before) && now<=Date.parse(t.expires_at) &&
    created>=Date.parse(t.not_before) && created<=now && now-created<=1800000, 'expired or invalid receipt');
  return {task:t, plan};
}

// Create-only refs are atomic admission records. Never delete them on failure.
// Losing either claim consumes that admission; uncertainty must not cause POST retry.
export function claimDispatch(createRef, task, base, now=Date.now()) {
  requireValid(ID.test(task.id) && SHA.test(base), 'claim task/base');
  createRef(taskRef(task.id),base);
  createRef(budgetRef(now),base);
  return {task_ref:taskRef(task.id), budget_ref:budgetRef(now), base_sha:base};
}
