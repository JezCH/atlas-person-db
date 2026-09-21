import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const readApi=require('../api/atlas-read.js');
const publicationService=require('../server/atlas-runtime-publication-read-service.js');
const publicationHandler=require('../server/atlas-runtime-publication-read-handler.js');

test('atlas-read preserves runtime publication compatibility exports through the extracted modules', () => {
  assert.equal(readApi.RUNTIME_PUBLICATION_SCHEMA,publicationService.RUNTIME_PUBLICATION_SCHEMA);
  assert.equal(readApi.RUNTIME_ACTIVATION_PROJECTION,publicationService.RUNTIME_ACTIVATION_PROJECTION);
  assert.equal(readApi.normalizeActivationCompile,publicationService.normalizeActivationCompile);
  assert.equal(readApi.normalizeActivationRecord,publicationService.normalizeActivationRecord);
  assert.equal(readApi.exclusionDelta,publicationService.exclusionDelta);
  assert.equal(readApi.readRuntimeActivationHistory,publicationService.readRuntimeActivationHistory);
  assert.equal(readApi.readRuntimePublication,publicationService.readRuntimePublication);
  assert.equal(readApi.createRuntimePublicationReadHandler,publicationHandler.createRuntimePublicationReadHandler);
});


function activationRow({
  id='2',
  activationKind='compile_commit',
  compileKey='runtime-person-politics-v1:current',
  runtimeSha='1'.repeat(40),
  authoringSha='2'.repeat(40),
  rowCount=90,
  activatedAt='2026-09-20T06:00:00Z',
  input=100,
  output=90,
  excluded=10,
  exclusionSummary={PROVENANCE_UNRESOLVED:6,END_BOUNDARY_UNRESOLVED:4},
  compiledAt='2026-09-20T05:59:00Z'
}={}) {
  return {
    id,
    activation_kind:activationKind,
    compile_key:compileKey,
    runtime_sha:runtimeSha,
    authoring_sha:authoringSha,
    row_count:rowCount,
    activated_at:activatedAt,
    compiler_version:'runtime-person-politics-v1',
    input_row_count:input,
    output_row_count:output,
    excluded_row_count:excluded,
    exclusion_summary:exclusionSummary,
    compiled_at:compiledAt
  };
}

test('activation history is explicitly unavailable before its migration is applied', async () => {
  let calls=0;
  const client={async query(sql){
    calls+=1;
    assert.match(sql,/to_regclass\('atlas_v2\.runtime_projection_activations'\)/);
    return {rows:[{activation_history:false}]};
  }};
  const history=await readApi.readRuntimeActivationHistory(client,{
    currentCompileKey:'runtime-person-politics-v1:current',
    runtimeActivityCount:90
  });
  assert.equal(history.available,false);
  assert.equal(history.reason,'RUNTIME_ACTIVATION_LEDGER_NOT_APPLIED');
  assert.equal(history.latest_recorded,null);
  assert.equal(history.previous_recorded,null);
  assert.equal(history.delta_from_previous,null);
  assert.equal(calls,1);
});

test('activation history preserves empty history as unknown instead of inventing a previous Production', async () => {
  let calls=0;
  const client={async query(sql,params){
    calls+=1;
    if (/to_regclass/.test(sql)) return {rows:[{activation_history:true}]};
    assert.match(sql,/order by a\.id desc/i);
    assert.match(sql,/limit 2/i);
    assert.deepEqual(params,[readApi.RUNTIME_ACTIVATION_PROJECTION]);
    return {rows:[]};
  }};
  const history=await readApi.readRuntimeActivationHistory(client,{
    currentCompileKey:'runtime-person-politics-v1:current',
    runtimeActivityCount:90
  });
  assert.equal(history.available,false);
  assert.equal(history.reason,'RUNTIME_ACTIVATION_HISTORY_EMPTY');
  assert.equal(history.latest_matches_projection,null);
  assert.equal(calls,2);
});

