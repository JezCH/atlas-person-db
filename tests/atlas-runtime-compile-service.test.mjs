import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const runtime = require('../server/atlas-runtime-compile-service.js');

function activity(overrides={}) {
  return {
    id:'11111111-1111-4111-8111-111111111111',
    person_id:'22222222-2222-4222-8222-222222222222',
    polity_id:'33333333-3333-4333-8333-333333333333',
    relation_type_id:'44444444-4444-4444-8444-444444444444',
    role_id:null,
    period_basis_id:'55555555-5555-4555-8555-555555555555',
    activity_start:100,
    activity_start_month:null,
    activity_start_day:null,
    activity_start_granularity:'year',
    activity_start_certainty:'exact',
    activity_start_calendar:'unspecified_historical',
    activity_end:120,
    activity_end_month:null,
    activity_end_day:null,
    activity_end_granularity:'year',
    activity_end_certainty:'approximate',
    activity_end_calendar:'unspecified_historical',
    confidence:'high',
    chronology_status:'reviewed',
    legacy_source_key:null,
    notes:null,
    source_locator:{ section:'reign' },
    content_hash:'content-hash',
    normalized_sources:[{
      source_id:'66666666-6666-4666-8666-666666666666',
      source_key:'source-1',source_type:'book',title:'Source',canonical_url:null,
      citation_text:'Source citation',source_locator_key:'p. 1'
    }],
    ...overrides
  };
}

test('runtime readiness admits known closed Activity with normalized provenance', () => {
  assert.deepEqual(runtime.classifyReadiness(activity()), { ready:true, code:null });
});

test('runtime readiness excludes unresolved temporal and relation boundaries without fabrication', () => {
  assert.equal(runtime.classifyReadiness(activity({ relation_type_id:null })).code,'RELATION_TYPE_UNRESOLVED');
  assert.equal(runtime.classifyReadiness(activity({
    activity_start:null,activity_start_granularity:null,activity_start_certainty:null,activity_start_calendar:null
  })).code,'START_BOUNDARY_UNRESOLVED');
  assert.equal(runtime.classifyReadiness(activity({
    activity_end:null,activity_end_granularity:null,activity_end_certainty:null,activity_end_calendar:null
  })).code,'END_BOUNDARY_UNRESOLVED');
});

test('verified ongoing is runtime-ready but ongoing without as-of is excluded', () => {
  const ongoing=activity({
    chronology_status:'ongoing',activity_end:null,activity_end_granularity:null,
    activity_end_certainty:null,activity_end_calendar:null,source_locator:{ongoing_as_of:'2026-09-06'}
  });
  assert.equal(runtime.classifyReadiness(ongoing).ready,true);
  assert.equal(runtime.classifyReadiness({...ongoing,source_locator:{}}).code,'ONGOING_VERIFICATION_UNRESOLVED');
});

test('legacy import provenance remains acceptable when normalized links are absent', () => {
  const legacy=activity({normalized_sources:[],legacy_source_key:'legacy:123',source_locator:{record:'123'}});
  assert.equal(runtime.classifyReadiness(legacy).ready,true);
  assert.equal(runtime.provenanceSnapshot(legacy).basis,'legacy_import_source_with_locator');
  assert.equal(runtime.classifyReadiness(activity({normalized_sources:[],legacy_source_key:null,source_locator:{}})).code,'PROVENANCE_UNRESOLVED');
});

test('compile output is deterministic, sorted, and records explicit exclusions', () => {
  const second=activity({id:'77777777-7777-4777-8777-777777777777'});
  const unresolved=activity({
    id:'00000000-0000-4000-8000-000000000001',
    activity_start:null,activity_start_granularity:null,activity_start_certainty:null,activity_start_calendar:null
  });
  const a=runtime.compileSnapshot([second,unresolved,activity()]);
  const b=runtime.compileSnapshot([second,unresolved,activity()]);
  assert.equal(a.input_fingerprint,b.input_fingerprint);
  assert.equal(a.output_fingerprint,b.output_fingerprint);
  assert.equal(a.input_row_count,3);
  assert.equal(a.output_row_count,2);
  assert.equal(a.excluded_row_count,1);
  assert.deepEqual(a.exclusion_summary,{START_BOUNDARY_UNRESOLVED:1});
  assert.deepEqual(a.rows.map((row)=>row.id),[
    '11111111-1111-4111-8111-111111111111',
    '77777777-7777-4777-8777-777777777777'
  ]);
});

