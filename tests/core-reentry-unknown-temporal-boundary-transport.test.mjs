import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const human=require('../server/atlas-human-authoring-service.js');
const native=require('../server/atlas-stage2-native-activity-service.js');
const nativeManifest=require('../server/atlas-authoring-manifest-v2-native-service.js');

const UUIDS={
  person:'11111111-1111-4111-8111-111111111111',
  polity:'22222222-2222-4222-8222-222222222222',
  relation:'33333333-3333-4333-8333-333333333333',
  period:'44444444-4444-4444-8444-444444444444'
};

function humanRequest(requestId='reentry09:human') {
  return {
    schema:'atlas-human-authoring/v1',
    review_status:'approved',
    request_id:requestId,
    person:{
      canonical_name_en:'REENTRY 09 Human Fixture',
      display_name_ko:'리엔트리 09 휴먼 픽스처',
      life_status:'deceased',
      life_status_checked_at:'2026-10-02',
      life_status_basis:'historical_certainty'
    },
    external_references:{namuwiki:{
      status:'not_found',
      checked_at:'2026-10-02',
      review_reason:'no_exact_document'
    }},
    polity:{canonical_name_en:'REENTRY 09 Polity',display_name_ko:'리엔트리 09 정치체'},
    activity:{
      relation_type:'active_in',
      period_basis:'term',
      role:null,
      start_year:1900,
      start_month:null,
      start_day:null,
      start_certainty:'exact',
      start_calendar:'gregorian',
      end_year:1901,
      end_month:null,
      end_day:null,
      end_certainty:'exact',
      end_calendar:'gregorian',
      chronology_status:'reviewed',
      confidence:'well_established'
    },
    sources:[{title:'REENTRY 09 source',citation_text:'Reviewed transport fixture.'}]
  };
}

function nativeRequest(requestId='reentry09:native') {
  return {
    schema:'atlas-authoring-manifest/v2',
    review_status:'approved',
    request_id:requestId,
    person:{
      canonical_name_en:'REENTRY 09 Native Fixture',
      display_name_ko:'리엔트리 09 네이티브 픽스처',
      life_status:'deceased',
      life_status_checked_at:'2026-10-02',
      life_status_basis:'historical_certainty'
    },
    activity:{
      polity_binding:{mode:'existing',id:UUIDS.polity},
      role_binding:{mode:'none'},
      relation_type_id:UUIDS.relation,
      period_basis_id:UUIDS.period,
      activity_start:1900,
      activity_start_month:null,
      activity_start_day:null,
      activity_start_granularity:'year',
      activity_start_certainty:'exact',
      activity_start_calendar:'gregorian',
      activity_end:1901,
      activity_end_month:null,
      activity_end_day:null,
      activity_end_granularity:'year',
      activity_end_certainty:'exact',
      activity_end_calendar:'gregorian',
      chronology_status:'reviewed',
      confidence:'well_established',
      source_links:[]
    }
  };
}

function unknownHumanBoundary(raw,prefix) {
  for (const suffix of ['year','month','day','certainty','calendar']) raw.activity[`${prefix}_${suffix}`]=null;
  return raw;
}

function unknownNativeBoundary(raw,prefix) {
  raw.activity[prefix]=null;
  for (const suffix of ['month','day','granularity','certainty','calendar']) raw.activity[`${prefix}_${suffix}`]=null;
  return raw;
}

function runValidator(fixtures) {
  const paths=[];
  try {
    for (let index=0; index<fixtures.length; index+=1) {
      const file=`authoring/requests/__test-reentry09-${process.pid}-${index}.json`;
      fs.writeFileSync(file,JSON.stringify(fixtures[index],null,2)+'\n');
      paths.push(file);
    }
    return spawnSync(process.execPath,['scripts/validate-authoring-request-files.mjs',...paths],{
      cwd:process.cwd(),
      encoding:'utf8'
    });
  } finally {
    for (const file of paths) try { fs.unlinkSync(file); } catch {}
  }
}

