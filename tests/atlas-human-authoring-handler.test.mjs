import assert from 'node:assert/strict';
import test from 'node:test';
import handlerModule from '../server/atlas-human-authoring-handler.js';
const { createHumanAuthoringHandler, transportEnvelope, batchEnvelope } = handlerModule;
const RUNTIME_SHA = 'a'.repeat(40);
const AUTHORING_SHA = 'b'.repeat(40);
function responseRecorder() { return { statusCode:0, headers:{}, body:'', setHeader(key,value){this.headers[key.toLowerCase()]=value;}, end(body){this.body=String(body||'');} }; }
function env() { return { SUPABASE_DB_URL:'postgresql://example.test/db', ATLAS_MUTATION_TOKEN:'mutation-secret', ATLAS_SESSION_SECRET:'session-secret', VERCEL_ENV:'production', VERCEL_GIT_COMMIT_REF:'main', VERCEL_GIT_COMMIT_SHA:RUNTIME_SHA, VERCEL_GIT_REPO_OWNER:'JezCH', VERCEL_GIT_REPO_SLUG:'atlas-person-db' }; }
function fakeClient() { return { query:async()=>({rows:[],rowCount:0}), end:async()=>{} }; }

test('catalog GET uses protected admin authentication and exposes codes, never UUIDs', async () => {
  const res=responseRecorder();
  const handler=createHumanAuthoringHandler({ env:env(), clientFactory:async()=>fakeClient(), inspectReadiness:async()=>({ready:true}), loadCatalogs:async()=>({relation_types:['rules','serves'],period_bases:['reign']}) });
  await handler({method:'GET',headers:{authorization:'Bearer mutation-secret'}},res);
  assert.equal(res.statusCode,200);
  const body=JSON.parse(res.body);
  assert.equal(body.ok,true);
  assert.equal(body.auth_method,'bearer');
  assert.deepEqual(body.catalogs.relation_types,['rules','serves']);
  assert.deepEqual(body.catalogs.period_bases,['reign']);
});

test('direct POST delegates one friendly request to the atomic human authoring service', async () => {
  const res=responseRecorder(); let seen=null;
  const handler=createHumanAuthoringHandler({ env:env(), clientFactory:async()=>fakeClient(), inspectReadiness:async()=>({ready:true}), createService:()=>({apply:async(request,context)=>{seen={request,context};return {marker:'ATLAS_HUMAN_AUTHORING_V1',schema:'atlas-human-authoring/v1',request_id:'admin:1',committed:true,replay:false,person_id:'p',polity_id:'q',role_id:null,relationship_id:'a',source_ids:['s'],result:{}};}}) });
  await handler({method:'POST',headers:{authorization:'Bearer mutation-secret'},body:{schema:'atlas-human-authoring/v1'}},res);
  assert.equal(res.statusCode,200);
  assert.equal(JSON.parse(res.body).committed,true);
  assert.equal(seen.request.schema,'atlas-human-authoring/v1');
  assert.equal(seen.context.transport.kind,'admin_bearer');
});

test('bad Production/P9 readiness blocks writes before the service is invoked', async () => {
  const res=responseRecorder(); let applied=false;
  const handler=createHumanAuthoringHandler({
    env:env(),
    clientFactory:async()=>fakeClient(),
    inspectReadiness:async()=>({ready:false,p9:{old_index_present:true,new_index_present:false,duplicate_groups:0}}),
    createService:()=>({apply:async()=>{applied=true;throw new Error('must not run');}})
  });
  await handler({method:'POST',headers:{authorization:'Bearer mutation-secret'},body:{schema:'atlas-human-authoring/v1'}},res);
  assert.equal(res.statusCode,409);
  assert.equal(JSON.parse(res.body).code,'HUMAN_AUTHORING_PRODUCTION_NOT_READY');
  assert.equal(applied,false);
});

test('GitHub fallback transport remains exact-runtime and exact-authoring SHA bound', async () => {
  const res=responseRecorder(); let expectedSha=null; let transport=null;
  const handler=createHumanAuthoringHandler({ env:env(), verifyOidc:async(_token,options)=>{expectedSha=options.expectedSha;return {};}, clientFactory:async()=>fakeClient(), inspectReadiness:async()=>({ready:true}), createService:()=>({apply:async(_request,context)=>{transport=context.transport;return {marker:'ATLAS_HUMAN_AUTHORING_V1',schema:'atlas-human-authoring/v1',request_id:'github:1',committed:true,replay:false,person_id:'p',polity_id:'q',role_id:null,relationship_id:'a',source_ids:['s'],result:{}};}}) });
  await handler({method:'POST',headers:{authorization:'Bearer oidc.jwt.token'},body:{transport_version:2,runtime_sha:RUNTIME_SHA,authoring_sha:AUTHORING_SHA,manifest_path:'authoring/requests/razia-sultan.json',request:{schema:'atlas-human-authoring/v1'}}},res);
  assert.equal(res.statusCode,200);
  assert.equal(JSON.parse(res.body).auth_method,'github_oidc');
  assert.equal(expectedSha,AUTHORING_SHA);
  assert.equal(transport.runtime_sha,RUNTIME_SHA);
  assert.equal(transport.authoring_sha,AUTHORING_SHA);
});

