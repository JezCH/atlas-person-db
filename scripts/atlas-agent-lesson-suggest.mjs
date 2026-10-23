import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {lessonCandidate} from './atlas-agent-lesson-harvest.mjs';

const REPO='JezCH/atlas-person-db';
const API='https://api.github.com/repos/'+REPO;
const SHA=/^[0-9a-f]{40}$/;
const STOP=new Set(['this','that','with','when','from','before','after','should','would','source',
  'script','review','verified','code','test','tests','fix','change','issue','invalid','database','model']);
function keywords(candidate){
  const src=[candidate.title||'',candidate.root_cause_claim||'',candidate.remedy_claim||'',
    ...candidate.source_paths.map(x=>path.posix.basename(x))].join(' ').toLowerCase();
  return [...new Set((src.match(/[a-z][a-z0-9]{2,}/g)||[])
    .filter(x=>!STOP.has(x)))].slice(0,9);
}
function safeText(value){
  return String(value||'').replace(/[\u0000-\u001f\u007f]/g,' ')
    .replace(/\s+/g,' ').trim().slice(0,320);
}
export function draftExperienceLesson(candidate){
  if(!candidate||candidate.version!==1||candidate.status!=='candidate'||
    !Number.isSafeInteger(candidate.pr_number)||candidate.pr_number<1||
    !SHA.test(candidate.merge_commit_sha||'')||
    !Array.isArray(candidate.source_paths)||!candidate.source_paths.length||
    !Array.isArray(candidate.test_paths)||!candidate.test_paths.length)
    throw Error('ATLAS_LESSON_DRAFT_BAD_EVIDENCE');
  const causes=[];
  if(candidate.source_paths.length!==1)causes.push('multiple_source_paths_require_explicit_scope');
  if(!candidate.root_cause_claim)causes.push('missing_explicit_root_cause');
  if(!candidate.remedy_claim)causes.push('missing_explicit_remedy');
  const scope=candidate.source_paths.length===1?candidate.source_paths[0]:null;
  const cause=safeText(candidate.root_cause_claim),remedy=safeText(candidate.remedy_claim);
  const lesson=cause&&remedy?safeText('Failure mode: '+cause+' Remedy: '+remedy).slice(0,420):null;
  const evidence='Merged PR #'+candidate.pr_number+', main commit '+
    candidate.merge_commit_sha+' ('+String(candidate.merged_at).slice(0,10)+')';
  return {
    status:'review_required',
    reason_codes:causes,
    provenance:{url:candidate.evidence_url,merged_commit:candidate.merge_commit_sha,
      changed_source_paths:candidate.source_paths,changed_test_paths:candidate.test_paths},
    proposed:scope&&lesson?{
      id:'review-pr-'+candidate.pr_number,
      status:'candidate',scope,keywords:keywords(candidate),lesson,evidence
    }:null,
    next_action:'Independently inspect actual changed source and regression tests, edit/generalize the rule, then use a separate reviewed commit to mark verified. This script NEVER writes memory.'
  };
}
async function get(fetchImpl,token,url){
  const headers={Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
  if(token)headers.Authorization='Bearer '+token;
  const response=await fetchImpl(url,{method:'GET',redirect:'error',headers});
  if(response?.status!==200)throw Error('ATLAS_LESSON_DRAFT_HTTP_'+response?.status);
  if(/rel="next"/.test(response.headers?.get?.('link')??''))
    throw Error('ATLAS_LESSON_DRAFT_INCOMPLETE_PAGES');
  return response.json();
}
export async function draftFromPullRequest({number,token,fetchImpl=globalThis.fetch}={}){
  if(!Number.isSafeInteger(number)||number<1||number>1000000)throw Error('ATLAS_LESSON_DRAFT_PR_NUMBER');
  if(typeof fetchImpl!=='function')throw Error('ATLAS_LESSON_DRAFT_FETCH');
  const p=await get(fetchImpl,token,API+'/pulls/'+number);
  if(p.number!==number||p.merged!==true||p.base?.ref!=='main'||
    p.base?.repo?.full_name!==REPO||!SHA.test(p.merge_commit_sha||''))return {status:'not_applicable'};
  const files=await get(fetchImpl,token,API+'/pulls/'+number+'/files?per_page=100');
  const candidate=lessonCandidate({action:'closed',repository:{full_name:REPO},pull_request:p},files);
  return candidate?draftExperienceLesson(candidate):{status:'not_applicable'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const argv=process.argv.slice(2);
  if(argv.length!==2||argv[0]!=='--pr'||!/^[1-9][0-9]*$/.test(argv[1])){
    console.error('usage: node scripts/atlas-agent-lesson-suggest.mjs --pr 2588');
    process.exitCode=1;
  }else{
    draftFromPullRequest({number:Number(argv[1]),token:process.env.GITHUB_TOKEN})
      .then(x=>console.log(JSON.stringify(x,null,2)))
      .catch(e=>{console.error(e.message);process.exitCode=1});
  }
}
