import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const serviceModule = require('../server/atlas-human-authoring-service.js');
const handlerModule = require('../server/atlas-human-authoring-handler.js');

const {
  automaticHumanRequestId,
  withResolvedHumanRequestId,
  createHumanAuthoringService
} = serviceModule;
const {
  createHumanAuthoringHandler,
  batchFailureBody
} = handlerModule;

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

function recordingClient() {
  const calls=[];
  return {
    calls,
    async query(sql,params=[]){
      calls.push({sql:String(sql),params});
      return {rows:[],rowCount:0};
    },
    async end(){}
  };
}

function prepareStub(rawRequest) {
  if (rawRequest.failPrepare) throw new Error('HUMAN_AUTHORING_PERSON_REQUIRED');
  return Object.freeze({
    rawRequest,
    request:Object.freeze({requestId:String(rawRequest.request_id)}),
    hash:`hash:${rawRequest.request_id}`,
    requestIdGenerated:false
  });
}

function countSql(client, exact) {
  return client.calls.filter((call)=>call.sql.trim().toLowerCase()===exact).length;
}

test('Lean Path v6.1 request ids are deterministic and explicit ids remain compatible', () => {
  const manifest={
    schema:'atlas-human-authoring/v1',
    review_status:'approved',
    person:{canonical_name_en:'Example Person'},
    polity:{canonical_name_en:'Example Polity'},
    activity:{relation_type:'rules',period_basis:'reign'},
    sources:[{title:'Example Source'}]
  };
  const first=automaticHumanRequestId(manifest);
  const second=automaticHumanRequestId(JSON.parse(JSON.stringify(manifest)));
  assert.match(first,/^human-v6\.1:[0-9a-f]{40}$/);
  assert.equal(first,second);

  const resolved=withResolvedHumanRequestId(manifest);
  assert.equal(resolved.generated,true);
  assert.equal(resolved.request_id,first);
  assert.equal(resolved.request.request_id,first);

  const explicit=withResolvedHumanRequestId({...manifest,request_id:'reviewed-explicit-id'});
  assert.equal(explicit.generated,false);
  assert.equal(explicit.request_id,'reviewed-explicit-id');
});

test('preflight_batch rolls every probe back and classifies READY, BLOCKED, and later READY independently', async () => {
  const client=recordingClient();
  const service=createHumanAuthoringService({
    client,
    prepare:prepareStub,
    applyPrepared:async(_client,prepared)=>{
      if(prepared.request.requestId==='b') throw new Error('AUTHORING_REQUEST_ID_COLLISION');
      return {
        request_id:prepared.request.requestId,
        replay:false,
        person_id:`person-${prepared.request.requestId}`,
        polity_id:'polity',
        role_id:null,
        relationship_id:`activity-${prepared.request.requestId}`,
        external_references:{namuwiki:null},
        result:{entities:{relation_type:{id:'relation'},period_basis:{id:'period'}}}
      };
    }
  });

  const results=await service.preflightBatch(
    [{request_id:'a'},{request_id:'b'},{request_id:'c'}],
    {transports:[
      {manifest_path:'authoring/requests/a.json'},
      {manifest_path:'authoring/requests/b.json'},
      {manifest_path:'authoring/requests/c.json'}
    ]}
  );

  assert.deepEqual(results.map((row)=>row.status),['READY','BLOCKED','READY']);
  assert.equal(results[1].code,'AUTHORING_REQUEST_ID_COLLISION');
  assert.equal(countSql(client,'begin isolation level serializable'),3);
  assert.equal(countSql(client,'rollback'),3);
  assert.equal(countSql(client,'commit'),0);
});

