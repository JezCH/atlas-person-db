import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  MANIFEST_V1,
  MANIFEST_V2,
  RESULT_SNAPSHOT_VERSION,
  createAuthoringManifestService,
  requireManifest,
  manifestHash,
  markerForSchema,
  buildHistoricalReplaySnapshot,
  assertSnapshotMatchesLive
} = require('../server/atlas-authoring-manifest-service.js');

test('legacy authoring manifest schemas remain parseable for historical replay', () => {
  const parsed = requireManifest({
    schema: MANIFEST_V1,
    review_status: 'approved',
    request_id: ' person:test:v1 ',
    person: { canonical_name_en: 'Test', display_name_ko: '테스트' },
    activity: { politic_name: 'Test Polity', activity_start: 1, activity_end: 2, period_basis: 'reign' }
  });
  assert.equal(parsed.schema, MANIFEST_V1);
  assert.equal(parsed.requestId, 'person:test:v1');
  assert.equal(parsed.polityIdentity, null);
  assert.equal(parsed.roleIdentity, null);
  assert.equal(markerForSchema(parsed.schema), 'ATLAS_AUTHORING_MANIFEST_V1');
  assert.throws(() => requireManifest({}), /UNSUPPORTED_AUTHORING_MANIFEST_SCHEMA/);
  assert.throws(() => requireManifest({ schema: MANIFEST_V1, request_id: 'x', person: {}, activity: {} }), /AUTHORING_MANIFEST_NOT_APPROVED/);
});

test('legacy v2 declarations remain parseable only for matching historical ledgers', () => {
  const parsed = requireManifest({
    schema: MANIFEST_V2,
    review_status: 'approved',
    request_id: 'person:test:v2',
    person: { canonical_name_en: 'Test', display_name_ko: '테스트' },
    polity_identity: {
      canonical_name_en: 'New Polity',
      display_name_ko: '새 정치체',
      polity_type: 'historical_polity',
      historicity: 'historical'
    },
    role_identity: {
      code: 'new_role',
      category: 'political',
      source_label: 'New Role',
      display_name_ko: '새 역할'
    },
    activity: {
      politic_name: 'New Polity',
      activity_start: 10,
      activity_end: 20,
      role: 'New Role',
      period_basis: 'reign'
    }
  });
  assert.equal(parsed.schema, MANIFEST_V2);
  assert.equal(parsed.polityIdentity.canonical_name_en, 'New Polity');
  assert.equal(parsed.roleIdentity.code, 'new_role');
  assert.equal(markerForSchema(parsed.schema), 'ATLAS_AUTHORING_MANIFEST_V2');
});

test('declared polity and role must still match historical activity references', () => {
  const base = {
    schema: MANIFEST_V2,
    review_status: 'approved',
    request_id: 'person:test:v2',
    person: { canonical_name_en: 'Test', display_name_ko: '테스트' },
    activity: {
      politic_name: 'New Polity',
      activity_start: 10,
      activity_end: 20,
      role: 'New Role',
      period_basis: 'reign'
    }
  };

  assert.throws(() => requireManifest({
    ...base,
    polity_identity: { canonical_name_en: 'Other Polity', display_name_ko: '다른 정치체' }
  }), /AUTHORING_POLITY_ACTIVITY_REFERENCE_MISMATCH/);

  assert.throws(() => requireManifest({
    ...base,
    role_identity: { code: 'other_role', category: 'political', source_label: 'Other Role', display_name_ko: '다른 역할' }
  }), /AUTHORING_ROLE_ACTIVITY_REFERENCE_MISMATCH/);

  assert.throws(() => requireManifest({
    ...base,
    activity: { ...base.activity, role: null },
    role_identity: { code: 'new_role', category: 'political', source_label: 'New Role', display_name_ko: '새 역할' }
  }), /AUTHORING_ROLE_ACTIVITY_REFERENCE_REQUIRED/);
});

test('manifest hash is stable across object key order', () => {
  assert.equal(manifestHash({ b: 2, a: 1 }), manifestHash({ a: 1, b: 2 }));
});

test('legacy service rejects a new manifest before any identity or Activity writer can run', async () => {
  const calls=[];
  const client={
    async query(sql,params=[]){
      const text=String(sql).replace(/\s+/g,' ').trim();
      calls.push({text,params});
      if(text==='begin isolation level serializable') return {rows:[],rowCount:0};
      if(text.includes('pg_advisory_xact_lock')) return {rows:[],rowCount:1};
      if(text.includes('from atlas_v2.authoring_manifest_runs')) return {rows:[],rowCount:0};
      if(text==='rollback') return {rows:[],rowCount:0};
      throw new Error('unexpected SQL: '+text);
    }
  };
  const service=createAuthoringManifestService({client});
  await assert.rejects(
    ()=>service.apply({
      schema:MANIFEST_V2,
      review_status:'approved',
      request_id:'legacy:new-write:blocked',
      person:{canonical_name_en:'Blocked',display_name_ko:'차단'},
      activity:{politic_name:'Blocked Polity',activity_start:1,activity_end:2,period_basis:'reign'}
    }),
    /AUTHORING_LEGACY_MANIFEST_NEW_WRITE_RETIRED_USE_NATIVE_V2/
  );
  assert.ok(calls.some(x=>x.text==='rollback'));
  assert.equal(calls.some(x=>/insert into atlas_v2\.person_politics_v2/i.test(x.text)),false);
});

test('historical ledger rows can still be represented without inventing create/reuse provenance', () => {
  const snapshot = buildHistoricalReplaySnapshot({
    schema: MANIFEST_V1,
    marker: 'ATLAS_AUTHORING_MANIFEST_V1',
    ledger: { person_id: 'person-1' },
    relationship: {
      id: 'activity-1',
      polity_id: 'polity-1',
      role_id: null,
      period_basis_id: 'period-1'
    }
  });
  assert.equal(snapshot.version,RESULT_SNAPSHOT_VERSION);
  assert.equal(snapshot.provenance_complete, false);
  assert.equal(snapshot.entities.person.disposition, 'historical_unknown');
  assert.equal(snapshot.entities.role.disposition, 'not_applicable');
});

test('stored historical snapshots are checked against live normalized bindings on replay', () => {
  const snapshot={
    version:RESULT_SNAPSHOT_VERSION,
    schema:MANIFEST_V2,
    marker:'ATLAS_AUTHORING_MANIFEST_V2',
    provenance_complete:true,
    entities:{
      person:{id:'person-1',disposition:'historical_unknown'},
      polity:{id:'polity-1',disposition:'historical_unknown'},
      role:{id:null,disposition:'not_applicable'},
      period_basis:{id:'period-1',disposition:'historical_unknown'},
      activity:{id:'activity-1',disposition:'historical_unknown'}
    }
  };

  assert.doesNotThrow(() => assertSnapshotMatchesLive({
    snapshot,
    ledger: { person_id: 'person-1', relationship_id: 'activity-1' },
    relationship: {
      id: 'activity-1',
      person_id: 'person-1',
      polity_id: 'polity-1',
      role_id: null,
      period_basis_id: 'period-1'
    }
  }));

  assert.throws(() => assertSnapshotMatchesLive({
    snapshot,
    ledger: { person_id: 'person-1', relationship_id: 'activity-1' },
    relationship: {
      id: 'activity-1',
      person_id: 'person-1',
      polity_id: 'other-polity',
      role_id: null,
      period_basis_id: 'period-1'
    }
  }), /AUTHORING_LEDGER_POLITY_DRIFT/);
});
