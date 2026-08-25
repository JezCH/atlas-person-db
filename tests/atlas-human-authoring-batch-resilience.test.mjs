import assert from 'node:assert/strict';
import test from 'node:test';
import handlerModule from '../server/atlas-human-authoring-handler.js';

const { createHumanAuthoringHandler } = handlerModule;
const RUNTIME_SHA = 'a'.repeat(40);
const AUTHORING_SHA = 'b'.repeat(40);

function responseRecorder() {
  return {
    statusCode:0,
    headers:{},
    body:'',
    setHeader(key,value){ this.headers[key.toLowerCase()]=value; },
    end(body){ this.body=String(body||''); }
  };
}

function env() {
  return {
    SUPABASE_DB_URL:'postgresql://example.test/db',
    ATLAS_MUTATION_TOKEN:'mutation-secret',
    ATLAS_SESSION_SECRET:'session-secret',
    VERCEL_ENV:'production',
    VERCEL_GIT_COMMIT_REF:'main',
    VERCEL_GIT_COMMIT_SHA:RUNTIME_SHA,
    VERCEL_GIT_REPO_OWNER:'JezCH',
    VERCEL_GIT_REPO_SLUG:'atlas-person-db'
  };
}

test('GitHub human-authoring batch failure reports atomic rollback without partial-success payloads', async () => {
  const res=responseRecorder();
  let singleApplyCalled=false;
  let seen=null;
  const client={query:async()=>({rows:[],rowCount:0}),end:async()=>{}};
  const handler=createHumanAuthoringHandler({
    env:env(),
    verifyOidc:async()=>({}),
    clientFactory:async()=>client,
    inspectReadiness:async()=>({ready:true}),
    createService:()=>({
      apply:async()=>{
        singleApplyCalled=true;
        throw new Error('batch must not fall back to per-item apply');
      },
      applyBatch:async(requests,context)=>{
        seen={
          request_ids:requests.map((request)=>request.request_id),
          manifest_paths:context.transports.map((transport)=>transport.manifest_path),
          allowLegacyNamuWikiOmission:context.allowLegacyNamuWikiOmission
        };
        const error=new Error('DUPLICATE_PERSON');
        error.batchIndex=1;
        error.manifestPath=context.transports[1].manifest_path;
        throw error;
      }
    })
  });

  await handler({
    method:'POST',
    headers:{authorization:'Bearer oidc.jwt.token'},
    body:{
      operation:'apply_batch',
      transport_version:2,
      runtime_sha:RUNTIME_SHA,
      authoring_sha:AUTHORING_SHA,
      manifest_paths:[
        'authoring/requests/a.json',
        'authoring/requests/b.json',
        'authoring/requests/c.json'
      ],
      requests:[
        {schema:'atlas-human-authoring/v1',request_id:'a'},
        {schema:'atlas-human-authoring/v1',request_id:'b'},
        {schema:'atlas-human-authoring/v1',request_id:'c'}
      ]
    }
  },res);

  assert.equal(res.statusCode,409);
  const body=JSON.parse(res.body);
  assert.equal(body.code,'DUPLICATE_PERSON');
  assert.equal(body.committed,false);
  assert.equal(body.count,3);
  assert.equal(body.failed_index,1);
  assert.equal(body.manifest_path,'authoring/requests/b.json');
  assert.equal(Object.hasOwn(body,'results'),false);
  assert.equal(Object.hasOwn(body,'succeeded_count'),false);
  assert.equal(Object.hasOwn(body,'failed_count'),false);
  assert.equal(Object.hasOwn(body,'failures'),false);
  assert.equal(singleApplyCalled,false);
  assert.deepEqual(seen,{
    request_ids:['a','b','c'],
    manifest_paths:[
      'authoring/requests/a.json',
      'authoring/requests/b.json',
      'authoring/requests/c.json'
    ],
    allowLegacyNamuWikiOmission:true
  });
});