test('activation history compares latest and previous recorded Runtime activations with exact compile ledgers', async () => {
  const latest=activationRow();
  const previous=activationRow({
    id:'1',
    activationKind:'baseline_observed',
    compileKey:'runtime-person-politics-v1:previous',
    runtimeSha:null,
    authoringSha:null,
    rowCount:84,
    activatedAt:'2026-09-20T05:50:00Z',
    input:96,
    output:84,
    excluded:12,
    exclusionSummary:{PROVENANCE_UNRESOLVED:5,START_BOUNDARY_UNRESOLVED:7},
    compiledAt:'2026-09-20T05:40:00Z'
  });
  const client={async query(sql,params){
    if (/to_regclass/.test(sql)) return {rows:[{activation_history:true}]};
    assert.match(sql,/join atlas_v2\.runtime_compile_runs c on c\.compile_key=a\.compile_key/i);
    assert.match(sql,/order by a\.id desc/i);
    assert.deepEqual(params,[readApi.RUNTIME_ACTIVATION_PROJECTION]);
    return {rows:[latest,previous]};
  }};

  const history=await readApi.readRuntimeActivationHistory(client,{
    currentCompileKey:latest.compile_key,
    runtimeActivityCount:90
  });
  assert.equal(history.available,true);
  assert.equal(history.latest_recorded.activation_kind,'compile_commit');
  assert.equal(history.previous_recorded.activation_kind,'baseline_observed');
  assert.equal(history.latest_recorded.runtime_sha,'1'.repeat(40));
  assert.equal(history.previous_recorded.runtime_sha,null);
  assert.equal(history.latest_matches_projection,true);
  assert.deepEqual(history.delta_from_previous,{
    runtime_activity_count:6,
    excluded_activity_count:-2,
    compile_key_changed:true,
    exclusion_summary:{
      END_BOUNDARY_UNRESOLVED:4,
      PROVENANCE_UNRESOLVED:1,
      START_BOUNDARY_UNRESOLVED:-7
    }
  });
});

test('re-activating the same compile remains a separate activation event with zero content delta', async () => {
  const latest=activationRow({id:'8',compileKey:'runtime-person-politics-v1:same'});
  const previous=activationRow({id:'7',compileKey:'runtime-person-politics-v1:same',activatedAt:'2026-09-20T05:00:00Z'});
  const client={async query(sql){
    if (/to_regclass/.test(sql)) return {rows:[{activation_history:true}]};
    return {rows:[latest,previous]};
  }};
  const history=await readApi.readRuntimeActivationHistory(client,{
    currentCompileKey:'runtime-person-politics-v1:same',
    runtimeActivityCount:90
  });
  assert.equal(history.latest_recorded.id,'8');
  assert.equal(history.previous_recorded.id,'7');
  assert.equal(history.delta_from_previous.runtime_activity_count,0);
  assert.equal(history.delta_from_previous.excluded_activity_count,0);
  assert.equal(history.delta_from_previous.compile_key_changed,false);
  assert.deepEqual(history.delta_from_previous.exclusion_summary,{
    END_BOUNDARY_UNRESOLVED:0,
    PROVENANCE_UNRESOLVED:0
  });
});

test('latest activation drift is surfaced instead of making the read fail', async () => {
  const client={async query(sql){
    if (/to_regclass/.test(sql)) return {rows:[{activation_history:true}]};
    return {rows:[activationRow({compileKey:'runtime-person-politics-v1:recorded',rowCount:90})]};
  }};
  const history=await readApi.readRuntimeActivationHistory(client,{
    currentCompileKey:'runtime-person-politics-v1:live',
    runtimeActivityCount:90
  });
  assert.equal(history.available,true);
  assert.equal(history.latest_matches_projection,false);
  assert.equal(history.delta_from_previous,null);
});