test('Runtime migration creates sealed snapshot and compile ledger rather than a live view', () => {
  const sql=fs.readFileSync(new URL('../db/migrations/20260906_runtime_person_politics_projection_v1.sql',import.meta.url),'utf8');
  assert.match(sql,/CREATE TABLE IF NOT EXISTS atlas_v2\.runtime_compile_runs/i);
  assert.match(sql,/CREATE TABLE IF NOT EXISTS atlas_v2\.runtime_person_politics_v1/i);
  assert.match(sql,/provenance_snapshot jsonb NOT NULL/i);
  assert.doesNotMatch(sql,/CREATE\s+(?:MATERIALIZED\s+)?VIEW/i);
  assert.match(sql,/compile_key text NOT NULL REFERENCES atlas_v2\.runtime_compile_runs/i);
});

test('Runtime activation migration records repeated committed activations without pretending compile rows are activation history', () => {
  const sql=fs.readFileSync(new URL('../db/migrations/20260920_runtime_projection_activation_history_v1.sql',import.meta.url),'utf8');
  assert.match(sql,/CREATE TABLE IF NOT EXISTS atlas_v2\.runtime_projection_activations/i);
  assert.match(sql,/activation_kind text NOT NULL/i);
  assert.match(sql,/baseline_observed/);
  assert.match(sql,/compile_commit/);
  assert.equal(sql.includes("runtime_sha ~ '^[0-9a-f]{40}$'"),true);
  assert.equal(sql.includes("authoring_sha ~ '^[0-9a-f]{40}$'"),true);
  assert.doesNotMatch(sql,/UNIQUE\s*\([^)]*compile_key/i);
});

test('activation baseline captures only the currently observed Runtime projection and never fabricates deployment SHAs', async () => {
  const calls=[];
  const client={async query(sql,params){
    calls.push({sql,params});
    if (/count\(\*\)::int as activation_count/.test(sql)) return {rows:[{activation_count:0}]};
    if (/count\(distinct compile_key\)::int as compile_count/.test(sql)) {
      return {rows:[{row_count:12,compile_count:1,compile_key:'runtime-person-politics-v1:old'}]};
    }
    if (/activation_kind,runtime_sha,authoring_sha,row_count/.test(sql) && /baseline_observed/.test(sql)) {
      assert.deepEqual(params,[runtime.ACTIVATION_PROJECTION,'runtime-person-politics-v1:old',12]);
      return {rows:[{id:'41',activated_at:'2026-09-20T05:00:00Z'}]};
    }
    throw new Error('unexpected query');
  }};
  const row=await runtime.ensureRuntimeActivationBaseline(client);
  assert.equal(row.activation_kind,'baseline_observed');
  assert.equal(row.compile_key,'runtime-person-politics-v1:old');
  assert.equal(row.row_count,12);
  assert.equal(calls.length,3);
  assert.doesNotMatch(calls[2].sql,/\$4|\$5/);
});

test('committed activation records deployment SHAs and permits the same compile key to be activated repeatedly', async () => {
  let nextId=50;
  const paramsSeen=[];
  const client={async query(sql,params){
    assert.match(sql,/insert into atlas_v2\.runtime_projection_activations/);
    assert.match(sql,/compile_commit/);
    paramsSeen.push(params);
    nextId+=1;
    return {rows:[{id:String(nextId),activated_at:'2026-09-20T05:10:00Z'}]};
  }};
  const args={
    compileKey:'runtime-person-politics-v1:same',
    rowCount:9,
    runtimeSha:'A'.repeat(40),
    authoringSha:'B'.repeat(40)
  };
  const first=await runtime.recordRuntimeActivation(client,args);
  const second=await runtime.recordRuntimeActivation(client,args);
  assert.equal(first.compile_key,second.compile_key);
  assert.notEqual(first.id,second.id);
  assert.equal(first.runtime_sha,'a'.repeat(40));
  assert.equal(first.authoring_sha,'b'.repeat(40));
  assert.equal(paramsSeen.length,2);
  assert.deepEqual(paramsSeen[0],paramsSeen[1]);
});

