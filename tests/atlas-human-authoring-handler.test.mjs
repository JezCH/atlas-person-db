import assert from 'node:assert/strict';
import test from 'node:test';
import handlerModule from '../server/atlas-human-authoring-handler.js';
const { createHumanAuthoringHandler, transportEnvelope } = handlerModule;
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
