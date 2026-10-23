import test from 'node:test';
import assert from 'node:assert/strict';
import {lessonCandidate,marker,candidateComment,harvest} from '../scripts/atlas-agent-lesson-harvest.mjs';
const SHA='a'.repeat(40),REPO='JezCH/atlas-person-db';
const pr={number:77,merged:true,merge_commit_sha:SHA,merged_at:'2026-10-23T03:00:00Z',
  title:'fix(source): reject invalid bibliography dates',
  body:'## Root cause\nDate regex accepted February 30.\n\n## Fix\nValidate month and leap days before database writes.',
  base:{ref:'main',repo:{full_name:REPO}}};
const event={action:'closed',repository:{full_name:REPO},pull_request:pr};
const files=[{filename:'server/atlas-source-service.js'},{filename:'tests/atlas-source-publication-date.test.mjs'}];
const response=(body,status=200,link='')=>({status,headers:{get:k=>k==='link'?link:null},json:async()=>structuredClone(body)});
function mock(comments=[]){
  const calls=[],prefix='https://api.github.com/repos/'+REPO;
  async function fetchImpl(url,opts){
    assert.ok(url.startsWith(prefix));calls.push({url,opts});
    const route=url.slice(prefix.length);
    if(route==='/pulls/77'&&opts.method==='GET')return response(pr);
    if(route==='/pulls/77/files?per_page=100'&&opts.method==='GET')return response(files);
    if(route==='/issues/77/comments?per_page=100'&&opts.method==='GET')return response(comments);
    if(route==='/issues/77/comments'&&opts.method==='POST')
      return response({html_url:'https://github.com/'+REPO+'/pull/77#issuecomment-44'},201);
    throw Error('Unexpected '+route);
  }
  return {fetchImpl,calls};
}
test('only merged fix with code and regression tests produces an evidence candidate',()=>{
  const c=lessonCandidate(event,files);
  assert.equal(c.status,'candidate');assert.equal(c.pr_number,77);
  assert.equal(c.root_cause_claim,'Date regex accepted February 30.');
  assert.equal(c.remedy_claim,'Validate month and leap days before database writes.');
  assert.match(candidateComment(c),/not verified memory/);
  for(const e of [{...event,action:'opened'}, {...event,pull_request:{...pr,merged:false}},
    {...event,pull_request:{...pr,base:{ref:'dev',repo:{full_name:REPO}}}},
    {...event,pull_request:{...pr,title:'docs: unrelated'}}])assert.equal(lessonCandidate(e,files),null);
  assert.equal(lessonCandidate(event,[{filename:'docs/readme.md'},files[1]]),null);
});
test('capture creates one durable GitHub comment and never duplicates its marker',async()=>{
  const h=mock();
  assert.equal((await harvest({event,token:'fixture',fetchImpl:h.fetchImpl})).status,'candidate_published');
  const posts=h.calls.filter(x=>x.opts.method==='POST');
  assert.equal(posts.length,1);
  assert.match(JSON.parse(posts[0].opts.body).body,/ATLAS-EXPERIENCE-CANDIDATE-V1:77/);
  const h2=mock([{body:marker(lessonCandidate(event,files))}]);
  assert.equal((await harvest({event,token:'fixture',fetchImpl:h2.fetchImpl})).status,'already_captured');
  assert.equal(h2.calls.filter(x=>x.opts.method==='POST').length,0);
});
test('nonmerge/wrong-base events use no GitHub API',async()=>{
  const h=mock();
  for(const e of [{...event,action:'opened'}, {...event,pull_request:{...pr,merged:false}},
    {...event,pull_request:{...pr,base:{ref:'dev'}}}])
    assert.equal((await harvest({event:e,token:'fixture',fetchImpl:h.fetchImpl})).status,'ignored');
  assert.equal(h.calls.length,0);
});
test('untrusted descriptions are inert data; missing GitHub evidence fails closed',async()=>{
  const e={...event,pull_request:{...pr,body:'## Root cause\n@everyone <script>alert(1)</script>\n## Fix\nDo not execute code.'}};
  const comment=candidateComment(lessonCandidate(e,files));
  assert.doesNotMatch(comment,/<script>|@everyone/);
  assert.match(comment,/@\u200beveryone/);
  const h=mock();
  const failFetch=(u,o)=>u.includes('/files?')?Promise.resolve(response({},403)):h.fetchImpl(u,o);
  await assert.rejects(()=>harvest({event,token:'fixture',fetchImpl:failFetch}),/HTTP 403/);
  assert.equal(h.calls.filter(x=>x.opts.method==='POST').length,0);
});
