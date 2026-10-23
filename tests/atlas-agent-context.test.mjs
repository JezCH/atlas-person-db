import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildContext } from '../scripts/atlas-agent-context.mjs';
const run = (cwd, ...args) => {
  const r = spawnSync('git', args, {cwd, encoding:'utf8'});
  assert.equal(r.status, 0, r.stderr);
};
test('read-only targeted code graph and relevant verified experience', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'atlas-agent-context-'));
  t.after(() => fs.rmSync(root, {recursive:true, force:true}));
  run(root, 'init', '-q');
  for (const name of ['scripts', 'tests', 'skills/atlas-code-intelligence', 'skills/atlas-experience-reuse', 'agent-memory'])
    fs.mkdirSync(path.join(root,name), {recursive:true});
  fs.writeFileSync(path.join(root,'scripts','sample.mjs'), "import {value} from './helper.mjs';\nexport function rejectBooleanYear(y){ return typeof y==='boolean'; }\n");
  fs.writeFileSync(path.join(root,'scripts','helper.mjs'), 'export const value = 3;\n');
  fs.writeFileSync(path.join(root,'tests','sample.test.mjs'), 'test("rejectBooleanYear",()=>{});\n');
  fs.writeFileSync(path.join(root,'skills/atlas-code-intelligence/SKILL.md'),'# Code intelligence');
  fs.writeFileSync(path.join(root,'skills/atlas-experience-reuse/SKILL.md'),'# Experience');
  fs.writeFileSync(path.join(root,'agent-memory/lessons.v1.json'), JSON.stringify({version:1,lessons:[
    {id:'boolean-year',status:'verified',keywords:['rejectBooleanYear'],lesson:'Reject boolean input before coercion',evidence:'PR 2579',scope:'stage2'}
  ]}));
  run(root,'add','.');
  run(root,'-c','user.name=ATLAS Test','-c','user.email=test@example.com','commit','-qm','fixture');
  const before=spawnSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).stdout;
  const result=buildContext({root,query:'rejectBooleanYear'});
  assert.equal(result.matching_files,2);
  assert.equal(result.files[0].path,'scripts/sample.mjs');
  assert.deepEqual(result.files[0].relative_imports,['./helper.mjs']);
  assert.ok(result.files[0].symbols.some(x=>x.name==='rejectBooleanYear'));
  assert.equal(result.lessons[0].id,'boolean-year');
  assert.ok(result.skills.includes('skills/atlas-code-intelligence/SKILL.md'));
  assert.equal(spawnSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).stdout,before);
});
test('no match does not invent evidence; invalid queries are rejected',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'atlas-agent-empty-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  run(root,'init','-q');
  fs.writeFileSync(path.join(root,'README.md'),'hello');
  run(root,'add','.');
  run(root,'-c','user.name=ATLAS','-c','user.email=a@b.c','commit','-qm','initial');
  const ctx=buildContext({root,query:'not-present'});
  assert.equal(ctx.matching_files,0);assert.deepEqual(ctx.files,[]);assert.deepEqual(ctx.lessons,[]);
  assert.throws(()=>buildContext({root,query:''}),/QUERY_REQUIRED/);
  assert.throws(()=>buildContext({root,query:'foo\nbar'}),/QUERY_REQUIRED/);
});
