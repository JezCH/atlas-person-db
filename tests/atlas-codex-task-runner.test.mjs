import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';

const runner=fileURLToPath(new URL('../scripts/atlas-codex-task-runner.mjs',import.meta.url));
function exec(binary,args,cwd,env=process.env,input) {
  const r=spawnSync(binary,args,{cwd,env,input,encoding:'utf8'});
  assert.equal(r.status,0,r.stderr+'\n'+r.stdout);return r.stdout.trim();
}
function write(root,name,value) {const file=path.join(root,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,value);}
const fakeGh=`#!/usr/bin/env node
const fs=require('node:fs');
const args=process.argv.slice(2), statePath=process.env.FAKE_GH_STATE;
const s=JSON.parse(fs.readFileSync(statePath));
const method=args[args.indexOf('--method')+1], endpoint=args[args.indexOf('--method')+2].replace('repos/JezCH/atlas-person-db/','');
s.calls.push(method+' '+endpoint);
const body=args.includes('--input')?JSON.parse(fs.readFileSync(0,'utf8')):null;
let result, status=0;
if(method==='GET' && endpoint==='branches/main')result={commit:{sha:s.base}};
else if(method==='GET' && endpoint.startsWith('git/matching-refs/'))result=Object.entries(s.refs).map(([ref,sha])=>({ref,object:{sha}}));
else if(method==='GET' && endpoint.startsWith('git/ref/')){const ref='refs/'+endpoint.slice(8);if(s.refs[ref])result={ref,object:{sha:s.refs[ref]}};else status=404;}
else if(method==='POST' && endpoint==='git/refs'){if(s.refs[body.ref])status=422;else{s.refs[body.ref]=body.sha;result={ref:body.ref};}}
else if(method==='GET' && endpoint==='pulls/101')result={state:'open',draft:true,head:{sha:s.launcher}};
else if(method==='GET' && endpoint.startsWith('pulls?'))result=[{number:101}];
else if(method==='GET' && endpoint.startsWith('pulls/101/files?'))result=s.openFiles||[{filename:'docs/launcher.md'}];
else if(method==='GET' && endpoint.startsWith('contents/'))result={sha:s.blobs[endpoint.slice(9).split('?')[0]]};
else if(method==='POST' && endpoint==='issues/101/comments'){s.commands.push(body);result={id:987,html_url:'https://github.com/JezCH/atlas-person-db/pull/101#issuecomment-987',user:{login:'JezCH'}};}
else if(method==='POST' && endpoint==='pulls'){s.prs.push(body);result={number:102,draft:body.draft};}
else status=500;
fs.writeFileSync(statePath,JSON.stringify(s));
if(status){console.error('gh: rejected (HTTP '+status+')');process.exit(1);}
console.log(JSON.stringify(result));
`;

test('disabled CLI performs no API, claim, output-file creation or model submission',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'atlas-disabled-'));
  try {
    write(tmp,'config/atlas-codex-tasks.v1.json',JSON.stringify({version:1,enabled:false,max_commands_per_utc_day:1,tasks:[]}));
    const out=path.join(tmp,'must-not-exist.json');
    const stdout=exec(process.execPath,[runner,'prepare',out],tmp,{PATH:''});
    assert.match(stdout,/NO WORK: disabled/);assert.equal(fs.existsSync(out),false);
  } finally {fs.rmSync(tmp,{recursive:true,force:true});}
});

