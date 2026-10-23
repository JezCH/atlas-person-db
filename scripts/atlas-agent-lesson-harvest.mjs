import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const REPO='JezCH/atlas-person-db';
const API='https://api.github.com/repos/'+REPO;
const SHA=/^[0-9a-f]{40}$/;
function fail(reason){throw Error('ATLAS_LESSON_HARVEST_BLOCKED: '+reason);}
function clean(value,max=240){
  return String(value??'').replace(/<[^>]*>/g,' ').replace(/[\u0000-\u001f\u007f]/g,' ')
    .replace(/@/g,'@\u200b').replace(/[\u0060|]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
}
function section(body,names){
  const lines=String(body??'').slice(0,30000).split(/\r?\n/);
  const match=new RegExp('^#{2,5}\\s*(?:'+names.join('|')+')\\s*:?\\s*$','i');
  let capture=false,found=[];
  for(const line of lines){
    if(/^#{1,5}\s+/.test(line)){
      if(capture)break;
      capture=match.test(line.trim());
    }else if(capture&&line.trim()){
      found.push(line.replace(/^\s*[-*]\s*/,''));
      if(found.join(' ').length>420)break;
    }
  }
  return clean(found.join(' '),320);
}
export function lessonCandidate(event,files){
  const pr=event?.pull_request;
  if(event?.action!=='closed'||event?.repository?.full_name!==REPO||
    pr?.merged!==true||pr?.base?.ref!=='main'||
    pr?.base?.repo?.full_name!==REPO||!Number.isSafeInteger(pr.number)||
    pr.number<1||!SHA.test(pr.merge_commit_sha??'')||!pr.merged_at)return null;
  const match=/^fix(?:\([a-z0-9._-]{1,45}\))?:\s*(.+)$/i.exec(pr.title??'');
  if(!match||!Array.isArray(files)||files.length>=100||files.length<2||
    !files.every(f=>f&&typeof f.filename==='string'))return null;
  const paths=files.map(f=>f.filename);
  const source=paths.filter(p=>/^(?:scripts|server|api)\/[^/].*\.(?:js|mjs|cjs|ts|tsx)$/.test(p)||
    /^atlas-[a-z0-9._-]+\.js$/.test(p));
  const tests=paths.filter(p=>/^tests\/[^/]+\.(?:test|spec)\.(?:mjs|js|cjs)$/.test(p));
  if(!source.length||!tests.length)return null;
  return {
    version:1,status:'candidate',id:'pr-'+pr.number+'-'+pr.merge_commit_sha.slice(0,12),
    pr_number:pr.number,merge_commit_sha:pr.merge_commit_sha,merged_at:pr.merged_at,
    title:clean(match[1],160),source_paths:source.slice(0,8),test_paths:tests.slice(0,8),
    root_cause_claim:section(pr.body,['root cause','failure mode','cause','원인','문제 원인'])||null,
    remedy_claim:section(pr.body,['fix','solution','changes','implementation','수정 내용','해결 방법'])||null,
    evidence_url:'https://github.com/'+REPO+'/pull/'+pr.number
  };
}
export function marker(candidate){
  return '<!-- ATLAS-EXPERIENCE-CANDIDATE-V1:'+candidate.pr_number+':'+candidate.merge_commit_sha+' -->';
}
export function candidateComment(c){
  const tick=String.fromCharCode(96);
  return [
    marker(c),
    '### ATLAS development experience candidate — not verified memory',
    'Automatically extracted from a merged fix PR. Explanatory text is author-supplied and unverified.',
    '- Change: '+c.title,
    '- Merged commit: '+c.merge_commit_sha,
    '- Source: '+c.source_paths.map(x=>tick+x+tick).join(', '),
    '- Regression tests: '+c.test_paths.map(x=>tick+x+tick).join(', '),
    '- Claimed root cause: '+(c.root_cause_claim||'Missing — verify before promotion'),
    '- Claimed remedy: '+(c.remedy_claim||'Missing — verify before promotion'),
    '- Review target: '+tick+'agent-memory/lessons.v1.json'+tick+' — independently confirm a reusable rule before promotion.',
    'Candidate only: no verified-memory mutation, Codex dispatch, Production, or merge authorization.'
  ].join('\n').slice(0,4000);
}
async function get(fetchImpl,token,endpoint){
  const res=await fetchImpl(API+endpoint,{method:'GET',redirect:'error',headers:{
    Accept:'application/vnd.github+json',Authorization:'Bearer '+token,
    'X-GitHub-Api-Version':'2022-11-28'}});
  if(res?.status!==200)fail('GET HTTP '+(res?.status??'unknown'));
  if(/rel="next"/.test(res.headers?.get?.('link')??''))fail('paginated evidence');
  return res.json();
}
export async function harvest({event,token,fetchImpl=globalThis.fetch}={}){
  if(event?.action!=='closed'||event?.pull_request?.merged!==true||
    event?.repository?.full_name!==REPO||event?.pull_request?.base?.ref!=='main')return {status:'ignored'};
  if(!token||typeof fetchImpl!=='function')fail('authorized GitHub token required');
  const n=event.pull_request.number;
  if(!Number.isSafeInteger(n)||n<1)fail('invalid PR number');
  const pr=await get(fetchImpl,token,'/pulls/'+n);
  if(pr.number!==n||pr.merged!==true||pr.merge_commit_sha!==event.pull_request.merge_commit_sha||
    pr.base?.ref!=='main'||pr.base?.repo?.full_name!==REPO)fail('live PR authority mismatch');
  const files=await get(fetchImpl,token,'/pulls/'+n+'/files?per_page=100');
  const c=lessonCandidate({...event,pull_request:pr},files);
  if(!c)return {status:'not_applicable'};
  const comments=await get(fetchImpl,token,'/issues/'+n+'/comments?per_page=100');
  if(!Array.isArray(comments)||comments.length>=100)fail('incomplete comments');
  if(comments.some(x=>typeof x.body==='string'&&x.body.includes(marker(c))))return {status:'already_captured',id:c.id};
  const res=await fetchImpl(API+'/issues/'+n+'/comments',{method:'POST',redirect:'error',
    headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,
      'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},
    body:JSON.stringify({body:candidateComment(c)})});
  if(res?.status!==201)fail('publication HTTP '+(res?.status??'unknown'));
  const posted=await res.json();
  return {status:'candidate_published',id:c.id,url:posted.html_url};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  harvest({event:JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH,'utf8')),token:process.env.GITHUB_TOKEN})
    .then(x=>console.log(JSON.stringify(x)))
    .catch(err=>{console.error(err.message);process.exitCode=1;});
}
