import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const runtimeRead = require('../server/atlas-runtime-person-read-service.js');
const personSemantics = require('../server/atlas-person-list-semantic-service.js');
const runtimeCompile = require('../server/atlas-runtime-compile-service.js');
const adminInspector = require('../server/atlas-admin-inspector-service.js');

test('UI-6R1 public Person Activity surfaces are Runtime-only after P13 cutover', () => {
  for (const sql of [
    runtimeRead.PERSON_READ_SQL,
    runtimeRead.PERSON_DETAIL_SQL,
    runtimeRead.ACTIVITY_DETAIL_SQL,
    runtimeRead.ACTIVITY_SOURCE_SQL,
    personSemantics.PERSON_LIST_SEMANTIC_SQL
  ]) {
    assert.match(sql, /atlas_v2\.runtime_person_politics_v1/);
    assert.doesNotMatch(sql, /atlas_v2\.person_politics_v2/);
  }
  assert.doesNotMatch(runtimeRead.ACTIVITY_SOURCE_SQL, /atlas_v2\.person_politics_sources/);
  assert.match(runtimeRead.ACTIVITY_SOURCE_SQL, /provenance_snapshot/);
  assert.doesNotMatch(personSemantics.PERSON_LIST_SEMANTIC_SQL, /atlas_v2\.person_politics_sources/);
  assert.match(personSemantics.PERSON_LIST_SEMANTIC_SQL, /provenance_snapshot->'normalized_sources'/);
});

test('UI-6R1 unresolved Relation evidence remains Authoring evidence but is excluded from Runtime readiness', () => {
  const unresolved = {
    id:'16781cf4-9279-5ce0-a7f4-0c491d7af9c5',
    person_id:'52237f0f-0679-5c65-adaa-a36a9c535a6f',
    polity_id:'00000000-0000-4000-8000-000000000101',
    relation_type_id:null,
    role_id:null,
    period_basis_id:'00000000-0000-4000-8000-000000000301',
    activity_start:-1620,
    activity_start_month:null,
    activity_start_day:null,
    activity_start_granularity:'year',
    activity_start_certainty:'uncertain',
    activity_start_calendar:'unspecified_historical',
    activity_end:-1590,
    activity_end_month:null,
    activity_end_day:null,
    activity_end_granularity:'year',
    activity_end_certainty:'uncertain',
    activity_end_calendar:'unspecified_historical',
    confidence:'likely',
    chronology_status:'reviewed',
    legacy_source_key:'legacy:mursili-i',
    source_locator:{source:'legacy'},
    normalized_sources:[],
    content_hash:'example'
  };
  assert.deepEqual(runtimeCompile.classifyReadiness(unresolved), {
    ready:false,
    code:'RELATION_TYPE_UNRESOLVED'
  });

  assert.match(adminInspector.PERSON_INSPECT_SQL, /from atlas_v2\.person_politics_v2 pp/);
  assert.match(adminInspector.PERSON_INSPECT_SQL, /'relation_type_id', pp\.relation_type_id/);
  assert.doesNotMatch(adminInspector.PERSON_INSPECT_SQL, /runtime_person_politics_v1/);
});

test('UI-6R1 Runtime public reads retain required resolved relation and period-basis joins', () => {
  assert.match(runtimeRead.ACTIVITY_DETAIL_SQL, /\njoin atlas_v2\.person_polity_relation_types prt/i);
  assert.match(runtimeRead.ACTIVITY_DETAIL_SQL, /\njoin atlas_v2\.period_bases pb/i);
  assert.match(personSemantics.PERSON_LIST_SEMANTIC_SQL, /\njoin atlas_v2\.person_polity_relation_types prt/i);
  assert.match(personSemantics.PERSON_LIST_SEMANTIC_SQL, /\njoin atlas_v2\.period_bases pb/i);
});
