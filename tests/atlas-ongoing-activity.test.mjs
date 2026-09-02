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
function payload() {
  return human.activityPayload({personId:id(1),polityId:id(2),roleId:id(3),relation:{id:id(4)},periodBasis:{id:id(5)},activity:human.normalizeHumanAuthoringRequest(request()).activity,sources:[]});
}

test('ongoing authoring preserves a null end through native normalization and Person readback', () => {
  const row = native.normalizeStage2NativeActivity(payload());
  assert.equal(row.activity_end,null);
  assert.equal(row.ongoing_as_of,'2025-01-31');
  const end = personRead.normalizeBoundary({...row,ongoing_as_of:row.ongoing_as_of},'activity_end');
  assert.deepEqual(end,{year:null,month:null,day:null,granularity:null,certainty:null,calendar:null,status:'ongoing',as_of:'2025-01-31'});
  const activity = {start:{year:2024},end};
  assert.deepEqual(model.activityInterval(activity),{start_year:2024,end_year:2025,start_ordinal:2023,end_ordinal:2024,partial:false,ongoing:true,display_through:'2025-01-31'});
  assert.equal(activity.end.year,null,'drawing through the verification year must never mutate the factual boundary');
});

test('ongoing semantic identity ignores verification date and remains distinct from a closed interval', () => {
  const row=payload();
  assert.equal(semantic.semanticKey(row),semantic.semanticKey({...row,ongoing_as_of:'2025-02-01'}));
  assert.match(semantic.semanticKey(row),/<ONGOING>$/);
  assert.notEqual(semantic.semanticKey(row),semantic.semanticKey({...row,chronology_status:'reviewed',activity_end:2025,activity_end_granularity:'year',activity_end_calendar:'gregorian',activity_end_certainty:'exact'}));
});

test('null does not silently turn an unknown or omitted closed endpoint into ongoing', () => {
  const raw=request();raw.activity.chronology_status='reviewed';
  assert.throws(()=>human.normalizeHumanAuthoringRequest(raw),/historical year/);
  for(const field of ['end_year','end_month','end_day','end_certainty','end_calendar']) {
    const bad=request();bad.activity[field]=field.includes('certainty')?'exact':field.includes('calendar')?'gregorian':2025;
    assert.throws(()=>human.normalizeHumanAuthoringRequest(bad),/END_MUST_BE_NULL/);
  }
});

test('ongoing verification date is required, real, not future, and not before the start', () => {
  const a=request().activity;
  for(const value of [null,'2025-02-30','9999-01-01','2024-06-02']) {
    assert.throws(()=>ongoing.validateOngoingActivity({...a,ongoing_as_of:value},{human:true,today:'2025-02-01'}),/ONGOING_ACTIVITY/);
  }
  assert.equal(ongoing.validateOngoingActivity(a,{human:true,today:'2025-02-01'}),true);
});

test('unresolved chronology still stays off the drawable timeline', () => {
  assert.equal(model.activityInterval({start:{year:2024},end:{year:null}}).partial,true);
});