test('applyBatch keeps successful items when a middle item fails and still attempts later items', async () => {
  const client=recordingClient();
  const seen=[];
  const service=createHumanAuthoringService({
    client,
    prepare:prepareStub,
    applyPrepared:async(_client,prepared)=>{
      seen.push(prepared.request.requestId);
      if(prepared.request.requestId==='b') throw new Error('HUMAN_AUTHORING_ROLE_NAME_AMBIGUOUS');
      return {request_id:prepared.request.requestId};
    }
  });

  await assert.rejects(
    service.applyBatch(
      [{request_id:'a'},{request_id:'b'},{request_id:'c'}],
      {transports:[
        {manifest_path:'authoring/requests/a.json'},
        {manifest_path:'authoring/requests/b.json'},
        {manifest_path:'authoring/requests/c.json'}
      ]}
    ),
    (error)=>{
      assert.equal(error.message,'HUMAN_AUTHORING_ROLE_NAME_AMBIGUOUS');
      assert.deepEqual(error.batchResults.map((row)=>row.request_id),['a','c']);
      assert.deepEqual(error.batchFailures,[{
        index:1,
        code:'HUMAN_AUTHORING_ROLE_NAME_AMBIGUOUS',
        manifest_path:'authoring/requests/b.json'
      }]);
      return true;
    }
  );

  assert.deepEqual(seen,['a','b','c']);
  assert.equal(countSql(client,'begin isolation level serializable'),3);
  assert.equal(countSql(client,'commit'),2);
  assert.equal(countSql(client,'rollback'),1);
});

test('batch failure response preserves committed successes and failure details', () => {
  const auth={method:'github_oidc',batch:{requests:[{},{},{}]}};
  const error=new Error('HUMAN_AUTHORING_ROLE_NAME_AMBIGUOUS');
  error.batchIndex=1;
  error.manifestPath='authoring/requests/b.json';
  error.batchResults=[{request_id:'a',committed:true},{request_id:'c',committed:true}];
  error.batchFailures=[{index:1,code:'HUMAN_AUTHORING_ROLE_NAME_AMBIGUOUS',manifest_path:'authoring/requests/b.json'}];

  const body=batchFailureBody(auth,error,error.message);
  assert.equal(body.code,'HUMAN_AUTHORING_BATCH_PARTIAL_FAILURE');
  assert.equal(body.first_error_code,'HUMAN_AUTHORING_ROLE_NAME_AMBIGUOUS');
  assert.equal(body.partial_commit,true);
  assert.equal(body.succeeded_count,2);
  assert.equal(body.failed_count,1);
  assert.deepEqual(body.results.map((row)=>row.request_id),['a','c']);
  assert.equal(body.failures[0].manifest_path,'authoring/requests/b.json');
});

test('handler exposes preflight_batch counts without committing', async () => {
  const res=responseRecorder();
  const client=recordingClient();
  let called=0;
  const handler=createHumanAuthoringHandler({
    env:env(),
    verifyOidc:async()=>({}),
    clientFactory:async()=>client,
    inspectReadiness:async()=>({ready:true}),
    createService:()=>({
      preflightBatch:async()=>{
        called+=1;
        return [
          {index:0,manifest_path:'authoring/requests/a.json',request_id:'a',status:'READY'},
          {index:1,manifest_path:'authoring/requests/b.json',request_id:'b',status:'ALREADY_PRESENT',person_id:'p',relationship_id:'r'},
          {index:2,manifest_path:'authoring/requests/c.json',request_id:'c',status:'BLOCKED',code:'AUTHORING_REQUEST_ID_COLLISION'}
        ];
      }
    })
  });

  await handler({
    method:'POST',
    headers:{authorization:'Bearer oidc.jwt.token'},
    body:{
      operation:'preflight_batch',
      transport_version:2,
      runtime_sha:RUNTIME_SHA,
      authoring_sha:AUTHORING_SHA,
      manifest_paths:[
        'authoring/requests/a.json',
        'authoring/requests/b.json',
        'authoring/requests/c.json'
      ],
      requests:[{},{},{}]
    }
  },res);

  assert.equal(res.statusCode,200);
  const body=JSON.parse(res.body);
  assert.equal(called,1);
  assert.equal(body.operation,'preflight_batch');
  assert.equal(body.committed,false);
  assert.equal(body.ready_count,1);
  assert.equal(body.already_present_count,1);
  assert.equal(body.blocked_count,1);
});
