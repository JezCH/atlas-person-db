import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {analyzeDependencies,relativeSpecifiers,codeMask} from '../scripts/atlas-agent-dependency-map.mjs';
function fixture(t){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'atlas-dependencies-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const put=(p,s)=>{fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});
    fs.writeFileSync(path.join(root,p),s)};
  const run=(...args)=>{const r=spawnSync('git',args,{cwd:root,encoding:'utf8'});
    assert.equal(r.status,0,r.stderr);return r.stdout.trim()};
  run('init','-q');
  put('scripts/a.mjs','export function thing(){}\n');
  put('scripts/b.mjs',"import {thing} from './a.mjs'; thing();\n");
  put('server/c.js',"export {thing} from '../scripts/b.mjs';\n");
  put('tests/c.test.mjs',"import '../server/c.js';\n");
  put('tests/a.test.mjs',"import '../scripts/a.mjs';\n");
  put('scripts/fake.mjs',"// import './a.mjs'\nconst text = \"from './a.mjs'\";\n");
  run('add','.');
  run('-c','user.name=ATLAS Test','-c','user.email=test@example.invalid','commit','-qm','fixture');
  return {root,run};
}
test('identifies direct and transitive module consumers and tests without edits',t=>{
  const {root,run}=fixture(t),before=run('status','--porcelain');
  const r=analyzeDependencies({root,target:'scripts/a.mjs'});
  assert.deepEqual(r.dependencies,[]);
  assert.deepEqual(r.direct_importers,['scripts/b.mjs','tests/a.test.mjs']);
  assert.deepEqual(r.reverse_levels[1].paths,['server/c.js']);
  assert.ok(r.related_tests.some(x=>x.file==='tests/a.test.mjs'));
  assert.equal(r.head_sha.length,40);
  assert.equal(run('status','--porcelain'),before);
});
test('recognizes static imports and ignores comment and string decoys',()=>{
  const s="import './a.js';\nimport {x} from './b.mjs';\nexport {y} from './c.js';\nconst x=require('./d.cjs');\nconst z=import('./e.js');\n// import './bad.js'\n/* require('./bad2.js') */\nconst q=\"from './bad3.js'\";\n";
  assert.deepEqual(relativeSpecifiers(s).sort(),['./a.js','./b.mjs','./c.js','./d.cjs','./e.js'].sort());
  assert.equal(codeMask(s).length,s.length);
});
test('rejects outside paths and excessive traversal depth',t=>{
  const {root}=fixture(t);
  for(const target of ['../escape','/etc/passwd','scripts/missing.mjs'])
    assert.throws(()=>analyzeDependencies({root,target}),/TARGET|NOT_TRACKED/);
  assert.throws(()=>analyzeDependencies({root,target:'scripts/a.mjs',depth:99}),/OPTIONS/);
});