test('offline pipeline selects, claims, submits once, rejects artifact substitution, and publishes a Draft payload without executing model code with write credentials',()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'atlas-pipeline-'));
  try {
    const repo=path.join(tmp,'repo'), remote=path.join(tmp,'remote.git'), bin=path.join(tmp,'bin');
    fs.mkdirSync(repo);fs.mkdirSync(bin);write(bin,'gh',fakeGh);fs.chmodSync(path.join(bin,'gh'),0o755);
    exec('git',['init','-q','-b','main'],repo);
    exec('git',['config','user.name','Fixture'],repo);exec('git',['config','user.email','fixture@example.invalid'],repo);
    const before='export const answer = 1;\n', after='export const answer = 2;\n';
    const beforeTest="import test from 'node:test'; test('old',()=>{});\n";
    const afterTest="import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import {answer} from '../scripts/example.mjs'; if(process.env.PUBLISH_SENTINEL)fs.writeFileSync(process.env.PUBLISH_SENTINEL,'model code ran'); test('answer',()=>assert.equal(answer,2));\n";
    write(repo,'scripts/example.mjs',before);write(repo,'tests/example.test.mjs',beforeTest);
    write(repo,'AGENTS.md','Offline fixture policy\n');write(repo,'WORK_EXECUTION.md','No live services\n');
    exec('git',['add','.'],repo);exec('git',['commit','-qm','fixture snapshot'],repo);
    const launcher=exec('git',['rev-parse','HEAD'],repo), now=Date.now();
    const task={id:'atlas-offline-pipeline',status:'approved',priority:0,launcher_pr:101,launcher_sha:launcher,paths:['scripts/example.mjs','tests/example.test.mjs'],snapshot_paths:['scripts/example.mjs','tests/example.test.mjs','AGENTS.md','WORK_EXECUTION.md'],not_before:new Date(now-3600000).toISOString(),expires_at:new Date(now+3600000).toISOString(),instructions:'Fix fixture answer.'};
    const blobs=Object.fromEntries(task.snapshot_paths.map(p=>[p,exec('git',['hash-object',p],repo)]));
    write(repo,'config/atlas-codex-tasks.v1.json',JSON.stringify({version:1,enabled:true,max_commands_per_utc_day:1,tasks:[task]}));
    exec('git',['add','.'],repo);exec('git',['commit','-qm','fixture admission'],repo);
    const base=exec('git',['rev-parse','HEAD'],repo);
    exec('git',['init','--bare','-q',remote],tmp);exec('git',['remote','add','origin',remote],repo);exec('git',['push','-q','origin','main'],repo);
    const state=path.join(tmp,'state.json');fs.writeFileSync(state,JSON.stringify({base,launcher,blobs,refs:{},commands:[],prs:[],calls:[]}));
    const env={...process.env,PATH:bin+path.delimiter+process.env.PATH,FAKE_GH_STATE:state,GITHUB_REPOSITORY:'JezCH/atlas-person-db',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF:'refs/heads/main',GITHUB_RUN_ATTEMPT:'1',GITHUB_SHA:base,GITHUB_RUN_ID:'1',RUNNER_TEMP:tmp,GH_TOKEN:'fixture-only'};
    const prepared=path.join(tmp,'prepared.json');
    const renameState=JSON.parse(fs.readFileSync(state));
    renameState.openFiles=[{filename:'scripts/renamed.mjs',previous_filename:'scripts/example.mjs'}];
    fs.writeFileSync(state,JSON.stringify(renameState));
    assert.match(exec(process.execPath,[runner,'prepare',prepared],repo,env),/NO WORK/);
    assert.equal(fs.existsSync(prepared),false);
    const clearRename=JSON.parse(fs.readFileSync(state));delete clearRename.openFiles;
    fs.writeFileSync(state,JSON.stringify(clearRename));
    const approved={action:'created',repository:{full_name:'JezCH/atlas-person-db'},issue:{number:101,pull_request:{}},
      comment:{id:501,user:{id:281085255,login:'JezCH',type:'User'},body:'ATLAS-CODEX-RUN-V1\\natlas-offline-pipeline\\nEND-ATLAS-CODEX-RUN-V1'}};
    const trigger=path.join(tmp,'run-event.json');
    fs.writeFileSync(trigger,JSON.stringify(approved));
    const commentEnv={...env,GITHUB_EVENT_NAME:'issue_comment',GITHUB_EVENT_PATH:trigger};
    const unauthorized=structuredClone(approved);unauthorized.comment.user.id=0;
    fs.writeFileSync(trigger,JSON.stringify(unauthorized));
    const rejected=spawnSync(process.execPath,[runner,'prepare',prepared],{cwd:repo,env:commentEnv,encoding:'utf8'});
    assert.notEqual(rejected.status,0);assert.match(rejected.stderr,/run comment GitHub author/);
    assert.equal(fs.existsSync(prepared),false);
    assert.equal(Object.keys(JSON.parse(fs.readFileSync(state)).refs).length,0);
    fs.writeFileSync(trigger,JSON.stringify(approved));
    exec(process.execPath,[runner,'prepare',prepared],repo,commentEnv);
    exec(process.execPath,[runner,'claim',prepared],repo,commentEnv);
    const beforeSubmit=JSON.parse(fs.readFileSync(state)).calls.length;
    exec(process.execPath,[runner,'submit',prepared],repo,commentEnv);
    let s=JSON.parse(fs.readFileSync(state));
    assert.equal(s.commands.length,1);
    assert.deepEqual(s.calls.slice(beforeSubmit),['POST issues/101/comments']); // PAT needs no Contents reads
    const retry=spawnSync(process.execPath,[runner,'claim',prepared],{cwd:repo,env:commentEnv,encoding:'utf8'});
    assert.notEqual(retry.status,0);assert.equal(JSON.parse(fs.readFileSync(state)).commands.length,1);
    function hash(value){return crypto.createHash('sha256').update(value).digest('hex');}
    const plan={version:1,task_id:task.id,base_sha:base,files:task.paths.map((p,i)=>({path:p,before_sha256:hash(i?beforeTest:before),after_base64:Buffer.from(i?afterTest:after).toString('base64')}))};
    const event={action:'created',repository:{full_name:'JezCH/atlas-person-db'},issue:{number:101,pull_request:{}},comment:{id:988,user:{login:'chatgpt-codex-connector[bot]',type:'Bot',id:199175422},created_at:new Date().toISOString(),body:'ATLAS-CODEX-PATCH-V1\n'+JSON.stringify(plan)+'\nEND-ATLAS-CODEX-PATCH-V1'}};
    const eventFile=path.join(tmp,'event.json'), artifact=path.join(tmp,'artifact.json');fs.writeFileSync(eventFile,JSON.stringify(event));
    exec(process.execPath,[runner,'receive',eventFile,artifact],repo,env);
    const publisher=path.join(tmp,'publisher');exec('git',['clone','-q','--branch','main',remote,publisher],tmp);
    const corrupted=structuredClone(plan);corrupted.files[0].after_base64=Buffer.from('export const answer = 999;\n').toString('base64');
    const badFile=path.join(tmp,'corrupted.json');fs.writeFileSync(badFile,JSON.stringify(corrupted));
    const sentinel=path.join(tmp,'unsafe-execution');const publishEnv={...env,PUBLISH_SENTINEL:sentinel};
    const attack=spawnSync(process.execPath,[runner,'publish',eventFile,badFile],{cwd:publisher,env:publishEnv,encoding:'utf8'});
    assert.notEqual(attack.status,0);assert.match(attack.stderr,/artifact differs/);
    assert.equal(exec('git',['status','--porcelain'],publisher),'');
    exec(process.execPath,[runner,'publish',eventFile,artifact],publisher,publishEnv);
    assert.equal(fs.existsSync(sentinel),false);
    const pr=JSON.parse(fs.readFileSync(path.join(tmp,'pr.json')));assert.equal(pr.draft,true);assert.equal(pr.base,'main');
    assert.equal(exec('git',['--git-dir',remote,'show','refs/heads/'+pr.head+':scripts/example.mjs'],tmp),after.trim());
    exec('gh',['api','--method','POST','repos/JezCH/atlas-person-db/pulls','--input','-'],publisher,env,JSON.stringify(pr));
    s=JSON.parse(fs.readFileSync(state));assert.equal(s.commands.length,1);assert.equal(s.prs.length,1);
  } finally {fs.rmSync(tmp,{recursive:true,force:true});}
});
