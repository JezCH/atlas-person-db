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

test('GitHub human-authoring batch records one failure and still applies later manifests', async () => {
  const res=responseRecorder();
  const seen=[];
  const client={query:async()=>({rows:[],rowCount:0}),end:async()=>{}};
  const handler=createHumanAuthoringHandler({
    env:env(),
    verifyOidc:async()=>({}),
    clientFactory:async()=>client,
    inspectReadiness:async()=>({ready:true}),
    createService:()=>({
      apply:async(request,context)=>{
        seen.push({request_id:request.request_id,manifest_path:context.transport.manifest_path});
        if (request.request_id === 'b') throw new Error('DUPLICATE_PERSON');
        return {
          marker:'ATLAS_HUMAN_AUTHORING_V1',
          schema:'atlas-human-authoring/v1',
          request_id:request.request_id,
          committed:true,
          replay:false,
          person_id:`person-${request.request_id}`,
          polity_id:'q',
          role_id:null,
          relationship_id:`activity-${request.request_id}`,
          source_ids:['s'],
          result:{semantic_version:'v2-relation-full-temporal'}
        };
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
  assert.equal(body.code,'HUMAN_AUTHORING_BATCH_PARTIAL_FAILURE');
  assert.equal(body.count,3);
  assert.equal(body.succeeded_count,2);
  assert.equal(body.failed_count,1);
  assert.deepEqual(body.results.map((row)=>row.request_id),['a','c']);
  assert.deepEqual(body.failures,[{
    index:1,
    manifest_path:'authoring/requests/b.json',
    code:'DUPLICATE_PERSON',
    status:409
  }]);
  assert.equal(body.failed_index,1);
  assert.equal(body.manifest_path,'authoring/requests/b.json');
  assert.deepEqual(seen,[
    {request_id:'a',manifest_path:'authoring/requests/a.json'},
    {request_id:'b',manifest_path:'authoring/requests/b.json'},
    {request_id:'c',manifest_path:'authoring/requests/c.json'}
  ]);
});