test('GitHub fallback envelope rejects paths outside reviewed authoring requests', () => {
  assert.throws(()=>transportEnvelope({transport_version:2,runtime_sha:RUNTIME_SHA,authoring_sha:AUTHORING_SHA,manifest_path:'tmp/request.json'}),/MANIFEST_PATH_NOT_ALLOWED/);
});

test('GitHub batch authoring authenticates, connects, and checks readiness once while preserving manifest order', async () => {
  const res=responseRecorder();
  let verifyCount=0;
  let clientFactoryCount=0;
  let readinessCount=0;
  let serviceCount=0;
  let endCount=0;
  const seen=[];
  const client={query:async()=>({rows:[],rowCount:0}),end:async()=>{endCount+=1;}};
  const handler=createHumanAuthoringHandler({
    env:env(),
    verifyOidc:async(_token,options)=>{verifyCount+=1;assert.equal(options.expectedSha,AUTHORING_SHA);return {};},
    clientFactory:async()=>{clientFactoryCount+=1;return client;},
    inspectReadiness:async(seenClient)=>{readinessCount+=1;assert.equal(seenClient,client);return {ready:true};},
    createService:({client:seenClient})=>{
      serviceCount+=1;
      assert.equal(seenClient,client);
      return {
        apply:async(request,context)=>{
          seen.push({request,context});
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
      };
    }
  });
  const body={
    operation:'apply_batch',
    transport_version:2,
    runtime_sha:RUNTIME_SHA,
    authoring_sha:AUTHORING_SHA,
    manifest_paths:['authoring/requests/a.json','authoring/requests/b.json'],
    requests:[
      {schema:'atlas-human-authoring/v1',request_id:'a'},
      {schema:'atlas-human-authoring/v1',request_id:'b'}
    ]
  };
  await handler({method:'POST',headers:{authorization:'Bearer oidc.jwt.token'},body},res);
  assert.equal(res.statusCode,200);
  const response=JSON.parse(res.body);
  assert.equal(response.ok,true);
  assert.equal(response.auth_method,'github_oidc');
  assert.equal(response.marker,'ATLAS_HUMAN_AUTHORING_BATCH_V1');
  assert.equal(response.schema,'atlas-human-authoring-batch/v1');
  assert.equal(response.committed,true);
  assert.equal(response.count,2);
  assert.equal(response.results.length,2);
  assert.equal(verifyCount,1);
  assert.equal(clientFactoryCount,1);
  assert.equal(readinessCount,1);
  assert.equal(serviceCount,1);
  assert.equal(endCount,1);
  assert.deepEqual(seen.map(({request})=>request.request_id),['a','b']);
  assert.deepEqual(seen.map(({context})=>context.transport.manifest_path),['authoring/requests/a.json','authoring/requests/b.json']);
  assert.ok(seen.every(({context})=>context.transport.kind==='github_oidc'));
  assert.ok(seen.every(({context})=>context.transport.runtime_sha===RUNTIME_SHA));
  assert.ok(seen.every(({context})=>context.transport.authoring_sha===AUTHORING_SHA));
});

test('batch envelope rejects unsafe shape before any write', () => {
  assert.throws(()=>batchEnvelope({
    operation:'apply_batch',
    transport_version:2,
    runtime_sha:RUNTIME_SHA,
    authoring_sha:AUTHORING_SHA,
    manifest_paths:['authoring/requests/a.json'],
    requests:[{},{}]
  }),/BATCH_LENGTH_MISMATCH/);
  assert.throws(()=>batchEnvelope({
    operation:'apply_batch',
    transport_version:2,
    runtime_sha:RUNTIME_SHA,
    authoring_sha:AUTHORING_SHA,
    manifest_paths:['tmp/a.json'],
    requests:[{}]
  }),/MANIFEST_PATH_NOT_ALLOWED/);
  assert.throws(()=>batchEnvelope({
    operation:'apply_batch',
    transport_version:2,
    runtime_sha:RUNTIME_SHA,
    authoring_sha:AUTHORING_SHA,
    manifest_paths:Array.from({length:101},(_,i)=>`authoring/requests/p-${i}.json`),
    requests:Array.from({length:101},()=>({}))
  }),/BATCH_SIZE_INVALID/);
});

test('batch operation is GitHub OIDC only', async () => {
  const res=responseRecorder();
  const handler=createHumanAuthoringHandler({env:env(),clientFactory:async()=>fakeClient(),inspectReadiness:async()=>({ready:true})});
  await handler({
    method:'POST',
    headers:{authorization:'Bearer mutation-secret'},
    body:{
      operation:'apply_batch',
      transport_version:2,
      runtime_sha:RUNTIME_SHA,
      authoring_sha:AUTHORING_SHA,
      manifest_paths:['authoring/requests/a.json'],
      requests:[{}]
    }
  },res);
  assert.equal(res.statusCode,401);
  assert.equal(JSON.parse(res.body).code,'HUMAN_AUTHORING_BATCH_GITHUB_OIDC_REQUIRED');
});
