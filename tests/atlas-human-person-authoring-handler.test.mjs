import assert from 'node:assert/strict';
import test from 'node:test';
import handlerModule from '../server/atlas-human-authoring-handler.js';

const { createHumanAuthoringHandler, transportEnvelope } = handlerModule;
const RUNTIME_SHA = 'a'.repeat(40);
const AUTHORING_SHA = 'b'.repeat(40);

function responseRecorder() {
  return { statusCode:0, headers:{}, body:'', setHeader(key,value){this.headers[key.toLowerCase()]=value;}, end(body){this.body=String(body||'');} };
}
function env() {
  return { SUPABASE_DB_URL:'postgresql://example.test/db', ATLAS_MUTATION_TOKEN:'mutation-secret', ATLAS_SESSION_SECRET:'session-secret', VERCEL_ENV:'production', VERCEL_GIT_COMMIT_REF:'main', VERCEL_GIT_COMMIT_SHA:RUNTIME_SHA, VERCEL_GIT_REPO_OWNER:'JezCH', VERCEL_GIT_REPO_SLUG:'atlas-person-db' };
}
function fakeClient() { return { query:async()=>({rows:[],rowCount:0}), end:async()=>{} }; }

test('GitHub transport accepts the governed Person-only request directory', () => {
  const envelope = transportEnvelope({
    transport_version:2,
    runtime_sha:RUNTIME_SHA,
    authoring_sha:AUTHORING_SHA,
    manifest_path:'authoring/person_requests/bilqis.json'
  });
  assert.equal(envelope.runtimeSha, RUNTIME_SHA);
  assert.equal(envelope.authoringSha, AUTHORING_SHA);
});

test('Person-only schema dispatches to Person service without touching Activity authoring service', async () => {
  const res=responseRecorder();
  let personApplied=false;
  let activityApplied=false;
  const handler=createHumanAuthoringHandler({
    env:env(),
    clientFactory:async()=>fakeClient(),
    inspectReadiness:async()=>({ready:true}),
    createService:()=>({apply:async()=>{activityApplied=true;throw new Error('wrong service');}}),
    createPersonService:()=>({apply:async(request,context)=>{
      personApplied=true;
      assert.equal(request.schema,'atlas-human-person-authoring/v1');
      assert.equal(context.transport.kind,'admin_bearer');
      return {marker:'ATLAS_HUMAN_PERSON_AUTHORING_V1',schema:'atlas-human-person-authoring/v1',request_id:'person:1',committed:true,replay:false,person_id:'p',source_ids:['s'],result:{semantic_version:'v1-person-identity-only'}};
    }})
  });
  await handler({method:'POST',headers:{authorization:'Bearer mutation-secret'},body:{schema:'atlas-human-person-authoring/v1'}},res);
  assert.equal(res.statusCode,200);
  assert.equal(JSON.parse(res.body).committed,true);
  assert.equal(personApplied,true);
  assert.equal(activityApplied,false);
});
