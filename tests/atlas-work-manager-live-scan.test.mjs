import test from 'node:test';
import assert from 'node:assert/strict';
import {scanLive} from '../scripts/atlas-work-manager-live-scan.mjs';
const sha='a'.repeat(40),head='b'.repeat(40),now=Date.parse('2030-05-03T09:00:00Z');
const registry={version:1,enabled:false,max_commands_per_utc_day:1,tasks:[]};
const response=(body,status=200,link='')=>({ok:status>=200&&status<300,status,
  headers:{get:k=>k==='link'?link:null},json:async()=>structuredClone(body)});
function harness({prs=[],reg=registry,last=sha,overrides={}}={}){
  const calls=[],base='https://api.github.com/repos/JezCH/atlas-person-db';
  let seenMain=0;
  const get=async(url,options)=>{
    assert.ok(url.startsWith(base+'/'));assert.equal(options.method,'GET');
    calls.push({url,options});const path=url.slice(base.length);
    if(path in overrides)return overrides[path]();
    if(path==='/branches/main')return response({commit:{sha:++seenMain===1?sha:last}});
    if(path==='/contents/config/atlas-codex-tasks.v1.json?ref='+sha)
      return response({encoding:'base64',content:Buffer.from(JSON.stringify(reg)).toString('base64')});
    if(path==='/pulls?state=open&per_page=100')return response(prs);
    throw Error('UNMOCKED '+path);
  };
  return {get,calls};
}
const ordinary={number:99,draft:true,head:{ref:'feature/unrelated',sha},base:{ref:'main'}};
test('live collector reads current main/registry/open PRs via GET and never invokes models',async()=>{
  const h=harness({prs:[ordinary]});
  const v=await scanLive({fetchImpl:h.get,now});
  assert.equal(v.decision.decision,'DISCOVER_OFFLINE_TASK');
  assert.equal(v.open_pr_count,1);assert.equal(v.github_reads,4);
  assert.equal(v.decision.model_calls,0);
  assert.ok(h.calls.every(x=>x.options.method==='GET'));
});
test('historical relay pilot lacking canonical evidence is identified and BLOCKED',async()=>{
  const pilot={number:98,draft:true,
    head:{ref:'codex/relay-pilot-20261020',sha:head,repo:{full_name:'JezCH/atlas-person-db'}},
    base:{ref:'main'}};
  const h=harness({prs:[pilot],overrides:{
    '/pulls/98/files?per_page=100':()=>response([{filename:'scripts/different.mjs'}]),
    ['/actions/runs?head_sha='+head+'&per_page=100']:()=>response({workflow_runs:[]})
  }});
  const v=await scanLive({fetchImpl:h.get,now});
  assert.equal(v.decision.decision,'BLOCKED');assert.equal(v.selected_pr,98);
});
test('main changes during scan and unknown paginated open PR list fail closed',async()=>{
  const stale=harness({prs:[ordinary],last:head});
  await assert.rejects(()=>scanLive({fetchImpl:stale.get,now}),/main moved/);
  const paginated=harness({overrides:{
    '/pulls?state=open&per_page=100':()=>response([ordinary],200,'<https://api.github.com/x>; rel="next"')
  }});
  await assert.rejects(()=>scanLive({fetchImpl:paginated.get,now}),/paginated/);
});
test('403, active registry, oversized inventory and foreign result branches fail closed',async()=>{
  const error=harness({overrides:{'/pulls?state=open&per_page=100':()=>response({},403)}});
  await assert.rejects(()=>scanLive({fetchImpl:error.get,now}),/GitHub API failure 403/);
  const active=harness({reg:{...registry,enabled:true}});
  await assert.rejects(()=>scanLive({fetchImpl:active.get,now}),/unsafe active/);
  const many=harness({prs:Array.from({length:100},(_,i)=>({...ordinary,number:100+i}))});
  await assert.rejects(()=>scanLive({fetchImpl:many.get,now}),/open PR list incomplete/);
  const foreign=harness({prs:[{number:42,draft:true,head:{ref:'codex/task-result/atlas-foreign',
    sha:head,repo:{full_name:'untrusted/fork'}},base:{ref:'main'}}]});
  await assert.rejects(()=>scanLive({fetchImpl:foreign.get,now}),/unexpected Codex/);
});
test('optional token is used only in fixed repository GET requests',async()=>{
  const h=harness({prs:[ordinary]});
  await scanLive({fetchImpl:h.get,token:'test-only',now});
  assert.ok(h.calls.every(x=>x.options.headers.Authorization==='Bearer test-only'&&
    x.url.startsWith('https://api.github.com/repos/JezCH/atlas-person-db/')));
});
