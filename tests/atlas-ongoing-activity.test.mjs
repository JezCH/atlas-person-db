import test from 'node:test';
import assert from 'node:assert/strict';
import human from '../server/atlas-human-authoring-service.js';
import native from '../server/atlas-stage2-native-activity-service.js';
import semantic from '../server/atlas-activity-semantic-key-v2.js';
import personRead from '../server/atlas-person-read-service.js';
import model from '../atlas-person-spacetime-model.js';
import ongoing from '../server/atlas-ongoing-activity.js';

const id = n => `${String(n).repeat(8)}-${String(n).repeat(4)}-4${String(n).repeat(3)}-8${String(n).repeat(3)}-${String(n).repeat(12)}`;
function request() {
  return {
    schema:'atlas-human-authoring/v1', request_id:'test:ongoing',
    person:{canonical_name_en:'Fixture person'}, polity:{canonical_name_en:'Fixture polity'},
    activity:{relation_type:'governs',period_basis:'term',role:'President',start_year:2024,start_month:6,start_day:3,start_certainty:'exact',start_calendar:'gregorian',end_year:null,end_certainty:null,end_calendar:null,chronology_status:'ongoing',ongoing_as_of:'2025-01-31',confidence:'well_established'},
    sources:[{title:'Fixture source'}]
  };
}
function genericOngoingPayload() {
  return {
    person_id:id(1),
    polity_id:id(2),
    role_id:id(3),
    relation_type_id:id(4),
    period_basis_id:id(5),
    activity_start:2024,
    activity_start_month:6,
    activity_start_day:3,
    activity_start_granularity:'day',
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
    ongoing_as_of:'2025-01-31',
    notes:null,
    source_links:[]
  };
}
function payload(raw = request()) {
  return human.activityPayload({personId:id(1),polityId:id(2),roleId:id(3),relation:{id:id(4)},periodBasis:{id:id(5)},activity:human.normalizeHumanAuthoringRequest(raw).activity,sources:[]});
}

test('ordinary Human Authoring rejects ongoing registration while generic ongoing normalization and readback remain intact', () => {
  assert.throws(()=>human.normalizeHumanAuthoringRequest(request()),/HUMAN_AUTHORING_ONGOING_ACTIVITY_FORBIDDEN/);

  const row = native.normalizeStage2NativeActivity(genericOngoingPayload());
  assert.equal(row.activity_end,null);
  assert.equal(row.ongoing_as_of,'2025-01-31');
  const end = personRead.normalizeBoundary({...row,ongoing_as_of:row.ongoing_as_of},'activity_end');
  assert.deepEqual(end,{year:null,month:null,day:null,granularity:null,certainty:null,calendar:null,status:'ongoing',as_of:'2025-01-31'});
  const activity = {start:{year:2024},end};
  assert.deepEqual(model.activityInterval(activity),{start_year:2024,end_year:2025,start_ordinal:2023,end_ordinal:2024,partial:false,ongoing:true,display_through:'2025-01-31'});
  assert.equal(activity.end.year,null,'drawing through the verification year must never mutate the factual boundary');
});

test('ongoing semantic identity ignores verification date and remains distinct from unknown and known closed intervals', () => {
  const row=native.normalizeStage2NativeActivity(genericOngoingPayload());
  assert.equal(semantic.semanticKey(row),semantic.semanticKey({...row,ongoing_as_of:'2025-02-01'}));
  assert.match(semantic.semanticKey(row),/<ONGOING>$/);
  assert.notEqual(semantic.semanticKey(row),semantic.semanticKey({...row,chronology_status:'reviewed',activity_end:2025,activity_end_granularity:'year',activity_end_calendar:'gregorian',activity_end_certainty:'exact'}));
  assert.notEqual(semantic.semanticKey(row),semantic.semanticKey({...row,chronology_status:'reviewed'}));
  assert.match(semantic.semanticKey({...row,chronology_status:'reviewed'}),/<UNKNOWN>$/);
});

test('all-null closed endpoint remains historical unknown and never silently becomes ongoing', () => {
  const raw=request();
  raw.activity.chronology_status='reviewed';
  delete raw.activity.ongoing_as_of;
  const normalized=human.normalizeHumanAuthoringRequest(raw);
  assert.deepEqual(normalized.activity.end,{year:null,month:null,day:null,granularity:null,certainty:null,calendar:null});
  const row=native.normalizeStage2NativeActivity(payload(raw));
  assert.equal(row.chronology_status,'reviewed');
  assert.match(semantic.semanticKey(row),/<UNKNOWN>$/);
});

test('generic ongoing verification date is required, real, not future, and not before a known start', () => {
  const a=genericOngoingPayload();
  for(const value of [null,'2025-02-30','9999-01-01','2024-06-02']) {
    assert.throws(()=>ongoing.validateOngoingActivity({...a,ongoing_as_of:value},{today:'2025-02-01'}),/ONGOING_ACTIVITY/);
  }
  assert.equal(ongoing.validateOngoingActivity(a,{today:'2025-02-01'}),true);
});

test('generic ongoing verification remains required when the start boundary is unknown', () => {
  const raw=genericOngoingPayload();
  raw.activity_start=null;
  raw.activity_start_month=null;
  raw.activity_start_day=null;
  raw.activity_start_granularity=null;
  raw.activity_start_certainty=null;
  raw.activity_start_calendar=null;
  assert.equal(ongoing.validateOngoingActivity(raw,{today:'2025-02-01'}),true);
  assert.throws(()=>ongoing.validateOngoingActivity({...raw,ongoing_as_of:null},{today:'2025-02-01'}),/ONGOING_ACTIVITY_AS_OF_REQUIRED/);
  const row=native.normalizeStage2NativeActivity(raw);
  const key=semantic.semanticKey(row);
  assert.match(key,/<UNKNOWN>/);
  assert.match(key,/<ONGOING>$/);
});

test('unresolved chronology still stays off the drawable timeline', () => {
  assert.equal(model.activityInterval({start:{year:2024},end:{year:null}}).partial,true);
  assert.equal(model.activityInterval({start:{year:null},end:{year:2024}}).partial,true);
});
