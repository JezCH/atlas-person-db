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

test('Runtime contract forbids public live Authoring joins', () => {
  const contract=JSON.parse(fs.readFileSync(new URL('../contracts/runtime-projection-contract.v1.json',import.meta.url),'utf8'));
  assert.equal(contract.principles.public_runtime_reads_must_use_projection,true);
  assert.equal(contract.snapshot.live_authoring_join_from_runtime_forbidden,true);
  assert.equal(contract.readiness.start_boundary,'known_complete');
  assert.equal(contract.readiness.end_boundary,'known_complete_or_verified_ongoing');
});
