import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const human = require('../server/atlas-human-authoring-service.js');
const native = require('../server/atlas-stage2-native-activity-service.js');
const semantic = require('../server/atlas-activity-semantic-key-v2.js');
const migrations = require('../server/atlas-authoring-migrations.js');

const id = n => `${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`;

function request() {
  return {
    schema:'atlas-human-authoring/v1',
    request_id:'test:p13a:unknown-boundary',
    person:{canonical_name_en:'P13A Fixture'},
    polity:{canonical_name_en:'P13A Polity'},
    activity:{
      relation_type:'active_in',
      period_basis:'term',
      role:'Fixture role',
      start_year:1900,
      start_certainty:'exact',
      start_calendar:'gregorian',
      end_year:1901,
      end_certainty:'exact',
      end_calendar:'gregorian',
      chronology_status:'reviewed',
      confidence:'well_established'
    },
    sources:[{title:'Fixture source'}]
  };
}

function payload(raw) {
  const activity=human.normalizeHumanAuthoringRequest(raw).activity;
  return human.activityPayload({
    personId:id(1),polityId:id(2),roleId:id(3),relation:{id:id(4)},periodBasis:{id:id(5)},activity,sources:[]
  });
}

function genericOngoingPayload() {
  return {
    person_id:id(1),
    polity_id:id(2),
    role_id:id(3),
    relation_type_id:id(4),
    period_basis_id:id(5),
    activity_start:1900,
    activity_start_month:null,
    activity_start_day:null,
    activity_start_granularity:'year',
    activity_start_certainty:'exact',
    activity_start_calendar:'gregorian',
    activity_end:null,
    activity_end_month:null,
    activity_end_day:null,
    activity_end_granularity:null,
    activity_end_certainty:null,
    activity_end_calendar:null,
    confidence:'well_established',
    chronology_status:'ongoing',
    ongoing_as_of:'2026-01-01',
    notes:null,
    source_links:[]
  };
}

function nullStart(raw) {
  for (const field of ['start_year','start_month','start_day','start_certainty','start_calendar']) raw.activity[field]=null;
  return raw;
}

function nullEnd(raw) {
  for (const field of ['end_year','end_month','end_day','end_certainty','end_calendar']) raw.activity[field]=null;
  return raw;
}

test('Human Authoring preserves all-null unknown start and known end without fabricating precision', () => {
  const raw=nullStart(request());
  const normalized=human.normalizeHumanAuthoringRequest(raw);
  assert.deepEqual(normalized.activity.start,{year:null,month:null,day:null,granularity:null,certainty:null,calendar:null});
  assert.equal(normalized.activity.end.year,1901);
  const row=native.normalizeStage2NativeActivity(payload(raw));
  assert.equal(row.activity_start,null);
  assert.equal(row.activity_start_granularity,null);
  assert.match(semantic.semanticKey(row),/<UNKNOWN>/);
});

test('Human Authoring preserves known start and all-null unknown closed end', () => {
  const raw=nullEnd(request());
  const normalized=human.normalizeHumanAuthoringRequest(raw);
  assert.deepEqual(normalized.activity.end,{year:null,month:null,day:null,granularity:null,certainty:null,calendar:null});
  const row=native.normalizeStage2NativeActivity(payload(raw));
  assert.equal(row.chronology_status,'reviewed');
  assert.match(semantic.semanticKey(row),/<UNKNOWN>$/);
});

test('Human Authoring rejects partial unresolved tuples', () => {
  const start=nullStart(request());
  start.activity.start_calendar='gregorian';
  assert.throws(()=>human.normalizeHumanAuthoringRequest(start),/START_UNRESOLVED_BOUNDARY_MUST_BE_ALL_NULL/);

  const end=nullEnd(request());
  end.activity.end_certainty='uncertain';
  assert.throws(()=>human.normalizeHumanAuthoringRequest(end),/END_UNRESOLVED_BOUNDARY_MUST_BE_ALL_NULL/);
});

test('historical unknown closed end and generic ongoing end stay semantically distinct', () => {
  const closed=native.normalizeStage2NativeActivity(payload(nullEnd(request())));
  const ongoingRow=native.normalizeStage2NativeActivity(genericOngoingPayload());
  assert.match(semantic.semanticKey(closed),/<UNKNOWN>$/);
  assert.match(semantic.semanticKey(ongoingRow),/<ONGOING>$/);
  assert.notEqual(semantic.semanticKey(closed),semantic.semanticKey(ongoingRow));
});

test('native semantic collision lookup is null-safe and separates ongoing from non-ongoing null ends', async () => {
  let captured=null;
  const client={query:async(sql,params)=>{captured={sql,params};return {rows:[]};}};
  const row=native.normalizeStage2NativeActivity(payload(nullEnd(request())));
  await native.semanticCollisions(client,row);
  assert.match(captured.sql,/activity_start is not distinct from \$6::integer/i);
  assert.match(captured.sql,/activity_start_granularity is not distinct from \$9::text/i);
  assert.match(captured.sql,/activity_start_calendar is not distinct from \$10::text/i);
  assert.match(captured.sql,/\(chronology_status='ongoing'\)=\$16::boolean/i);
  assert.equal(captured.params[15],false);
});

test('P13A migration enables all-null unknown boundaries without weakening ongoing provenance', () => {
  const migrationPath=migrations.AUTHORING_MIGRATION_PATHS.find((item)=>item.endsWith('20260906_p13a_temporal_unknown_boundaries.sql'));
  assert.ok(migrationPath,'P13A migration must be part of authoring bootstrap');
  const sql=fs.readFileSync(migrationPath,'utf8');
  assert.match(sql,/ALTER COLUMN activity_start DROP NOT NULL/i);
  assert.match(sql,/person_politics_v2_start_boundary_shape_check/i);
  assert.match(sql,/person_politics_v2_end_boundary_shape_check/i);
  assert.match(sql,/person_politics_v2_ongoing_end_check/i);
  assert.match(sql,/ongoing_as_of/i);
  assert.match(sql,/person_politics_v2_unknown_semantic_identity_uq/i);
  assert.match(sql,/chronology_status <> 'ongoing'/i);
  assert.match(sql,/NULLS NOT DISTINCT/i);
});