test('dry-run compile rolls back and does not write activation history', async () => {
  const source=[activity()];
  const compiled=runtime.compileSnapshot(source);
  const queries=[];
  const client={async query(sql,params){
    queries.push({sql,params});
    if (/begin isolation level serializable/i.test(sql)) return {};
    if (/pg_advisory_xact_lock/.test(sql)) return {};
    if (sql === runtime.AUTHORING_SNAPSHOT_SQL) return {rows:source};
    if (/insert into atlas_v2\.runtime_compile_runs/.test(sql)) return {rowCount:1,rows:[]};
    if (/delete from atlas_v2\.runtime_person_politics_v1/.test(sql)) return {};
    if (/insert into atlas_v2\.runtime_person_politics_v1/.test(sql)) return {};
    if (/count\(distinct compile_key\)::int as compile_count/.test(sql)) {
      return {rows:[{row_count:1,compile_count:1,compile_key:compiled.compile_key}]};
    }
    if (/^rollback$/i.test(sql.trim())) return {};
    throw new Error('unexpected query: '+sql);
  }};
  const out=await runtime.compileRuntimeProjection(client,{
    dryRun:true,
    runtimeSha:'1'.repeat(40),
    authoringSha:'2'.repeat(40)
  });
  assert.equal(out.dry_run,true);
  assert.equal(out.committed,false);
  assert.equal(out.activation,null);
  assert.equal(out.activation_baseline_recorded,false);
  assert.equal(queries.some(({sql})=>/runtime_projection_activations/.test(sql)),false);
  assert.equal(queries.some(({sql})=>/^rollback$/i.test(sql.trim())),true);
  assert.equal(queries.some(({sql})=>/^commit$/i.test(sql.trim())),false);
});

test('committed compile captures pre-existing Runtime baseline once and writes a compile_commit activation in the same transaction', async () => {
  const source=[activity()];
  const compiled=runtime.compileSnapshot(source);
  const queries=[];
  const client={async query(sql,params){
    queries.push({sql,params});
    if (/begin isolation level serializable/i.test(sql)) return {};
    if (/pg_advisory_xact_lock/.test(sql)) return {};
    if (/count\(\*\)::int as activation_count/.test(sql)) return {rows:[{activation_count:0}]};
    if (/from atlas_v2\.runtime_person_politics_v1/.test(sql) && /count\(distinct compile_key\)::int as compile_count/.test(sql) && !/min\(compile_key\) as compile_key/.test(sql)) {
      return {rows:[{row_count:3,compile_count:1,compile_key:'runtime-person-politics-v1:previous'}]};
    }
    if (/insert into atlas_v2\.runtime_projection_activations/.test(sql) && /baseline_observed/.test(sql)) {
      return {rows:[{id:'70',activated_at:'2026-09-20T05:00:00Z'}]};
    }
    if (sql === runtime.AUTHORING_SNAPSHOT_SQL) return {rows:source};
    if (/insert into atlas_v2\.runtime_compile_runs/.test(sql)) return {rowCount:1,rows:[]};
    if (/delete from atlas_v2\.runtime_person_politics_v1/.test(sql)) return {};
    if (/insert into atlas_v2\.runtime_person_politics_v1/.test(sql)) return {};
    if (/min\(compile_key\) as compile_key/.test(sql)) {
      return {rows:[{row_count:1,compile_count:1,compile_key:compiled.compile_key}]};
    }
    if (/insert into atlas_v2\.runtime_projection_activations/.test(sql) && /compile_commit/.test(sql)) {
      assert.deepEqual(params,[runtime.ACTIVATION_PROJECTION,compiled.compile_key,'3'.repeat(40),'4'.repeat(40),1]);
      return {rows:[{id:'71',activated_at:'2026-09-20T05:20:00Z'}]};
    }
    if (/^commit$/i.test(sql.trim())) return {};
    throw new Error('unexpected query: '+sql);
  }};
  const out=await runtime.compileRuntimeProjection(client,{
    dryRun:false,
    runtimeSha:'3'.repeat(40),
    authoringSha:'4'.repeat(40)
  });
  assert.equal(out.committed,true);
  assert.equal(out.activation_baseline_recorded,true);
  assert.equal(out.activation.activation_kind,'compile_commit');
  assert.equal(out.activation.id,'71');
  assert.equal(queries.filter(({sql})=>/insert into atlas_v2\.runtime_projection_activations/.test(sql)).length,2);
  assert.equal(queries.some(({sql})=>/^commit$/i.test(sql.trim())),true);
});

test('Runtime contract forbids public live Authoring joins', () => {
  const contract=JSON.parse(fs.readFileSync(new URL('../contracts/runtime-projection-contract.v1.json',import.meta.url),'utf8'));
  assert.equal(contract.principles.public_runtime_reads_must_use_projection,true);
  assert.equal(contract.snapshot.live_authoring_join_from_runtime_forbidden,true);
  assert.equal(contract.readiness.start_boundary,'known_complete');
  assert.equal(contract.readiness.end_boundary,'known_complete_or_verified_ongoing');
});
