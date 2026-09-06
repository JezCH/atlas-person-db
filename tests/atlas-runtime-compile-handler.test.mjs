import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createRuntimeCompileHandler, OIDC_POLICY, RUNTIME_COMPILE_MARKER } = require('../server/atlas-runtime-compile-handler.js');

function response() {
  return {
    statusCode:0,
    headers:{},
    body:'',
    setHeader(name,value){ this.headers[name]=value; },
    end(value=''){ this.body=String(value); }
  };
}

const env = {
  VERCEL_ENV:'production',
  VERCEL_GIT_COMMIT_REF:'main',
  VERCEL_GIT_REPO_OWNER:'JezCH',
  VERCEL_GIT_REPO_SLUG:'atlas-person-db',
  VERCEL_GIT_COMMIT_SHA:'1111111111111111111111111111111111111111',
  SUPABASE_DB_URL:'postgres://example.invalid/db'
};

test('runtime compile transport uses a dedicated GitHub OIDC workflow policy', () => {
  assert.equal(OIDC_POLICY.audience,'atlas-person-db-runtime-compile');
  assert.equal(OIDC_POLICY.workflowRef,'JezCH/atlas-person-db/.github/workflows/atlas-runtime-compile.yml@refs/heads/main');
  assert.equal(OIDC_POLICY.environment,'production');
  assert.deepEqual([...OIDC_POLICY.allowedEvents].sort(),['workflow_dispatch','workflow_run']);
});

test('runtime compile applies idempotent Runtime migration before deterministic compile', async () => {
  const calls=[];
  const client={ async end(){ calls.push('end'); } };
  const handler=createRuntimeCompileHandler({
    env,
    clientFactory:async()=>client,
    verifyOidc:async(token,{expectedSha,policy})=>{ calls.push(['oidc',token,expectedSha,policy.audience]); },
    applyMigrations:async(received)=>{ assert.equal(received,client); calls.push('migrate'); return {applied:['runtime.sql']}; },
    compileProjection:async(received,{dryRun})=>{ assert.equal(received,client); calls.push(['compile',dryRun]); return {marker:'ATLAS_RUNTIME_PERSON_POLITICS_COMPILE_V1',dry_run:dryRun,committed:!dryRun,input_fingerprint:'a'.repeat(64),output_fingerprint:'b'.repeat(64),input_row_count:3,output_row_count:2,excluded_row_count:1,exclusion_summary:{START_BOUNDARY_UNRESOLVED:1}}; }
  });
  const res=response();
  await handler({method:'POST',headers:{authorization:'Bearer oidc'},body:{runtime_sha:env.VERCEL_GIT_COMMIT_SHA,authoring_sha:'2222222222222222222222222222222222222222',dry_run:false}},res);
  assert.equal(res.statusCode,200);
  const body=JSON.parse(res.body);
  assert.equal(body.ok,true);
  assert.equal(body.marker,RUNTIME_COMPILE_MARKER);
  assert.equal(body.outcome.committed,true);
  assert.deepEqual(calls.map((entry)=>Array.isArray(entry)?entry[0]:entry),['oidc','migrate','compile','end']);
});

test('runtime compile refuses a stale runtime SHA before touching the database', async () => {
  let opened=false;
  const handler=createRuntimeCompileHandler({env,clientFactory:async()=>{ opened=true; return {}; }});
  const res=response();
  await handler({method:'POST',headers:{authorization:'Bearer x'},body:{runtime_sha:'3333333333333333333333333333333333333333',authoring_sha:'2222222222222222222222222222222222222222'}},res);
  assert.equal(res.statusCode,409);
  assert.equal(JSON.parse(res.body).code,'RUNTIME_COMPILE_RUNTIME_SHA_MISMATCH');
  assert.equal(opened,false);
});