test('CORE-REENTRY-09 repository validator transports Human all-null unknown boundaries',()=>{
  const unknownStart=unknownHumanBoundary(humanRequest('reentry09:human:start'),'start');
  const unknownEnd=unknownHumanBoundary(humanRequest('reentry09:human:end'),'end');
  const both=unknownHumanBoundary(unknownHumanBoundary(humanRequest('reentry09:human:both'),'start'),'end');
  const result=runValidator([unknownStart,unknownEnd,both]);
  assert.equal(result.status,0,result.stderr||result.stdout);

  assert.equal(human.normalizeHumanAuthoringRequest(unknownStart).activity.start.year,null);
  assert.equal(human.normalizeHumanAuthoringRequest(unknownEnd).activity.end.year,null);
});

test('CORE-REENTRY-09 repository validator transports native v2 all-null unknown boundaries',()=>{
  const unknownStart=unknownNativeBoundary(nativeRequest('reentry09:native:start'),'activity_start');
  const unknownEnd=unknownNativeBoundary(nativeRequest('reentry09:native:end'),'activity_end');
  const result=runValidator([unknownStart,unknownEnd]);
  assert.equal(result.status,0,result.stderr||result.stdout);

  const parsed=nativeManifest.requireNativeManifest(unknownStart);
  const bound=nativeManifest.bindActivity({
    activity:parsed.activity,
    personId:UUIDS.person,
    polityId:UUIDS.polity,
    roleId:null
  });
  const normalized=native.normalizeStage2NativeActivity(bound);
  assert.equal(normalized.activity_start,null);
  assert.equal(normalized.activity_start_granularity,null);
});

test('CORE-REENTRY-09 partial unresolved tuples fail closed before transport',()=>{
  const humanPartial=unknownHumanBoundary(humanRequest('reentry09:partial:human'),'start');
  humanPartial.activity.start_calendar='gregorian';
  const humanResult=runValidator([humanPartial]);
  assert.notEqual(humanResult.status,0);
  assert.match(humanResult.stderr,/start unresolved boundary must leave all boundary fields null/);

  const nativePartial=unknownNativeBoundary(nativeRequest('reentry09:partial:native'),'activity_end');
  nativePartial.activity.activity_end_certainty='uncertain';
  const nativeResult=runValidator([nativePartial]);
  assert.notEqual(nativeResult.status,0);
  assert.match(nativeResult.stderr,/activity_end unresolved boundary must leave all boundary fields null/);
});

test('CORE-REENTRY-09 unknown closed end and ongoing end remain distinct in repository duplicate screening',()=>{
  const unknown=unknownHumanBoundary(humanRequest('reentry09:semantic:unknown'),'end');
  const ongoing=unknownHumanBoundary(humanRequest('reentry09:semantic:ongoing'),'end');
  ongoing.activity.chronology_status='ongoing';
  ongoing.activity.ongoing_as_of='2026-10-02';
  const result=runValidator([unknown,ongoing]);
  assert.equal(result.status,0,result.stderr||result.stdout);
});

test('CORE-REENTRY-09 Authoring Apply gate and Production read-back encode unknown-boundary transport explicitly',()=>{
  const workflow=fs.readFileSync(new URL('../.github/workflows/atlas-authoring-apply.yml',import.meta.url),'utf8');
  assert.match(workflow,/\.activity\.activity_start == null/);
  assert.match(workflow,/\.activity\.activity_start_granularity == null/);
  assert.match(workflow,/\.activity\.activity_end == null/);
  assert.match(workflow,/\.activity\.start_year == null/);
  assert.match(workflow,/\.activity\.end_year == null/);
  assert.match(workflow,/if \$m\.activity\.start_year == null then/);
  assert.match(workflow,/elif \$m\.activity\.end_year == null then/);
  assert.match(workflow,/\(\.end\.status \/\/ null\)!="ongoing"/);
});
