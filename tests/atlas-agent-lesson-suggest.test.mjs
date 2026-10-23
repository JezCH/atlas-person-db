import test from 'node:test';
import assert from 'node:assert/strict';
import {draftExperienceLesson,draftFromPullRequest} from '../scripts/atlas-agent-lesson-suggest.mjs';
const sha='a'.repeat(40);
const candidate={version:1,status:'candidate',pr_number:2588,merge_commit_sha:sha,
  merged_at:'2026-10-21T12:37:55Z',
  title:'reject impossible publication dates',
  source_paths:['server/atlas-source-service.js'],
  test_paths:['tests/atlas-source-publication-date.test.mjs'],
  root_cause_claim:'Regex only checks ISO date formatting.',
  remedy_claim:'Check Gregorian month lengths before any DB query.',
  evidence_url:'https://github.com/JezCH/atlas-person-db/pull/2588'};
test('real merged code fix yields a nonauthoritative proposed experience and exact provenance',()=>{
  const x=draftExperienceLesson(candidate);
  assert.equal(x.status,'review_required');
  assert.deepEqual(x.reason_codes,[]);
  assert.equal(x.proposed.status,'candidate');
  assert.equal(x.proposed.scope,'server/atlas-source-service.js');
  assert.match(x.proposed.lesson,/Gregorian month lengths/);
  assert.match(x.proposed.evidence,/Merged PR #2588/);
});
test('missing scholarly/code justification cannot self-promote a rule',()=>{
  const x=draftExperienceLesson({...candidate,root_cause_claim:null});
  assert.equal(x.proposed,null);
  assert.deepEqual(x.reason_codes,['missing_explicit_root_cause']);
  const y=draftExperienceLesson({...candidate,source_paths:['server/a.js','server/b.js']});
  assert.equal(y.proposed,null);
  assert.deepEqual(y.reason_codes,['multiple_source_paths_require_explicit_scope']);
  assert.throws(()=>draftExperienceLesson({...candidate,merge_commit_sha:'unverified'}),/BAD_EVIDENCE/);
});
test('live GitHub read uses bounded fixed GET endpoints and never posts',async()=>{
  const calls=[];
  const pr={number:2588,merged:true,merge_commit_sha:sha,merged_at:candidate.merged_at,
    title:'fix(source): reject impossible publication dates',
    body:'## Root cause\nRegex only checks ISO date formatting.\n\n## Fix\nCheck Gregorian month lengths before any DB query.',
    base:{ref:'main',repo:{full_name:'JezCH/atlas-person-db'}}};
  const files=[{filename:candidate.source_paths[0]},{filename:candidate.test_paths[0]}];
  const fetchImpl=async(url,opts)=>{
    calls.push({url,method:opts.method});
    return {status:200,headers:{get:()=>''},json:async()=>url.endsWith('/pulls/2588')?pr:files};
  };
  const x=await draftFromPullRequest({number:2588,token:'fixture',fetchImpl});
  assert.equal(x.proposed.status,'candidate');
  assert.deepEqual(calls.map(z=>z.method),['GET','GET']);
  assert.deepEqual(calls.map(z=>z.url),[
    'https://api.github.com/repos/JezCH/atlas-person-db/pulls/2588',
    'https://api.github.com/repos/JezCH/atlas-person-db/pulls/2588/files?per_page=100']);
});
test('unmerged PR and page truncation never create a proposed verified lesson',async()=>{
  const pr={number:2588,merged:false,base:{ref:'main',repo:{full_name:'JezCH/atlas-person-db'}}};
  let reads=0;
  const f=async()=>{reads++;return {status:200,headers:{get:()=>''},json:async()=>pr}};
  assert.equal((await draftFromPullRequest({number:2588,fetchImpl:f})).status,'not_applicable');
  assert.equal(reads,1);
  await assert.rejects(()=>draftFromPullRequest({number:0,fetchImpl:f}),/PR_NUMBER/);
});