test('runtime publication additive contract includes activation history without changing schema version', async () => {
  const currentKey='runtime-person-politics-v1:current';
  let step=0;
  const client={async query(sql,params){
    step+=1;
    if (step===1) {
      assert.match(sql,/person_politics_v2/);
      return {rows:[{
        authoring_activity_count:103,
        runtime_activity_count:90,
        runtime_compile_key_count:1,
        current_compile_key:currentKey
      }]};
    }
    if (step===2) {
      assert.match(sql,/runtime_compile_runs/);
      assert.deepEqual(params,[currentKey]);
      return {rows:[{
        compiler_version:'runtime-person-politics-v1',
        input_row_count:100,
        output_row_count:90,
        excluded_row_count:10,
        exclusion_summary:{PROVENANCE_UNRESOLVED:10},
        compiled_at:'2026-09-20T05:59:00Z'
      }]};
    }
    if (step===3) {
      assert.match(sql,/to_regclass/);
      return {rows:[{activation_history:true}]};
    }
    assert.equal(step,4);
    return {rows:[activationRow({
      compileKey:currentKey,
      input:100,
      output:90,
      excluded:10,
      exclusionSummary:{PROVENANCE_UNRESOLVED:10}
    })]};
  }};

  const publication=await readApi.readRuntimePublication(client);
  assert.equal(publication.schema,'atlas-runtime-publication/v1');
  assert.equal(publication.source,'runtime-publication-ledgers');
  assert.equal(publication.current_authoring_activity_count,103);
  assert.equal(publication.current_runtime_activity_count,90);
  assert.equal(publication.projection_matches_active_compile,true);
  assert.equal(publication.activation_history.available,true);
  assert.equal(publication.activation_history.latest_recorded.compile_key,currentKey);
  assert.equal(publication.activation_history.latest_matches_projection,true);
  assert.equal(step,4);
});


function publicationResponse() {
  return {
    statusCode:0,
    headers:{},
    body:"",
    setHeader(name,value) { this.headers[String(name).toLowerCase()]=value; },
    end(value="") { this.body=String(value); }
  };
}

test('extracted runtime publication handler rejects non-GET before DB access', async () => {
  let factoryCalls=0;
  const handler=publicationHandler.createRuntimePublicationReadHandler({
    env:{ SUPABASE_DB_URL:'postgresql://example.invalid/atlas' },
    clientFactory:async () => {
      factoryCalls+=1;
      throw new Error('must not open database');
    }
  });
  const res=publicationResponse();
  await handler({ method:'POST' },res);
  assert.equal(res.statusCode,405);
  assert.equal(JSON.parse(res.body).schema,'atlas-runtime-publication/v1');
  assert.equal(JSON.parse(res.body).code,'METHOD_NOT_ALLOWED');
  assert.equal(factoryCalls,0);
});

test('extracted runtime publication handler preserves response contract and closes its client', async () => {
  let ended=false;
  const payload=Object.freeze({
    schema:'atlas-runtime-publication/v1',
    source:'runtime-publication-ledgers',
    current_authoring_activity_count:103,
    current_runtime_activity_count:90,
    active_compile:null,
    authoring_delta_since_compile:null,
    projection_matches_active_compile:null,
    activation_history:Object.freeze({ available:false, reason:'RUNTIME_ACTIVATION_HISTORY_EMPTY' })
  });
  const handler=publicationHandler.createRuntimePublicationReadHandler({
    env:{ SUPABASE_DB_URL:'postgresql://example.invalid/atlas' },
    clientFactory:async (databaseUrl) => {
      assert.equal(databaseUrl,'postgresql://example.invalid/atlas');
      return { async end() { ended=true; } };
    },
    read:async () => payload
  });
  const res=publicationResponse();
  await handler({ method:'GET' },res);
  const body=JSON.parse(res.body);
  assert.equal(res.statusCode,200);
  assert.equal(res.headers['cache-control'],'no-store');
  assert.equal(body.ok,true);
  assert.equal(body.schema,'atlas-runtime-publication/v1');
  assert.equal(body.current_runtime_activity_count,90);
  assert.equal(ended,true);
});
