// Run from any working directory. ATLAS_REPO_ROOT selects the verified repository checkout.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const path=require('node:path');
for (const file of ['contract-check.cjs','catalog-check.cjs','retry-check.cjs','submit-check.cjs','general-submit-check.cjs']) {
 test(file,()=>{
  const result=spawnSync(process.execPath,[path.join(__dirname,file)],{encoding:'utf8',env:process.env,timeout:10000});
  assert.ifError(result.error);
  assert.equal(result.status,0,result.stdout+result.stderr);
  assert.match(result.stdout,/PASS/);
 });
}
require('./person-only.test.cjs');
